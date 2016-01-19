/**
 * Created by denglei on 16/1/19.
 */
jQuery.Callbacks = function (options) {
    options = typeof options === "string" ?
        (optionsCache[options] || createOptions(options)) :
        jQuery.extend({}, options);
    var //last fire value
        memory,
        //list是否fire完了
        fired,
        //list是否正在fire
        firing,
        firingStart,
        firingLength,
        //正在fire的回调的索引
        firingIndex,
        list = [],
        stack = !options.once && [],
        fire = function (data) {
            memory = options.memory && data;
            fired = true;
            firingIndex = firingStart || 0;
            firingStart = 0;
            firingLength = list.length;
            firing = true;
            for(; list && firingIndex < firingLength; firingIndex++) {
                if(list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
                    memory = false;
                    break;
                }
            }
            firing = false;
            if(list) {
                if(stack) {
                    if(stack.length) {
                        fire(stack.shift());
                    } else if(memory) {
                        list = [];
                    } else {
                        self.disable();
                    }
                }
            }
        },
        //真正的Callbacks对象
        self = {
            add: function () {
                if(list) {
                    var start = list.length;
                    (function add(args) {

                    })(arguments);
                }
                return this;
            }
        }
};