/**
 * Artemis主函数
 */
var Artemis = Artemis || {};

/**
 * Artemis CONF 集中管理地
 */
Artemis.CONF = function () {

    return {
        API: {
            search: {

            },

            messagePush: {
                v: '1.0'
            }

        },

        VERSION: '0.0.1',

    };
}();

/**
 * Artemis事件分发中心
 * alias ArtemisHub
 */
var ArtemisHub = Artemis.Hub = new $.EventEmitter({ wildcard: true, delimiter: '::' });







