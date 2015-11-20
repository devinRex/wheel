/**
 * Created by denglei on 15/11/19.
 */
var loadderDir = (function () {
    function dirname(path) {
        return path.match(/[^?#]*\//)[0];
    }
    //dom操作太慢
    //try{
    //    a.b.c();
    //} catch (e) {
    //    if (e.fileName) {
    //        console.log(e.fileName);
    //        return e.fileName;
    //    } else if (e.sourceURL) {
    //        return e.sourceURL;
    //    }
    //}
    var scripts = document.getElementsByTagName("script");

    //浏览器是遇到一个script标记执行一个，
    // 当seajs.js正在执行的时候，
    // document.scripts获取到的最后一个script就是当前正在执行的script。
    // 所以我们可以通过scripts[scripts.length - 1]拿到引用seajs.js的那个script节点引用。
    var ownScript = scripts[scripts.length - 1];

    //获取绝对地址的兼容写法
    //要获取一个 script节点的src绝对地址。
    // 除ie67外，ownScript.src返回的都是绝对地址，
    // 但是ie67src是什么就返回什么，这边就是’seajs.js’而不是绝对地址。
    // 幸好ie下支持getAttribute("src", 4)的方式获取绝对地址。
    // ie67下没有 hasAttribute属性，所以就有了获取绝对地址的兼容写法。
    var src = ownScript.hasAttribute ? ownScript.src :ownScript.getAttribute("src", 4)

    return dirname(src);
})();
console.log(loadderDir);
var head = document.getElementsByTagName("head")[0];
var baseElement = head.getElementsByTagName("base")[0];
;function request(url, callback) {
    var node = document.createElement("script");
    var supportOnload = "onload" in node;
    if (supportOnload) {
       node.onload = function () {
           callback();
       }
    } else {
        node.onreadystatechange = function () {
            if(/loaded|complete/.test(node.readyState)) {
                callback();
            }
        }
    }
    node.async = true;
    node.src = url;
    //ie6下如果有base的script节点会报错，
    //所以有baseElement的时候不能用`head.appendChild(node)`,而是应该插入到base之前
    baseElement ? head.insertBefore(node, baseElement) : head.appendChild(node);
}

/*模块类定义*/
function Module(uri, deps) {
    //当前模块的地址
    this.uri = uri;
    //当前模块依赖的模块
    this.dependencies = deps || [];
    //定义模块时define的参数
    this.factor = null;
    //当前模块的状态
    this.status = 0;

    //哪些模块依赖我
    this._waitings  = {};
    //我依赖的模块还有多少没加载好
    this._remain = 0;
}

var STATUS = Module.STATUS = {
    // 1 - 对应的js文件正在加载
    FETCHING: 1,
    // 2 - js加载完毕，并且已经分析了js文件得到了一些相关信息，存储了起来
    SAVED: 2,
    // 3 - 依赖的模块正在加载
    LOADING: 3,
    // 4 - 依赖的模块也都加载好了，处于可执行状态
    LOADED: 4,
    // 5 - 正在执行这个模块
    EXECUTING: 5,
    // 6 - 这个模块执行完成
    EXECUTED: 6
};
cachedMods = {};
Module.prototype.fetch = function () {};
Module.prototype.load = function () {};
Module.prototype.onload = function () {};
//执行当前模块的factory
Module.prototype.exec = function () {};
Module.prototype.reslove = function () {
    var mod = this;
    var ids = mod.dependencies;
    var uris = [];
    for(var i = 0, len = ids.length; i < len; i++) {
        uris[i] = id2Url(ids[i]);
    }
    return uris;
};

//实例生成方法，所有的模块都是单例的，get用来获得一个单例。
Module.get = function (uri, deps) {
    return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps));
};

function id2Url(id) {
    return loadderDir + id + ".js";
}

var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
var SLASH_RE = /\\\\/g;

function parseDependencies(code) {
    var ret = [];
    code.replace(SLASH_RE, "")
        .replace(REQUIRE_RE, function (m, m1, m2) {
            if (m2) {
               ret.push(m2);
            }
        });
    return ret;
}
var anonymousMeta;
//暂只支持define(factory)
function define(factory) {
    //使用正则分析获取到对应的依赖模块
    deps = parseDependencies(factory.toString());
    var meta = {
        deps: deps,
        factory: factory
    };
    //存到一个全局变量，等后面fetch在script的onload回调里获取。
    anonymousMeta = meta;
}

