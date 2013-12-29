/**
 * Artemis核心辅助函数 移植qwrapCore
 */
var _ = Artemis.core = Artemis.core || {};

/**
 * string扩展
 */
(function() {
    var StringH = {
        trim: function(s) {
            return s.replace(/^[\s\uFEFF\xa0\u3000]+|[\uFEFF\xa0\u3000\s]+$/g, "");
        },
        mulReplace: function(s, arr) {
            for (var i = 0; i < arr.length; i++) {
                s = s.replace(arr[i][0], arr[i][1]);
            }
            return s;
        },
        format: function(s, arg0) {
            var args = arguments;
            return s.replace(/\{(\d+)\}/ig, function(a, b) {
                var ret = args[(b | 0) + 1];
                return ret == null ? '' : ret;
            });
        },
        contains: function(s, subStr) {
            return s.indexOf(subStr) > -1;
        },
        dbc2sbc: function(s) {
            return StringH.mulReplace(s, [
                [/[\uff01-\uff5e]/g, function(a) {
                    return String.fromCharCode(a.charCodeAt(0) - 65248);
                }],
                [/\u3000/g, ' '],
                [/\u3002/g, '.']
            ]);
        },
        byteLen: function(s) {
            return s.replace(/[^\x00-\xff]/g, "--").length;
        },
        subByte: function(s, len, tail) {
            if (StringH.byteLen(s) <= len) {return s; }
            tail = tail || '';
            len -= StringH.byteLen(tail);
            return s.substr(0, len).replace(/([^\x00-\xff])/g, "$1 ") //双字节字符替换成两个
                .substr(0, len) //截取长度
                .replace(/[^\x00-\xff]$/, "") //去掉临界双字节字符
                .replace(/([^\x00-\xff]) /g, "$1") + tail; //还原
        },

        camelize: function(s) {
            return s.replace(/\-(\w)/ig, function(a, b) {
                return b.toUpperCase();
            });
        },
        decamelize: function(s) {
            return s.replace(/[A-Z]/g, function(a) {
                return "-" + a.toLowerCase();
            });
        },
        encode4Js: function(s) {
            return StringH.mulReplace(s, [
                [/\\/g, "\\u005C"],
                [/"/g, "\\u0022"],
                [/'/g, "\\u0027"],
                [/\//g, "\\u002F"],
                [/\r/g, "\\u000A"],
                [/\n/g, "\\u000D"],
                [/\t/g, "\\u0009"]
            ]);
        },
        escapeChars: function(s){
            return StringH.mulReplace(s, [
                [/\\/g, "\\\\"],
                [/"/g, "\\\""],
                //[/'/g, "\\\'"],//标准json里不支持\后跟单引号
                [/\r/g, "\\r"],
                [/\n/g, "\\n"],
                [/\t/g, "\\t"]
            ]);
        },
        encode4Http: function(s) {
            return s.replace(/[\u0000-\u0020\u0080-\u00ff\s"'#\/\|\\%<>\[\]\{\}\^~;\?\:@=&]/g, function(a) {
                return encodeURIComponent(a);
            });
        },
        encode4Html: function(s) {
            var el = document.createElement('pre'); //这里要用pre，用div有时会丢失换行，例如：'a\r\n\r\nb'
            var text = document.createTextNode(s);
            el.appendChild(text);
            return el.innerHTML;
        },
        encode4HtmlValue: function(s) {
            return StringH.encode4Html(s).replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        },
        decode4Html: function(s) {
            var div = document.createElement('div');
            div.innerHTML = StringH.stripTags(s);
            return div.childNodes[0] ? div.childNodes[0].nodeValue || '' : '';
        },
        stripTags: function(s) {
            return s.replace(/<[^>]*>/gi, '');
        },
        evalJs: function(s, opts) { //如果用eval，在这里需要加引号，才能不影响YUI压缩。不过其它地方用了也会有问题，所以改成evalJs，
            return new Function("opts", s)(opts);
        },
        evalExp: function(s, opts) {
            return new Function("opts", "return (" + s + ");")(opts);
        },
        queryUrl: function(url, key) {
            url = url.replace(/^[^?=]*\?/ig, '').split('#')[0]; //去除网址与hash信息
            var json = {};
            //考虑到key中可能有特殊符号如“[].”等，而[]却有是否被编码的可能，所以，牺牲效率以求严谨，就算传了key参数，也是全部解析url。
            url.replace(/(^|&)([^&=]+)=([^&]*)/g, function (a, b, key , value){
                //对url这样不可信的内容进行decode，可能会抛异常，try一下；另外为了得到最合适的结果，这里要分别try
                try {
                    key = decodeURIComponent(key);
                } catch(e) {}
                try {
                    value = decodeURIComponent(value);
                } catch(e) {}
                if (!(key in json)) {
                    json[key] = /\[\]$/.test(key) ? [value] : value; //如果参数名以[]结尾，则当作数组
                }
                else if (json[key] instanceof Array) {
                    json[key].push(value);
                }
                else {
                    json[key] = [json[key], value];
                }
            });
            return key ? json[key] : json;
        },
        decodeURIJson: function(url){
            return StringH.queryUrl(url);
        }
    };
    Artemis.core.str = StringH;
}());

/**
 * object扩展
 */
(function() {
    var escapeChars = _.str.escapeChars;
    function getConstructorName(o) {
        //加o.constructor是因为IE下的window和document
        if(o != null && o.constructor != null){
            return  Object.prototype.toString.call(o).slice(8, -1);
        }else{
            return '';
        }
    }
    //注意类型判断如果用.constructor比较相等和用instanceof都会有跨iframe的问题，因此尽量避免
    //用typeof和Object.prototype.toString不会有这些问题
    var ObjectH = {
        isString: function(obj) {
            return getConstructorName(obj) == 'String';
        },
        isFunction: function(obj) {
            return getConstructorName(obj) == 'Function';
        },
        isArray: function(obj) {
            return getConstructorName(obj) == 'Array';
        },
        isArrayLike: function(obj) {
            return !!obj && typeof obj == 'object' && obj.nodeType != 1 && typeof obj.length == 'number';
        },
        isObject: function(obj) {
            return obj !== null && typeof obj == 'object';
        },
        isPlainObject: function(obj) {
            return getConstructorName(obj) == 'Object';
        },
        isElement: function(obj) {
            return !!obj && obj.nodeType == 1;
        },
        set: function(obj, prop, value) {
            if (ObjectH.isArray(prop)) {
                //set(obj, props, values)
                for (var i = 0; i < prop.length; i++) {
                    ObjectH.set(obj, prop[i], value[i]);
                }
            } else if (ObjectH.isPlainObject(prop)) {
                //set(obj, propJson)
                for (i in prop) {
                    ObjectH.set(obj, i, prop[i]);
                }
            } else if (ObjectH.isFunction(prop)) { //getter
                var args = [].slice.call(arguments, 1);
                args[0] = obj;
                prop.apply(null, args);
            } else {
                //set(obj, prop, value);
                var keys = prop.split(".");
                i = 0;
                for (var obj2 = obj, len = keys.length - 1; i < len; i++) {
                    obj2 = obj2[keys[i]];
                }
                obj2[keys[i]] = value;
            }
            return obj;
        },
        get: function(obj, prop, nullSensitive) {
            if (ObjectH.isArray(prop)) { //get(obj, props)
                var ret = [],
                    i;
                for (i = 0; i < prop.length; i++) {
                    ret[i] = ObjectH.get(obj, prop[i], nullSensitive);
                }
            } else if (ObjectH.isFunction(prop)) { //getter
                var args = [].slice.call(arguments, 1);
                args[0] = obj;
                return prop.apply(null, args);
            } else { //get(obj, prop)
                var keys = prop.split(".");
                ret = obj;
                for (i = 0; i < keys.length; i++) {
                    if (!nullSensitive && ret == null) {return; }
                    ret = ret[keys[i]];
                }
            }
            return ret;
        },
        mix: function(des, src, override) {
            if (ObjectH.isArray(src)) {
                for (var i = 0, len = src.length; i < len; i++) {
                    ObjectH.mix(des, src[i], override);
                }
                return des;
            }
            if (typeof override == 'function') {
                for (i in src) {
                    des[i] = override(des[i], src[i], i);
                }
            }
            else {
            for (i in src) {
                //这里要加一个des[i]，是因为要照顾一些不可枚举的属性
                if (override || !(des[i] || (i in des))) {
                    des[i] = src[i];
                }
            }
            }
            return des;
        },
        map: function(obj, fn, thisObj) {
            var ret = {};
            for (var key in obj) {
                ret[key] = fn.call(thisObj, obj[key], key, obj);
            }
            return ret;
        },
        keys: function(obj) {
            var ret = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    ret.push(key);
                }
            }
            return ret;
        },
        values: function(obj) {
            var ret = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    ret.push(obj[key]);
                }
            }
            return ret;
        },
        stringify: function(obj) {
            if (obj == null) {return 'null'; }
            if (typeof obj !='string' && obj.toJSON) {//JK: IE8的字符串的toJSON有问题，丢了引号
                return obj.toJSON();
            }
            var type = getConstructorName(obj).toLowerCase();
            switch (type) {
                case 'string':
                    return '"' + escapeChars(obj) + '"';
                case 'number':
                    var ret = obj.toString();
                    return /N/.test(ret) ? 'null' : ret;
                case 'boolean':
                    return obj.toString();
                case 'date' :
                    return 'new Date(' + obj.getTime() + ')';
                case 'array' :
                    var ar = [];
                    for (var i = 0; i < obj.length; i++) {ar[i] = ObjectH.stringify(obj[i]); }
                    return '[' + ar.join(',') + ']';
                case 'object':
                    if (ObjectH.isPlainObject(obj)) {
                        ar = [];
                        for (i in obj) {
                            ar.push('"' + escapeChars(i) + '":' + ObjectH.stringify(obj[i]));
                        }
                        return '{' + ar.join(',') + '}';
                    }
            }
            return 'null'; //无法序列化的，返回null;
        },
        encodeURIJson: function(json){
            var s = [];
            for( var p in json ){
                if(json[p]==null) continue;
                if(json[p] instanceof Array)
                {
                    for (var i=0;i<json[p].length;i++) s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p][i]));
                }
                else
                    s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p]));
            }
            return s.join('&');
        }
    };
    Artemis.core.obj = ObjectH;
}());

