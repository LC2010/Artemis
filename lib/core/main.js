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
 * 跟业务相关的信息
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

    // 针对__DEBUG__做输出
    if (location.href.queryUrl('__DEBUG__')) {
        ArtemisHub.on('global::*', function (data) {
            console.log('全局监听开启 --> 事件名称: ', this.event, data);
        });
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




















