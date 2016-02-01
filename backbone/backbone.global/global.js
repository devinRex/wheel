/**
 * Created by denglei on 16/1/28.
 */
(function(factory) {
    var root = (typeof self == 'object' && self.self === self && self) ||
        (typeof global == 'object' && global.global === global && global);

    if(typeof define === "function" && define.amd) {
        define(['underscore','jquery','exports'], function (_, $, exports) {
            root.BackBone = factory(root, exports, _, $);
        });
    } else if(typeof exports !== 'undefined'){
        var _ = require('underscore'),$;
        try {
            $ = require('jquery');
        } catch (e) {
            factory(root, exports, _, $);
        }
    } else {
        root.BackBone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
    }
})(function (root, Backbone, _, $) {
    var previousBackbone = root.BackBone;
    //类数组对象带有这个方法的话，console出来会是array
    var slice = Array.prototype.slice;
    Backbone.VERSION = "1.2.3";
    Backbone.$ = $;
    Backbone.noConflict = function () {
        root.BackBone = previousBackbone;
        return this;
    };
    //sync好像会用，看sync模块的时候再研究
    Backbone.emulateHTTP = false;
    Backbone.emulateJSON = false;
});