/**
 * array扩展
 */
(function() {
    var isArray = _.obj.isArray;
    var ArrayH = {
        map: function(arr, callback, pThis) {
            var len = arr.length;
            var rlt = new Array(len);
            for (var i = 0; i < len; i++) {
                if (i in arr) {
                    rlt[i] = callback.call(pThis, arr[i], i, arr);
                }
            }
            return rlt;
        },
        forEach: function(arr, callback, pThis) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (i in arr) {
                    callback.call(pThis, arr[i], i, arr);
                }
            }
        },
        filter: function(arr, callback, pThis) {
            var rlt = [];
            for (var i = 0, len = arr.length; i < len; i++) {
                if ((i in arr) && callback.call(pThis, arr[i], i, arr)) {
                    rlt.push(arr[i]);
                }
            }
            return rlt;
        },
        some: function(arr, callback, pThis) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (i in arr && callback.call(pThis, arr[i], i, arr)) {
                    return true;
                }
            }
            return false;
        },
        every: function(arr, callback, pThis) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (i in arr && !callback.call(pThis, arr[i], i, arr)) {
                    return false;
                }
            }
            return true;
        },
        indexOf: function(arr, obj, fromIdx) {
            var len = arr.length;
            fromIdx |= 0; //取整
            if (fromIdx < 0) {
                fromIdx += len;
            }
            if (fromIdx < 0) {
                fromIdx = 0;
            }
            for (; fromIdx < len; fromIdx++) {
                if (fromIdx in arr && arr[fromIdx] === obj) {
                    return fromIdx;
                }
            }
            return -1;
        },
        lastIndexOf: function(arr, obj, fromIdx) {
            var len = arr.length;
            fromIdx |= 0; //取整
            if (!fromIdx || fromIdx >= len) {
                fromIdx = len - 1;
            }
            if (fromIdx < 0) {
                fromIdx += len;
            }
            for (; fromIdx > -1; fromIdx--) {
                if (fromIdx in arr && arr[fromIdx] === obj) {
                    return fromIdx;
                }
            }
            return -1;
        },
        contains: function(arr, obj) {
            return (ArrayH.indexOf(arr, obj) >= 0);
        },
        clear: function(arr) {
            arr.length = 0;
        },
        remove: function(arr, obj) {
            var idx = -1;
            for (var i = 1; i < arguments.length; i++) {
                var oI = arguments[i];
                for (var j = 0; j < arr.length; j++) {
                    if (oI === arr[j]) {
                        if (idx < 0) {
                            idx = j;
                        }
                        arr.splice(j--, 1);
                    }
                }
            }
            return idx;
        },
        unique: function(arr) {
            var rlt = [],
                oI = null,
                indexOf = Array.indexOf || ArrayH.indexOf;
            for (var i = 0, len = arr.length; i < len; i++) {
                if (indexOf(rlt, oI = arr[i]) < 0) {
                    rlt.push(oI);
                }
            }
            return rlt;
        },
        reduce: function(arr, callback, initial) {
            var len = arr.length;
            var i = 0;
            if (arguments.length < 3) { //找到第一个有效元素当作初始值
                var hasV = 0;
                for (; i < len; i++) {
                    if (i in arr) {
                        initial = arr[i++];
                        hasV = 1;
                        break;
                    }
                }
                if (!hasV) {throw new Error("No component to reduce"); }
            }
            for (; i < len; i++) {
                if (i in arr) {
                    initial = callback(initial, arr[i], i, arr);
                }
            }
            return initial;
        },
        reduceRight: function(arr, callback, initial) {
            var len = arr.length;
            var i = len - 1;
            if (arguments.length < 3) { //逆向找到第一个有效元素当作初始值
                var hasV = 0;
                for (; i > -1; i--) {
                    if (i in arr) {
                        initial = arr[i--];
                        hasV = 1;
                        break;
                    }
                }
                if (!hasV) {
                    throw new Error("No component to reduceRight");
                }
            }
            for (; i > -1; i--) {
                if (i in arr) {
                    initial = callback(initial, arr[i], i, arr);
                }
            }
            return initial;
        },
        expand: function(arr, shallow) {
            var ret = [],
                i = 0,
                len = arr.length;
            for (; i<len; i++) {
                if (isArray(arr[i])) {
                    ret = ret.concat(shallow ? arr[i] : ArrayH.expand(arr[i]));
                }
                else {
                    ret.push(arr[i]);
                }
            }
            return ret;
        },
        toArray: function(arr) {
            var ret = [];
            for (var i = 0; i < arr.length; i++) {
                ret[i] = arr[i];
            }
            return ret;
        }
    };
    Artemis.core.arr = ArrayH;
}());