Module.prototype.fetch = function () {
    var mod = this;
    var uri = mod.uri;
    mod.status = STATUS.FETCHING;
    request(uri, onRequest);

    //保存模块信息
    function saveModule(uri, anonymousMeta) {
        var mod = Module.get(uri);
        //保存meta的信息
        if(mod.status < STATUS.SAVED) {
            mod.id= anonymousMeta.id || uri;
            mod.dependencies = anonymousMeta.deps || [];
            mod.factory = anonymousMeta.factory;
            mod.status = STATUS.SAVED;
        }
    }
    function onRequest() {
        if(anonymousMeta) {
            saveModule(uri, anonymousMeta);
            anonymousMeta = null;
        }
        //调用加载函数
        mod.load();
    }
};

Module.prototype.load = function () {
    var mod = this;
    //已经加载过了，就等待onload
    if(mod.status >= STATUS.LOADING) {
        return;
    }
    mod.status = STATUS.LOADING;

    //拿到解析后的依赖模块的列表
    var uris = mod.reslove();

    var len = mod._remain = uris.length;
    var m;

    for(var i = 0; i < len; i++) {
        //拿到依赖的模块对应的实例
        m = Module.get(uris[i]);
        if(m.status < STATUS.LOADED) {
            //把我注入到依赖的模块里的_waitings,
            // 这边可能依赖多次，
            // 也就是在define里面多次调用require加载了同一个模块。所以要递增
            m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1;
        } else {
            mod._remain--;
        }

        if(mod._remain === 0) {
            mod.onload();
            return;
        }

        //检查依赖的模块，如果有还没加载的就调用他们的fetch让他们开始加载
        for (i = 0; i < len; i++) {
            m = cachedMods[uris[i]];

            if (m.status < STATUS.FETCHING) {
                m.fetch();
            }
            else if (m.status === STATUS.SAVED) {
                m.load();
            }
        }
    }

};

Module.prototype.onload = function () {
    var mod = this;
    mod.status = STATUS.LOADED;
    if(mod.callback) {
        mod.callback();
    }
    var waitings = mod._waitings;
    var uri, m;
    for(uri in waitings) {
        if(waitings.hasOwnProperty(uri)) {
            m = cachedMods[uri];
            m._remain -= waitings[uri];
            if(m._remain === 0) {
                m.onload();
            }
        }
    }
};

Module.prototype.exec = function () {
    var mod = this;
    if(mod.status >= STATUS.EXECUTING) {
        return mod.exports;
    }
    mod.status = STATUS.EXECUTING;
    var uri = mod.uri;

    //这是会传递给factory的参数，
    // factory执行的时候，
    // 所有的模块已经都加在好处于可用的状态了，
    // 但是还没有执行对应的factory。
    // 这就是cmd里面说的用时定义，只有第一次require的时候才会去获取并执行
    function require(id) {
        return Module.get(id2Url(id)).exec();
    }

    function isFunction(obj) {
        return ({}).toString.call(obj) === "[object Function]";
    }

    var factory = mod.factory;
    //如果factory是函数，直接执行获取到返回值。
    // 否则赋值，主要是为了兼容define({数据})这种写法，可以用来发jsonp请求等等。
    var exports = isFunction(factory) ?
        factory(require, mod.exports = {}, mod) :
        factory;
    if(exports === undefined) {
        exports = mod.exports;
    }

    mod.exports = exports;
    mod.status = STATUS.EXECUTED;

    return exports;
};
var rexjs = {};
rexjs.use = function (ids, callback) {
    var mod = Module.get('_use_special_id', ids);
    mod.callback = function () {
        var exports = [];
        var uris = mod.reslove();

        for(var i = 0, len = uris.length; i < len; i++) {
            //执行依赖的模块
            exports[i] = cachedMods[uris[i]].exec();
        }
        if(callback) {
            callback.apply(global, exports);
        }
    };
    mod.load();
};




