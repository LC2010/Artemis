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

var _ = Artemis.core = Artemis.core || {};


