/**
 * date扩展
 */
(function() {
    var DateH = {
        format: function(d, pattern) {
            pattern = pattern || 'yyyy-MM-dd';
            var y = d.getFullYear().toString(),
                o = {
                    M: d.getMonth() + 1, //month
                    d: d.getDate(), //day
                    h: d.getHours(), //hour
                    m: d.getMinutes(), //minute
                    s: d.getSeconds() //second
                };
            pattern = pattern.replace(/(y+)/ig, function(a, b) {
                return y.substr(4 - Math.min(4, b.length));
            });
            for (var i in o) {
                pattern = pattern.replace(new RegExp('(' + i + '+)', 'g'), function(a, b) {
                    return (o[i] < 10 && b.length > 1) ? '0' + o[i] : o[i];
                });
            }
            return pattern;
        }
    };
    Artemis.core.date = DateH;
}());

/**
 * function扩展
 */
(function() {
    var FunctionH = {
        methodize: function(func, attr) {
            if (attr) {
                return function() {
                    return func.apply(null, [this[attr]].concat([].slice.call(arguments)));
                };
            }
            return function() {
                return func.apply(null, [this].concat([].slice.call(arguments)));
            };
        }
    };
    Artemis.core.func = FunctionH;
}());

(function() {
    var FunctionH = Artemis.core.func,
        Methodized = function() {};
    var HelperH = {
        methodize: function(helper, attr, preserveEveryProps) {
            var ret = new Methodized(); //因为 methodize 之后gsetter和rwrap的行为不一样
            for (var i in helper) {
                var fn = helper[i];
                if (fn instanceof Function) {
                    ret[i] = FunctionH.methodize(fn, attr);
                }else if(preserveEveryProps){
                    //methodize默认不保留非Function类型的成员
                    //如特殊情况需保留，可将preserveEveryProps设为true
                    ret[i] = fn;
                }
            }
            return ret;
        }
    };
    Artemis.core.helper = HelperH;
}());

