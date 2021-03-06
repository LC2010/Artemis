/**
 * Artemis主函数
 */
var Artemis = Artemis || {};

var doc = document;

/**
 * Artemis.config集中管理
 */
Artemis.config = function () {
    var config = {};

    function initialize(options) {
        var options = options || {}, key;
        for (key in options) options.hasOwnProperty(key) && (config[key] = options[key]);
    }

    return {
        __config__: config,
        init: initialize,
        get: function (key, defaults) {
            return config.hasOwnProperty(key) ? config[key] : defaults;
        }

    };
}();

/**
 * config初始化阶段
 */
Artemis.config.init({
    version: '1.0.0',
});

/**
 * Artemis事件分发中心
 * alias ArtemisHub
 */
var ArtemisHub = Artemis.Hub = new $.EventEmitter({ wildcard: true, delimiter: '::' });

/**
 * Artemis通用函数
 * 跟业务相关的信息，直接暴露到__命名空间中，适合便捷使用
 */
Artemis.common = Artemis.common || {};

/**
 * Artemis页面事件监听函数
 */
Artemis.common.pageEvents = function() {
    var win = $(window), _timer = null;

    function broadcast(data, delay) {
        _timer && clearTimeout(_timer);

        _timer = setTimeout(function () {
            ArtemisHub.emit("global::viewport.change", {
                height: win.innerHeight(),
                width: win.innerWidth(),
                scrollTop: win.scrollTop(),
                scrollLeft: win.scrollLeft(),
                originalEvent: data.originalEvent
            });
        }, delay || 20);
    }

    for (var map = [
            [window, 'load', 'window.load'],
            [window, 'resize', 'window.resize']
        ], len = map.length; len--; ) {

        var entry = map[len];
        var dom = entry[0], eventType = entry[1], signal = entry[2];
        $(dom).on(eventType, function (e) {
            ArtemisHub.emit(signal, { originalEvent: e });
        });

        ArtemisHub.on('window.load', broadcast);
        ArtemisHub.on('window.resize', broadcast);
    }
}();

Artemis.common = function() {

    var oldDocwrite = doc.write;
    doc.write = function(str) {};

    /**
     * docWrite重写，应对运营商拦截加广告等
     * @param  {String} str 
     */
    var docWrite = function(str) {
        if (oldDocwrite.apply) {
            oldDocwrite.apply(doc, arguments);
        } else {
            oldDocwrite(str);
        }
    };

    // 重写console.log
    window.console = window.console || function () { };

    // 统一处理阻止空连接跳转
    $(doc).on('click', 'a[href="#"]', function (e) {
        e.preventDefault();
    });

    // window.console.log安全保障
    if (typeof window.console === 'undefined') {
        window.console = {
            log: function () {},
            debug: function () {},
            error: function () {}
        }
    }


    return {
        docWrite: docWrite
    };
}();

var __ = Artemis.common;


/**
 * OO 模式 
 * MIT LICENSE, Copyright http://aralejs.org/class/
 */

var Class = function() {
    'use strict';
    // Class
    // -----------------
    // Thanks to:
    //  - http://mootools.net/docs/core/Class/Class
    //  - http://ejohn.org/blog/simple-javascript-inheritance/
    //  - https://github.com/ded/klass
    //  - http://documentcloud.github.com/backbone/#Model-extend
    //  - https://github.com/joyent/node/blob/master/lib/util.js
    //  - https://github.com/kissyteam/kissy/blob/master/src/seed/src/kissy.js

    // The base Class implementation.
    function Class(o) {
        // Convert existed function to Class.
        if (!(this instanceof Class) && isFunction(o)) {
            return classify(o)
        }
    }

    // module.exports = Class


    // Create a new Class.
    //
    //  var SuperPig = Class.create({
    //    Extends: Animal,
    //    Implements: Flyable,
    //    initialize: function() {
    //      SuperPig.superclass.initialize.apply(this, arguments)
    //    },
    //    Statics: {
    //      COLOR: 'red'
    //    }
    // })
    //
    Class.create = function(parent, properties) {
        if (!isFunction(parent)) {
            properties = parent
            parent = null
        }

        properties || (properties = {})
        parent || (parent = properties.Extends || Class)
        properties.Extends = parent

        // The created class constructor
        function SubClass() {
            // Call the parent constructor.
            parent.apply(this, arguments)

            // Only call initialize in self constructor.
            if (this.constructor === SubClass && this.initialize) {
                this.initialize.apply(this, arguments)
            }
        }

        // Inherit class (static) properties from parent.
        if (parent !== Class) {
            mix(SubClass, parent, parent.StaticsWhiteList)
        }

        // Add instance properties to the subclass.
        implement.call(SubClass, properties)

        // Make subclass extendable.
        return classify(SubClass)
    }


    function implement(properties) {
        var key, value

        for (key in properties) {
            value = properties[key]

            if (Class.Mutators.hasOwnProperty(key)) {
                Class.Mutators[key].call(this, value)
            } else {
                this.prototype[key] = value
            }
        }
    }


    // Create a sub Class based on `Class`.
    Class.extend = function(properties) {
        properties || (properties = {})
        properties.Extends = this

        return Class.create(properties)
    }


    function classify(cls) {
        cls.extend = Class.extend
        cls.implement = implement
        return cls
    }


    // Mutators define special properties.
    Class.Mutators = {

        'Extends': function(parent) {
            var existed = this.prototype
            var proto = createProto(parent.prototype)

            // Keep existed properties.
            mix(proto, existed)

            // Enforce the constructor to be what we expect.
            proto.constructor = this

            // Set the prototype chain to inherit from `parent`.
            this.prototype = proto

            // Set a convenience property in case the parent's prototype is
            // needed later.
            this.superclass = parent.prototype

        },

        'Implements': function(items) {
            isArray(items) || (items = [items])
            var proto = this.prototype, item

            while (item = items.shift()) {
                mix(proto, item.prototype || item)
            }
        },

        'Statics': function(staticProperties) {
            mix(this, staticProperties)
        }
    }


    // Shared empty constructor function to aid in prototype-chain creation.
    function Ctor() {
    }

    // See: http://jsperf.com/object-create-vs-new-ctor
    var createProto = Object.__proto__ ?
        function(proto) {
            return { __proto__: proto }
        } :
        function(proto) {
            Ctor.prototype = proto
            return new Ctor()
        }


    // Helpers
    // ------------

    function mix(r, s, wl) {
        // Copy "all" properties including inherited ones.
        for (var p in s) {
            if (s.hasOwnProperty(p)) {
                if (wl && indexOf(wl, p) === -1) continue

                // 在 iPhone 1 代等设备的 Safari 中，prototype 也会被枚举出来，需排除
                if (p !== 'prototype') {
                    r[p] = s[p]
                }
            }
        }
    }


    var toString = Object.prototype.toString
    var isArray = Array.isArray

    if (!isArray) {
        isArray = function(val) {
            return toString.call(val) === '[object Array]'
        }
    }

    var isFunction = function(val) {
        return toString.call(val) === '[object Function]'
    }

    var indexOf = Array.prototype.indexOf ?
        function(arr, item) {
            return arr.indexOf(item)
        } :
        function(arr, item) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === item) {
                    return i
                }
            }
            return -1
        }

    return Class;
}();








// 针对__DEBUG__做输出
if (location.href.queryUrl('__DEBUG__')) {
    ArtemisHub.on('global::*', function (data) {
        console.log('全局监听开启 --> 事件名称: ', this.event, data);
    });
}




















