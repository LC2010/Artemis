/**
 * Artemis主函数
 */
var Artemis = Artemis || {};

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
    var oldDocwrite = document.write;
    document.write = function(str) {};

    window.console = window.console || function () { };

    /**
     * docWrite重写，应对运营商拦截加广告等
     * @param  {String} str 
     */
    var docWrite = function(str) {
        if (oldDocwrite.apply) {
            oldDocwrite.apply(document, arguments);
        } else {
            oldDocwrite(str);
        }
    };


    return {
        docWrite: docWrite
    };
}();

var __ = Artemis.common;


/**
 * Simple CMD Module Loader
 */
var require, __d;

(function (global) {
    var map = {}, resolved = {};

    var defaultDeps = 
        ['global', 'require', 'requireDynamic', 'requireLazy', 'module', 'exports'];

    require = function(/*string*/ id, /*boolean?*/ soft) {
        // 如果已经存入到resolved中就直接返回
        if (resolved.hasOwnProperty(id)) {
            return resolved[id];
        }

        // 如果在Map表中找不到
        if (!map.hasOwnProperty(id)) {
            if (soft) {
                return null;
            }
            throw new Error('Module ' + id + ' has not been defined.');
        }

        // 从hashMap中获取模块
        var module = map[id],
            deps = module.deps, // 获取该模块的依赖列表
            length = deps.length,
            dep,
            args = [];

        // 根据依赖列表找到对应的处理函数
        for (var i = 0; i < length; i++) {
            switch (deps[i]) {
                case 'module'           : dep = module; break;
                case 'exports'          : dep = module.exports; break;
                case 'global'           : dep = global; break;
                case 'require'          : dep = require; break;
                case 'requireDynamic'   : dep = require; break;
                case 'requireLazy'      : dep = null; break;
                default                 : dep = require.call(null, deps[i]);
            }
            args.push(dep);
        }

        module.factory.apply(global, args);
        // 装入MAP中防止重复引入
        resolved[id] = module.exports;
        return module.exports;
    };

    __d = function(/*string*/ id, /*array<string>*/ deps, factory, /*number?*/ _special) {
        if (typeof factory == 'function') {
            // 放入到维护属性的映射表中
            map[id] = {
                factory : factory,
                deps : defaultDeps.concat(deps),
                exports : {}
            };

            // 3 signifies that this should be executed immediately
            if (_special === 3) {
                require.call(null, id);
            }
        } else {
            resolved[id] = factory;
        }
    };
})(this);


/**
 * 测试模块mid
 */
__d('common.js.mid', ['common.js.ES5Date'], function (global, require, requireDynamic, requireLazy, module, exports) {
    var ES5Date = require('common.js.ES5Date');

    module.exports = {
        mid: ES5Date.now() 
    };
});

/**
 * 测试模块ES5Date
 */
__d('common.js.ES5Date', [], function (global, require, requireDynamic, requireLazy, module, exports) {
    var ES5Date = {};
    ES5Date.now = function() {
        return new Date().getTime();
    };
    module.exports = ES5Date;    
});






// 针对__DEBUG__做输出
if (location.href.queryUrl('__DEBUG__')) {
    ArtemisHub.on('global::*', function (data) {
        console.log('全局监听开启 --> 事件名称: ', this.event, data);
    });
}




