/**
 * retouch
 */
(function() {
    var methodize = _.helper.methodize,
        mix = _.obj.mix;

    mix(Object, _.obj);

    mix(Array, _.arr);
    mix(Array.prototype, methodize(_.arr));

    mix(Function, _.func);

    mix(Date, _.date);
    mix(Date.prototype, methodize(_.date));

    mix(String, _.str);
    mix(String.prototype, methodize(_.str));
}());

/**
 * UA检测
 */
_.Browser = (function() {
    var na = window.navigator,
        ua = na.userAgent.toLowerCase(),
        browserTester = /(msie|webkit|gecko|presto|opera|safari|firefox|chrome|maxthon|android|ipad|iphone|webos|hpwos|trident)[ \/os]*([\d_.]+)/ig,
        Browser = {
            platform: na.platform
        };

    ua.replace(browserTester, function(a, b, c) {
        if (!Browser[b]) {
            Browser[b] = c;
        }
    });

    if (Browser.opera) { //Opera9.8后版本号位置变化
        ua.replace(/opera.*version\/([\d.]+)/, function(a, b) {
            Browser.opera = b;
        });
    }

    //IE11+ 会进入这个分支
    if (!Browser.msie && Browser.trident) { 
        ua.replace(/trident\/[0-9].*rv[ :]([0-9.]+)/ig, function(a, c) {
                Browser.msie = c;
            });
    }

    if (Browser.msie) {
        Browser.ie = Browser.msie;
        var v = parseInt(Browser.msie, 10);
        Browser['ie' + v] = true;
    }

    return Browser;
}());

