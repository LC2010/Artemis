! function(globals, document) {
    var storagePrefix = "artemis_";
    globals.LocalJs = {
        require: function(file, callback) {
            if (!localStorage.getItem(storagePrefix + "jq")) {
                document.write('<script src="' + file + '" type="text/javascript"></script>');
                var self = this;
                setTimeout(function() {
                    self._loadJs(file, callback)
                }, 3e3)
            } else {
                this._reject(localStorage.getItem(storagePrefix + "jq"), callback)
            }
        },
        _loadJs: function(file, callback) {
            if (!file) {
                return false
            }
            var self = this;
            var xhr = new XMLHttpRequest;
            xhr.open("GET", file);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        localStorage.setItem(storagePrefix + "jq", xhr.responseText)
                    } else {}
                }
            };
            xhr.send()
        },
        _reject: function(data, callback) {
            var el = document.createElement("script");
            el.type = "text/javascript";
            el.appendChild(document.createTextNode(data));
            document.getElementsByTagName("head")[0].appendChild(el);
            callback && callback()
        },
        isSupport: function() {
            return window.localStorage
        }
    }
}(window, document);
! function() {
    // var url = _GET_HASHMAP ? _GET_HASHMAP("/player/static/js/naga/common/jquery-1.7.2.js") : "/player/static/js/naga/common/jquery-1.7.2.js";
    // url = url.replace(/^\/\/mu[0-9]*\.bdstatic\.com/g, "");
    var url = '../lib/jquery/jquery.js';
    LocalJs.require(url, function() {})
}();