if (_.Browser.ie) {
    try {
        document.execCommand("BackgroundImageCache", false, true);
    } catch (e) {}
}

/**
 * template
 */
(function () {
// By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  Artemis.core.template = function(text, data, settings) {
    var render;
    settings = _.obj.mix(_.templateSettings, settings || {}, true);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.str.encode4HtmlValue(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

})();

/**
 * lunar 农历转换函数
 * @param  {Date}   公历时间
 * @return {Date}   农历时间
 */
_.lunar = function(a){
    var b = function(a) {
        this.dateObj = a != undefined ? a : new Date, this.SY = this.dateObj.getFullYear(), this.SM = this.dateObj.getMonth(), this.SD = this.dateObj.getDate(), this.lunarInfo = [19416, 19168, 42352, 21717, 53856, 55632, 91476, 22176, 39632, 21970, 19168, 42422, 42192, 53840, 119381, 46400, 54944, 44450, 38320, 84343, 18800, 42160, 46261, 27216, 27968, 109396, 11104, 38256, 21234, 18800, 25958, 54432, 59984, 28309, 23248, 11104, 100067, 37600, 116951, 51536, 54432, 120998, 46416, 22176, 107956, 9680, 37584, 53938, 43344, 46423, 27808, 46416, 86869, 19872, 42416, 83315, 21168, 43432, 59728, 27296, 44710, 43856, 19296, 43748, 42352, 21088, 62051, 55632, 23383, 22176, 38608, 19925, 19152, 42192, 54484, 53840, 54616, 46400, 46752, 103846, 38320, 18864, 43380, 42160, 45690, 27216, 27968, 44870, 43872, 38256, 19189, 18800, 25776, 29859, 59984, 27480, 21952, 43872, 38613, 37600, 51552, 55636, 54432, 55888, 30034, 22176, 43959, 9680, 37584, 51893, 43344, 46240, 47780, 44368, 21977, 19360, 42416, 86390, 21168, 43312, 31060, 27296, 44368, 23378, 19296, 42726, 42208, 53856, 60005, 54576, 23200, 30371, 38608, 19415, 19152, 42192, 118966, 53840, 54560, 56645, 46496, 22224, 21938, 18864, 42359, 42160, 43600, 111189, 27936, 44448, 84835], this.leapMonth = function(a) {
            return this.lunarInfo[a - 1900] & 15
        }, this.monthDays = function(a, b) {
            return this.lunarInfo[a - 1900] & 65536 >> b ? 30 : 29
        }, this.leapDays = function(a) {
            return this.leapMonth(a) ? this.lunarInfo[a - 1900] & 65536 ? 30 : 29 : 0
        }, this.lYearDays = function(a) {
            var b, c = 348;
            for(b = 32768; b > 8; b >>= 1) c += this.lunarInfo[a - 1900] & b ? 1 : 0;
            return c + this.leapDays(a)
        }, this.Lunar = function(a) {
            var b, c = 0,
                d = 0,
                e = {},
                f = new Date(1900, 0, 31),
                g = (a - f) / 864e5;
            e.dayCyl = g + 40, e.monCyl = 14;
            for(b = 1900; b < 2050 && g > 0; b++) d = this.lYearDays(b), g -= d, e.monCyl += 12;
            g < 0 && (g += d, b--, e.monCyl -= 12), e.year = b, e.yearCyl = b - 1864, c = this.leapMonth(b), e.isLeap = !1;
            for(b = 1; b < 13 && g > 0; b++) c > 0 && b == c + 1 && e.isLeap == 0 ? (--b, e.isLeap = !0, d = this.leapDays(e.year)) : d = this.monthDays(e.year, b), e.isLeap == 1 && b == c + 1 && (e.isLeap = !1), g -= d, e.isLeap == 0 && e.monCyl++;
            return g == 0 && c > 0 && b == c + 1 && (e.isLeap ? e.isLeap = !1 : (e.isLeap = !0, --b, --e.monCyl)), g < 0 && (g += d, --b, --e.monCyl), e.month = b, e.day = g + 1, e
        }, this.cDay = function(a, b) {
            var c = ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d", "\u4e03", "\u516b", "\u4e5d", "\u5341"],
                d = ["\u521d", "\u5341", "\u5eff", "\u5345", "\u3000"],
                e;
            a > 10 ? e = "\u5341" + c[a - 10] : (a === 1 ? e = "\u6B63" : e = c[a]), e += "\u6708";
            switch(b) {
            case 10:
                e += "\u521d\u5341";
                break;
            case 20:
                e += "\u4e8c\u5341";
                break;
            case 30:
                e += "\u4e09\u5341";
                break;
            default:
                e += d[Math.floor(b / 10)], e += c[b % 10]
            }
            return e
        }, this.solarDay2 = function() {
            var a = new Date(this.SY, this.SM, this.SD),
                b = this.Lunar(a),
                c = this.cDay(b.month, parseInt(b.day, 10));
            return b = null, c
        }
    },
    c = new b(a);
    return c.solarDay2();
};