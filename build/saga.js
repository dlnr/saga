
/*jslint browser:true*/
/*global */

var Saga = (function () {
    "use strict";
    var pub,
        version = "@VERSION",
        id = "saga",
        doc = document || false,
        vars = false,
        init = function () {
            try {
                JSON.parse(doc.getElementById(id).innerHTML);
            } catch (err) {
                vars = "NOT_SET";
            }
        };

    pub = {
        vars: (function () {
            return vars;
        }())
    };

    init();

    return pub;
}());/*jslint browser:true*/
/*global Saga, console, _ */

Saga.Util = (function () {
    "use strict";
    var pub = _,
        fileExtension = function (str) {
            //var re = /(?:\.([^.]+))?$/;
            return str.substr(str.lastIndexOf('.') + 1);
            //return re.exec(str);
        };
    pub.fileExtension = function (str) {
        return fileExtension(str);
    };

    return pub;
}());/*jslint browser:true*/
/*global Saga, console */

Saga.Debug = (function () {
    "use strict";
    var pub,
        util = Saga.Util,
        levels = ["log", "info", "error", "warn"],
        activeLevels = ["log", "error"],
        timestamp = function () {
            var d = new Date();
            return (d.getUTCHours() + ':' + ('0' + d.getUTCMinutes()).slice(-2) + ':' + ('0' + d.getUTCSeconds()).slice(-2) + '.' + ('00' + d.getUTCMilliseconds()).slice(-3));
        },
        output = function (type) {
            if (util.contains(activeLevels, type)) {
                var arg = Array.prototype.slice.call(arguments, 1);
                arg.unshift(timestamp() + ": ");
                try {
                    console[type].apply(console, arg);
                } catch (err) {
                    //console.log("Saga.Debug.log() -> catch", err);
                }
            }
        },
        log = function () {
            var arg = Array.prototype.slice.call(arguments, 0);
            arg.unshift('log');
            output.apply(this, arg);
        },
        info = function () {
            var arg = Array.prototype.slice.call(arguments, 0);
            arg.unshift('info');
            output.apply(this, arg);
        },
        error = function () {
            var arg = Array.prototype.slice.call(arguments, 0);
            arg.unshift('error');
            output.apply(this, arg);
        },
        warn = function () {
            var arg = Array.prototype.slice.call(arguments, 0);
            arg.unshift('warn');
            output.apply(this, arg);
        };
    pub = {
        log: function () {
            log.apply(this, arguments);
        },
        info: function () {
            info.apply(this, arguments);
        },
        error: function () {
            error.apply(this, arguments);
        },
        warn: function () {
            warn.apply(this, arguments);
        },
        levels: function (newLevels) {
            if (newLevels) {
                activeLevels = newLevels;
            } else {
                return activeLevels;
            }
        }
    };
    return pub;
}());/*jslint browser:true*/
/*global Saga*/

Saga.Event = function () {
    "use strict";
    var pub,
        cbs = {},
        off = function (evt, cb) {
            if (typeof cbs[evt] === "undefined") {
                return;
            }
            var l = cbs[evt].length,
                i = l - 1,
                removed = 0;
            if (l > 0) {
                for (i; i >= 0; i -= 1) { //removing all for now
                    if (cbs[evt][i].cb === cb) {
                        cbs[evt].splice(i, 1);
                        removed += 1;
                    }
                }
            }
            return removed;
        },
        offCb = function (e) {
            if (typeof cbs[e.evt] === "undefined") {
                return;
            }
            off(e.evt, e.cb);
        },
        addCb = function (evt, cb, context, amount) {
            if (typeof cbs[evt] === "undefined") {
                cbs[evt] = [];
            }
            var e = {
                'cb': cb,
                'evt': evt,
                'type': amount,
                'context': context
            };
            e.off = function () {
                offCb(e);
            };
            cbs[evt].push(e);
            return e;
        },
        on = function (evt, cb, context) {
            return addCb(evt, cb, context, 0);
        },
        once = function (evt, cb, context) {
            return addCb(evt, cb, context, 1);
        },
        fire = function (evt, data) {
            if (typeof cbs[evt] === "undefined") {
                return;
            }
            var l = cbs[evt].length,
                i = l - 1,
                removed = 0;
            if (l > 0) {
                for (i; i >= 0; i -= 1) {
                    cbs[evt][i].cb(data);
                    if (cbs[evt][i].type === 1) {
                        cbs[evt].splice(i, 1);
                    }
                }
            }
        };

    pub = {
        on: function (evt, cb) {
            return on(evt, cb);
        },
        once: function (evt, cb) {
            return once(evt, cb);
        },
        off: function (evt, cb) {
            return off(evt, cb);
        },
        fire: function (evt, data) {
            fire(evt, data);
        }
    };
    return pub;
};/*jslint browser:true*/
/*global Saga,ActiveXObject */

Saga.net = (function () {
    "use strict";
    var pub,
        util = Saga.Util,
        createXMLHttp = function () {
            if (typeof XMLHttpRequest !== undefined) {
                return new XMLHttpRequest();
            } else if (window.ActiveXObject) {
                var ieXMLHttpVersions = ['MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp', 'Microsoft.XMLHttp'],
                    xmlHttp,
                    i;
                for (i = 0; i < ieXMLHttpVersions.length; i += 1) {
                    try {
                        xmlHttp = new ActiveXObject(ieXMLHttpVersions[i]);
                        return xmlHttp;
                    } catch (e) {}
                }

            }
        },

        getUrlString = function (obj) {
            var narr = [],
                prop;
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    narr.push(prop + "=" + obj[prop]);
                }
            }
            return narr.join("&");
        },

        loader = function (loaderOptions) {
            var pub,
                success,
                error,
                options = loaderOptions,
                debug = Saga.Debug,
                start,
                duration,
                response,

                url,
                method,
                params,
                data = null,
                xmlHttp,

                execute,
                abort,
                timeout,
                abortHandler,
                initOptions = function (options) {
                    if (options) {
                        if (options.url) {
                            url = options.url;
                        }

                        if (options.success) {
                            success = options.success;
                        }
                        if (options.error) {
                            error = options.error;
                        }
                        if (options.abort) {
                            abortHandler = options.abort;
                        }
                        if (options.timeout) {
                            timeout = options.timeout;
                        }
                        if (options.data) {
                            if (util.isString(options.data)) {
                                data = options.data;
                            } else {
                                data = getUrlString(options.data);
                            }
                        }
                        method = options.method || "get";
                    }
                };

            initOptions(options);
            
            xmlHttp = createXMLHttp(success, error);

            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState === 4) {
                    if (xmlHttp.status === 200) {
                        response = xmlHttp.responseText;
                        duration = (new Date().getTime()) - start;
                        try {
                            response = JSON.parse(response);
                        } catch (er) {
                            //ebug.warn("Saga.net.Loader -> Success, but couldn't parse JSON!", er);
                        }
                        /*
                        debug.warn("Saga.net.Loader -> Success!", {
                            'duration': duration,
                            'state': xmlHttp.readyState,
                            'response': response
                        });
                        */
                        if (success) {
                            success.call(null, xmlHttp.responseText);
                        }
                    } else {
                        debug.error("Saga.net.Loader -> Error!", xmlHttp.responseText);
                        if (error) {
                            error.call(null, xmlHttp.responseText);
                        }
                    }
                }/* else {
                    debug.warn("Saga.net.Loader -> state(" + xmlHttp.readyState + "/" + xmlHttp.status + ")");
                }*/
            };

            xmlHttp.ontimeout = function () {
                debug.error("Saga.net.Loader -> Timeout!", xmlHttp.responseText);
                if (error) {
                    error.call(null, xmlHttp.responseText);
                }
            };

            execute = function (options) {
                initOptions(options);
                debug.warn("Saga.net.Loader -> execute()", url, options);
                start = new Date().getTime();
                xmlHttp.open(method, url, true);
                if (String(method) === "post") {
                    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                }
                if (timeout) {
                    xmlHttp.timeout = timeout;
                }
                xmlHttp.send(data);
            };

            abort = function (params) {
                if (xmlHttp.abort) {
                    xmlHttp.abort();
                    abortHandler();
                }
            };

            pub = {
                execute: function (options) {
                    execute(options);
                },
                abort: function () {
                    abort();
                },
                url: function (newUrl) {
                    if (newUrl) {
                        url = newUrl;
                    } else {
                        return url;
                    }
                },
                headers: function () {
                    return xmlHttp.getAllResponseHeaders();
                }
            };

            return pub;
        },



        iframePoster = function (options) {
            var success, error, url, params, iframe, form, execute, getResponse,
                data = null,
                files = null;
            // TODO: sanitize data

            if (options) {
                if (options.url) {
                    url = options.url;
                }
                if (options.success) {
                    success = options.success;
                }
                if (options.error) {
                    error = options.error;
                }
                if (options.data) {
                    data = options.data;
                }
                if (options.files) { // expecting elements ( file)
                    files = options.files;
                }
            }

            form = document.createElement("form");
            form.method = "post";
            form.enctype = "multipart/form-data";

            iframe = document.createElement('iframe');
            iframe.frameBorder = "no";
            iframe.style.width = "1px";
            iframe.style.height = "1px";
            iframe.style.position = "absolute";
            iframe.style.top = "-1000px";
            iframe.style.left = "-1000px";

            execute = function () {

                form.action = url;
                form.innerHTML = "";
                var elem,
                    inputname;

                if (data) {
                    for (inputname in data) {
                        if (data.hasOwnProperty(inputname)) {
                            if (data[inputname].textarea === true) {

                                elem = document.createElement("textarea");
                                elem.name = inputname;
                                //elem.type = "text";
                                elem.value = data[inputname].value;
                                form.appendChild(elem);
                            } else {
                                elem = document.createElement("input");
                                elem.name = inputname;
                                elem.type = "text";
                                elem.value = data[inputname];
                                form.appendChild(elem);
                            }
                        }
                    }
                }

                if (files) {
                    for (inputname in files) {
                        if (files.hasOwnProperty(inputname)) {
                            elem = files[inputname].cloneNode(1);
                            elem.name = inputname;
                            form.appendChild(elem);
                        }
                    }
                }

                iframe.onload = function () {
                    iframe.contentDocument.documentElement.appendChild(form);
                    iframe.onload = function () {
                        iframe.onload = null;
                        var response = iframe.contentWindow.document.body.innerHTML,
                            pos;

                        if (response.substr(0, 4) === "<pre") {
                            pos = String(response).indexOf(">");
                            if (pos > -1) {
                                response = response.substr((pos + 1));
                            }
                        }

                        if (response.substr(0, 5) === "<pre>") {
                            response = response.substr(5);
                        }

                        if (response.substr(response.length - 6, 6) === "</pre>") {
                            response = response.substr(0, response.length - 6);
                        }

                        iframe.parentNode.removeChild(iframe);

                        if (success) {
                            success.call(null, response);
                        }
                    };
                    form.submit();
                };
                iframe.src = "about:blank";
                document.body.appendChild(iframe);
            };

            return {
                execute: function () {
                    execute();
                }
            };
        };

    pub = {
        Loader: loader,
        IframePoster: iframePoster
    };

    return pub;
}());/*jslint browser:true*/
/*global Saga, console */

//TODO: use underscore where possible

Saga.Dom = (function () {
    "use strict";
    var pub,
        u = Saga.Util,
        debug = Saga.Debug,
        head = document.getElementsByTagName("head")[0] || document.documentElement,
        hasClass = function (element, className) {
            if (element && element.className) {
                return element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
            }
            return false;
        },
        addClass = function (element, className) {
            if (!hasClass(element, className)) {
                element.className += " " + className;
            }
            return true;
        },
        removeClass = function (element, className) {
            if (hasClass(element, className)) {
                element.className = element.className.replace(new RegExp('(\\s|^)' + className + '(\\s|$)'), ' ');
            }
            return true;
        },
        getByClassWild = function (className, findIn) {
            var elem = findIn || document,
                elements = elem.getElementsByTagName('*'),
                i = 0,
                l = elements.length,
                results = [];
            for (i; i < l; i += 1) {
                if (hasClass(elements[i], className)) {
                    results.push(elements[i]);
                }
            }
            return results;
        },
        getByClass = function (className, findIn) {
            var results,
                elem = findIn || document;
            if (elem.querySelectorAll) {
                results = elem.querySelectorAll('.' + className);
            } else if (elem.getElementsByClassName) {
                results = elem.getElementsByClassName(className);
            } else {
                getByClassWild(className, findIn);
            }
            return results;
        },
        getById = function (id) {
            return document.getElementById(id);
        },
        elementExists = function (id) {
            if (getById(id) === null) {
                return false;
            }
            return true;
        },
        addCss = function (cssTxt, id) {
            var style = document.createElement("style");
            style.type = "text/css";
            if (id) {
                if (elementExists(id)) {
                    debug.warn("Saga.Dom.addCss(\"" + id + "\"), ID: " + id + " already exists");
                }
                style.id = id;
            }
            if (style.styleSheet) {
                style.styleSheet.cssText = cssTxt;
            } else {
                style.appendChild(document.createTextNode(cssTxt));
            }
            head.appendChild(style);
            return style;
        },
        removeCss = function (id) {
            if (!elementExists(id)) {
                debug.warn("Saga.Dom.removeCss(\"" + id + "\"), ID: " + id + " doesn't exist!");
                return false;
            }
            head.removeChild(getById(id));
            return true;
        },
        addJsFile = function (file, cb, id) {

            var script = document.createElement('script'),
                done = false;
            script.type = "text/javascript";
            if (id) {
                script.id = id;
            }
            script.onload = script.onreadystatechange = function () {
                if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                    done = true;
                    script.onload = script.onreadystatechange = null;
                    if (head && script.parentNode) {
                        head.removeChild(script);
                    }
                }
            };
            script.src = file;
            head.appendChild(script);

            return script;
        },
        addJs = function (jsContents, id) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            if (id) {
                script.id = id;
            }
            try {
                script.appendChild(document.createTextNode(jsContents));
            } catch (e) {
                script.text = jsContents;
            }
            head.appendChild(script);
            return true;
        },
        removeJs = function (id) {
            if (!id) {
                return false;
            }
            try {
                head.removeChild(getById(id));
            } catch (e) {
                return false;
            }
            return true;
        },
        getElementStyle = function (element, styleProp) {
            return (element.currentStyle) ? element.currentStyle[styleProp] : (window.getComputedStyle) ? document.defaultView.getComputedStyle(element, null).getPropertyValue(styleProp) : 'unknown';
        },
        addLoadEvent = function (func) {
            var oldonload = window.onload;
            if (typeof window.onload !== 'function') {
                window.onload = func;
            } else {
                window.onload = function () {
                    if (oldonload) {
                        oldonload();
                    }
                    func();
                };
            }
        },
        setStyles = function (elem, override) {
            var styles = override || {};
            u.each(styles, function (value, style) {
                elem.style[style] = value;
            });
        };

    pub = {
        transitionEnd: function () {
            var name,
                el = document.createElement('bootstrap'),
                transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd otransitionend',
                    'transition': 'transitionend'
                };

            for (name in transEndEventNames) {
                if (transEndEventNames.hasOwnProperty(name)) {
                    if (el.style[name] !== undefined) {
                        return {
                            end: transEndEventNames[name]
                        };
                    }
                }
            }
            return false;
        },
        setStyles: function (elem, override) {
            setStyles(elem, override);
        },
        hasClass: function (element, className) {
            return hasClass(element, className);
        },
        addClass: function (element, className) {
            return addClass(element, className);
        },
        removeClass: function (element, className) {
            return removeClass(element, className);
        },
        getByClass: function (className, findIn) {
            return getByClass(className, findIn);
        },
        getById: function (id) {
            return getById(id);
        },
        elem: function (id) {
            return getById(id);
        },
        elementExists: function (id) {
            return elementExists(id);
        },
        addJsFile: function (file, id) {
            return addJsFile(file, id);
        },
        addJs: function (jsContents, id) {
            return addJs(jsContents, id);
        },
        removeJs: function (id) {
            return removeJs(id);
        },
        addCss: function (cssContents, id) {
            return addCss(cssContents, id);
        },
        removeCss: function (id) {
            return removeCss(id);
        },
        getElementStyle: function (element, styleProp) {
            return getElementStyle(element, styleProp);
        },
        addLoadEvent: function (func) {
            addLoadEvent(func);
        },
        head: function () {
            return head;
        }
    };
    return pub;
}());/*jslint browser:true*/
/*global Saga, escape, unescape */

Saga.Browser = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        agent = navigator.userAgent.split(/\s*[;)(]\s*/),
        setCookie = function (c_name, value, expiredays) {
            var exdate = new Date();
            exdate.setDate(exdate.getDate() + expiredays);
            document.cookie = c_name + "=" + escape(value) + ((expiredays === null) ? "" : "; expires=" + exdate.toGMTString()) + "; path=/";
        },
        getCookie = function (c_name) { // have to find who to credit for this
            if (document.cookie.length > 0) {
                var c_start, c_end;
                c_start = document.cookie.indexOf(c_name + "=");
                if (c_start !== -1) {
                    c_start = c_start + c_name.length + 1;
                    c_end = document.cookie.indexOf(";", c_start);
                    if (c_end === -1) {
                        c_end = document.cookie.length;
                    }
                    return unescape(document.cookie.substring(c_start, c_end));
                }
            }
            return false;
        };

    pub = {
        setCookie: function (name, value, expiredays) {
            setCookie(name, value, expiredays);
        },
        getCookie: function (name) {
            setCookie(name);
        }
    };
    return pub;
}());/*jslint browser:true*/
/*global Saga*/

Saga.Holder = function (holderDivName) {
    "use strict";
    var pub,
        asset = false,
        divName = holderDivName,
        div = false,
        debug = Saga.Debug,
        d = Saga.Dom,
        place = function (newAsset) {
            asset = newAsset;
            debug.info("Saga.Holder.place()", newAsset);
            div = document.getElementById(divName);
            div.innerHTML = asset.Html();

            d.head().appendChild(asset.Js());

            return true;
        },
        setAsset = function (newAsset) {
            asset = newAsset;
            div = document.getElementById(divName);
            div.innerHTML = asset.saga.html[0];
            return true;
        };

    pub = {
        place: function (asset) {
            place(asset);
        },
        asset: function () {
            return asset;
        },
        div: function () {
            return div;
        },
        setAsset: function (asset) {
            return setAsset(asset);
        }
    };
    return pub;
};/*jslint browser:true*/
/*global Saga*/

Saga.Asset = function (assetName, assetInfo) {
    "use strict";
    var pub,
        debug = Saga.Debug,
        u = Saga.Util,
        name = assetName,
        loaded = false,
        view = {},
        holder = false,
        content = {},
       
        loadStack = [],
        stackObj = function (type, file, prop) {
            return {
                'type': type,
                'file': file,
                'loaded': false,
                'content': false,
                'prop': prop
            };
        },
        addLoad = function (type, obj) {
            if (u.isString(obj)) {
                content[type] = false;
                loadStack.push(stackObj(type, obj, ""));
            } else {
                content[type] = {};
                if (u.isArray(obj)) {
                    content[type] = [];
                }
                u.each(obj, function (file, prop) {
                    content[type][prop] = false;
                    loadStack.push(stackObj(type, file, prop));
                });
            }
        },
        init = function (info) {
            debug.info("Saga.Asset.init('" + name + "')", assetInfo);
            if (!assetInfo.hasOwnProperty('files')) {
                debug.error("Saga.Asset.init('" + name + "') -> No content found, exiting");
                return;
            }
            if (!assetInfo.files.hasOwnProperty('js') && !assetInfo.files.hasOwnProperty('html')) {
                debug.error("Saga.Asset.init('" + name + "') -> No Javascript or Html found, exiting");
                return;
            }
            if (assetInfo.files.hasOwnProperty('html')) {
                addLoad('html', assetInfo.files.html);
            }
            if (assetInfo.files.hasOwnProperty('js')) {
                addLoad('js', assetInfo.files.js);
            }
            if (assetInfo.files.hasOwnProperty('template')) {
                addLoad('template', assetInfo.files.template);
            }
        },
        loadComplete = function () {
            u.each(loadStack, function (item) {
                if (item.type === "template") {
                    if (item.prop === "") {
                        content.template = u.template(item.content);
                    } else {
                        content.template[item.prop] = u.template(item.content);
                    }
                } else {
                    if (item.prop === "") {
                        content[item.type] = item.content;
                    } else {
                        content[item.type][item.prop] = item.content;
                    }
                }
            });
            loaded = true;
        };

    init(assetInfo);

    pub = {
        init: function (assetInfo) {
            init(assetInfo);
        },
        loadStack: function () {
            return loadStack;
        },
        loadComplete: function () {
            loadComplete();
        },
        Template: function () {
            return content.template;
        },
        Html: function () {
            return content.html;
        },
        Js: function () {
            return content.js;
        },
        View: view,
        Holder: holder,
        name: (function () {
            return name;
        }()),
        loaded: function () {
            return loaded;
        }
    };
    return pub;
};/*jslint browser:true*/
/*global Saga */

Saga.Route = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        util = Saga.Util,
        routes = false,
        hash = false,
        hashParts = false,
        baseHash = false,
        hashVars = false,// ? ?
        getHash = function () {
            return window.location.hash.replace("#", "");
        },
        getHashParts = function () {
            var hash = window.location.hash.replace("#", "");
            return hash.split("/");
        },
        hashChange = function (newHash) {
            debug.info("Saga.Route.hashChange('" + newHash + "'), from '" + hash + "'");
            hash = newHash;
            hashParts = getHashParts();
            baseHash = hashParts[0];
            if (routes.hasOwnProperty(baseHash)) {
                routes[baseHash]();
            } else {
                routes['default']();
            }
        },
        init = function (projectRoutes) {
            routes = projectRoutes;
            hash = getHash();
            if (window.hasOwnProperty('onhashchange')) {
                window.onhashchange = function () {
                    hashChange(getHash());
                };
            } else {
                window.setInterval(function () {
                    if (getHash() !== hash) {
                        hashChange(getHash());
                    }
                }, 100);
            }
            hashChange(hash);
        },
        showPage = function (page) {
            debug.info("Saga.Route.showPage('" + page + "')");
            window.location.hash = page;
        };

    pub = {
        init: function (routes) {
            init(routes);
        },
        showPage: function (page) {
            showPage(page);
        }
    };

    util.extend(pub, Saga.Event());

    return pub;
}());/*jslint browser:true*/
/*global Saga */

Saga.LoadManager = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        dom = Saga.Dom,
        u = Saga.Util,
        loader = Saga.net.Loader(),
        loading = false,
        loaded = {},
        stack = [],
        loadCss = function (file, cb) {
            var node = document.createElement("link");
            node.onload = function () {
                if (cb) {
                    cb(node);
                }
            };
            node.setAttribute("rel", "stylesheet");
            node.setAttribute("type", "text/css");
            node.setAttribute("href", file);
        },
        loadImage = function (file, cb) {
            var img = document.createElement('img');
            img.onload = function () {
                if (cb) {
                    cb(img);
                }
            };
            img.src = file;
        },
        loadJs = function (file, cb) {
            var script = document.createElement('script'),
                done = false,
                head = dom.head();
            script.type = "text/javascript";
            script.onload = script.onreadystatechange = function () {
                if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                    done = true;
                    script.onload = script.onreadystatechange = null;

                    if (head && script.parentNode) {
                        head.removeChild(script);
                    }
                    if (cb) {
                        cb(script);
                    }
                }
            };
            script.src = file;
            head.appendChild(script);
            return script;
        },
        loadHtml = function (file, cb) {
            var loadOptions = {
                method: "get",
                url: file,
                success: function (result) {
                    if (cb) {
                        cb(result);
                    }
                }
            };
            loader.execute(loadOptions);
        },
        loadItem = function () {
            if (loading) {
                debug.warn("Saga.LoadManager.loadItem() -> Already loading, waiting...");
                return;
            }

            if (stack.length <= 0) {
                debug.info("Saga.LoadManager.loadItem() -> Stack fully loaded!");
                return;
            }

            loading = true;

            var file,
                ext,
                loadItemDone = function () {
                    stack.shift();
                    loading = false;
                    loadItem();
                };
            debug.info("Saga.LoadManager.loadItem() ->", stack[0]);
            if (u.isFunction(stack[0])) { // callback
                stack[0]();
                loadItemDone();
            } else {
                file = stack[0];
                ext = u.fileExtension(file);
                if (ext === "js" || ext === "jst") {
                    loadJs(file, function (script) {
                        loaded[file] = script;
                        loadItemDone();
                    });
                } else if (ext === "png" || ext === "gif" || ext === "jpg" || ext === "jpeg") {
                    loadImage(file, function (img) {
                        loaded[file] = img;
                        loadItemDone();
                    });
                } else if (ext === "html") {
                    loadHtml(file, function (text) {
                        loaded[file] = text;
                        loadItemDone();
                    });
                } else if (ext === "css") {
                    loadCss(file, function (node) {
                        loaded[file] = node;
                        loadItemDone();
                    });
                }
            }
        },
        load = function (stuff, cb) { // collection of urls
            if (u.isString(stuff)) {
                stack.push(stuff);
            } else {
                u.each(stuff, function (item) {
                    stack.push(item);
                });
            }
            stack.push(cb);
            loadItem();
        };

    pub = {
        load: function () {
            load.apply(this, arguments);
        },
        dir: function () {
            return loaded;
        }
    };
    u.extend(pub, Saga.Event());
    return pub;
}());/*jslint browser:true*/
/*global Saga */

Saga.AssetManager = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        u = Saga.Util,
        dom = Saga.Dom,
        assets = false,
        holders = {},
        loadManager = Saga.LoadManager,
        getHolder = function (name) {
            var holder;
            if (!holders[name]) {
                holders[name] = Saga.Holder(name);
            }
            return holders[name];
        },
        loadAssetDone = function (asset, cb) {
            asset.loadComplete();
            pub.fire(asset.name + ":loaded");
            if (cb) {
                cb();
            }
        },
        loadAsset = function (asset, cb) {
            debug.info("Saga.AssetManager.loadAsset() -> ", asset);
            if (asset.loaded()) {
                loadAssetDone(asset, cb);
                return;
            }

            var stack = asset.loadStack(),
                urls = u.map(stack, function (item) {
                    return item.file;
                });

            loadManager.load(urls, function () {
                u.each(stack, function (item) {
                    item.loaded = true;
                    item.content = loadManager.dir()[item.file];
                });
                loadAssetDone(asset, cb);
            });
        },
        initAssets = function (assets) {
            debug.info("Saga.AssetManager.initAssets() -> ", assets);
            u.each(assets, function (assetInfo, name) {
                u.extend(assetInfo, Saga.Asset(name, assetInfo));
                assetInfo.Holder = getHolder(assetInfo.holder);
            });
            pub.fire("inited");
        },
        init = function (projectAssets, holders) {
            debug.info("Saga.AssetManager.init() -> ", projectAssets);
            if (holders) {
                u.each(holders, function (holder, name) {
                    holders[holder] = getHolder(holder);
                    holders[name] = holders[holder]; // So The holder can be referenced with the given name
                });
            }
            assets = projectAssets;
            initAssets(assets);
        },
        remove = function (asset) {
            debug.info("Saga.AssetManager.remove() -> ", asset);
            try {
                asset.View.remove();
                pub.fire(asset.name + ":removed");
            } catch (err) {
                pub.fire(asset.name + ":removed");
                debug.warn("Saga.AssetManager.remove('" + asset.name + "') -> No REMOVE");
            }
            asset.Js().parentNode.removeChild(asset.Js());
        },
        hide = function (asset, cb) {
            debug.info("Saga.AssetManager.hide() -> ", asset);
            try {
                asset.View.hide(function () {
                    pub.fire(asset.name + ":hidden");
                    remove(asset);
                    if (cb) {
                        cb();
                    }
                });
            } catch (er) {
                pub.fire(asset.name + ":hidden");
                remove(asset);
                if (cb) {
                    cb();
                }
                debug.warn("Saga.AssetManager.place('" + asset.name + "') -> No HIDE");
            }
        },
        place = function (asset) {
            debug.info("Saga.AssetManager.place -> ", asset.name, "in", asset.holder, asset.Holder);
            if (!asset.loaded()) {
                loadAsset(asset, function () {
                    place(asset);
                });
                return;
            }
            if (!asset.Holder) {
                asset.Holder = getHolder(asset.holder);
            }

            asset.Holder.place(asset);
            try {
                asset.View.init();
            } catch (er) {
                debug.warn("Saga.AssetManager.place('" + asset.name + "') -> No INIT");
            }
            pub.fire(asset.name + ":inited");

            try {
                asset.View.show(function () {
                    pub.fire(asset.name + ":shown");
                });
            } catch (err) {
                pub.fire(asset.name + ":shown");
                debug.warn("Saga.AssetManager.place('" + asset.name + "') -> No SHOW");
            }
        },
        show = function (asset) {
            debug.info("Saga.AssetManager.show -> ", asset, asset.Holder);

            if (asset.Holder && asset.Holder.asset()) {
                debug.info("Saga.AssetManager.show -> hiding", asset.Holder.asset());
                hide(asset.Holder.asset(), function () {
                    place(asset);
                });
            } else {
                place(asset);
            }
        };

    pub = {
        init: function (projectAssets) {
            init(projectAssets);
        },
        show: function (asset) {
            show(asset);
        },
        assets: function () {
            return assets;
        }
    };
    u.extend(pub, Saga.Event());
    return pub;
}());/*jslint browser:true*/
/*global Saga, WebFontConfig*/

Saga.FontManager = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        util = Saga.Util,
        fonts = false,
        agent = navigator.userAgent.split(/\s*[;)(]\s*/),
        init = function (projectFonts) {
            fonts = projectFonts;
        },
        load = function (projectFonts) {
            var fontConfig = fonts,
                fontCallbacks = {
                    loading: function () {
                        debug.info("Saga.FontManager.load() -> loading: ");
                    },
                    fontloading: function (fontFamily, fontDescription) {
                        debug.info("Saga.FontManager.load() -> fontloading: ", fontFamily, fontDescription);
                    },
                    fontactive: function (fontFamily, fontDescription) {
                        debug.info("Saga.FontManager.load() -> fontactive: ", fontFamily, fontDescription);
                    },
                    fontinactive: function (fontFamily, fontDescription) {
                        debug.info("Saga.FontManager.load() -> fontinactive: ", fontFamily, fontDescription);
                    },
                    active: function () {
                        debug.info("Saga.FontManager.load() -> active: ");
                        pub.fire("loaded");
                    },
                    inactive: function () {
                        debug.info("Saga.FontManager.load() -> inactive: ");
                    },
                    timeout: 1500
                };
            util.extend(fontConfig, fontCallbacks);

            window.WebFontConfig = fontConfig;

            (function () {
                var wf = document.createElement('script'),
                    s;
                wf.src = ('https:' === document.location.protocol ? 'https' : 'http') + '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
                //wf.src = 'libs/webfont.js';
                wf.type = 'text/javascript';
                wf.async = 'true';
                s = document.getElementsByTagName('script')[0];
                s.parentNode.insertBefore(wf, s);
            }());

        };

    pub = {
        init: function (fonts) {
            init(fonts);
        },
        load: function (fonts) {
            load(fonts);
        }
    };
    util.extend(pub, Saga.Event());
    return pub;
}());/*jslint browser:true*/
/*global Saga */

Saga.Image = function (imageUrl, prefferedId) {
    "use strict";
    var pub,
        util = Saga.Util,
        url = imageUrl,
        img = document.createElement('img'),
        id = prefferedId || util.uniqueId('sagaImg'),
        timeout = 60 * 2,
        loaded = false,
        load = function () {
            img.src = url;
        };

    img.onload = function () {
        loaded = true;
        pub.fire("loaded");
    };

    pub = {
        load: function () {
            load();
        },
        loaded: function () {
            return loaded;
        },
        url: function () {
            return url;
        },
        id: function () {
            return id;
        },
        img: function () {
            return img;
        }
    };

    util.extend(pub, Saga.Event());

    return pub;
};/*jslint browser:true*/
/*global Saga*/

Saga.Keyboard = (function () {
    "use strict";
    var pub,
        debug = Saga.Debug,
        util = Saga.Util,
        usefulKeys = {
            39: "right",
            40: "down",
            37: "left",
            38: "up",
            32: "space",
            13: "enter"
        },
        keyDown = function (evt) {
            debug.info("Saga.Keyboard.keyDown() -> ", evt);
            pub.fire("key:down", evt);
            if (usefulKeys.hasOwnProperty(evt.keyCode)) {
                pub.fire(usefulKeys[evt.keyCode], evt);
                debug.warn("Saga.Keyboard.keyDown() -> usefulKey: ", usefulKeys[evt.keyCode]);
            }
        },
        keyPress = function (evt) {
            debug.info("Saga.Keyboard.keyPress() -> ", evt);
            pub.fire("key:press", evt);
        },
        keyUp = function (evt) {
            debug.info("Saga.Keyboard.keyUp() -> ", evt);
            pub.fire("key:up", evt);
        },
        init = function () {
            debug.info("Saga.Keyboard.init()");
            window.onkeydown = keyDown;
            window.onkeypress = keyPress;
            window.onkeyup = keyUp;
        },
        deinit = function () {
            window.onkeydown = null;
            window.onkeypress = null;
            window.onkeyup = null;
        };

    pub = {
        init: function () {
            init();
        },
        deinit: function () {
            deinit();
        }
    };

    util.extend(pub, Saga.Event());

    return pub;
}());/*jslint browser:true*/
/*global Saga */

/****************************************
** Just some stuff for the Milkman ... **
****************************************/

Saga.List = function (urlJson) {
    "use strict";
    var pub,
        data = false,
        debug = Saga.Debug,
        u = Saga.Util,
        d = Saga.Dom,
        id = u.uniqueId("sl"),
        url = urlJson || false,
        loader = Saga.net.Loader(),
        template = false,
        settings = {
            'keys': false,
            'checkbox': false,
            'checkboxHandler': false,
            'headerHandler': false
        },
        options = {
            'page': 1,
            'totalPages': 1,
            'total': 1,
            'amount': 4,
            'order': 'desc',
            'orderField': ""
        },
        addClick = function (checkbox) {
            checkbox.onclick = function () {};
        },
        addClicks = function () {
            var cbs = u.getByClass(id + 'cb');
            u.each(cbs, function (checkbox) {
                addClick(checkbox);
            });
        },
        getTableTemplate = function () {
            var i = 0,
                l = settings.keys.length,
                tableRow = "",
                compiled;
            template = '<table class="table table-striped">';
            template += '<thead>';
            template += '<tr>';
            if (settings.checkbox) {
                template += '<th><input type="checkbox" id="' + id + 'cb"></th>';
                tableRow += '<td><input type="checkbox" id="' + id + 'cb<%= i %>" class="' + id + 'cb"></td>';
            }
            for (i; i < l; i += 1) {
                template += '<th>' + settings.keys[i] + '</th>';
                tableRow += '<td><%= row.' + settings.keys[i] + ' %></td>';
            }
            template += '</thead>';
            template += '</tr>';
            template += '<tbody>';
            template += '<% var i=0; _.each(rows, function(row){ %>';
            template += '<tr>' + tableRow + '</tr>';
            template += '<% i += 1; }); %>';
            template += '</tbody>';
            template += '</table>';

            compiled = u.template(template);

            return compiled;
        },
        loadComplete = function (result) {
            result = JSON.parse(result);
            if (u.isArray(result)) {
                data = result;
            }
            if (result.hasOwnProperty('page') && result.hasOwnProperty('data')) {
                options.page = parseInt(result.page, 10);
                options.totalPages = parseInt(result.totalPages, 10);
                options.total = parseInt(result.total, 10);
                data = result.data;
            }

            settings.keys = u.keys(data[0]);
            debug.log(settings);

            pub.fire("loaded");
        },
        load = function () {
            debug.log("Saga.List.load() -> ", url);
            if (!url) {
                return;
            }
            loader = new Saga.net.Loader({
                method: "post",
                data: options,
                url: url,
                success: function (result) {
                    if (result.hasOwnProperty('error') || result.hasOwnProperty('errors')) {
                        pub.fire("error");
                        return;
                    }
                    loader = null;
                    loadComplete(result);
                }
            });
            loader.execute();
        };
    pub = {
        load: function () {
            load();
        },
        loadNext: function () {
            load();
        },
        loadPrev: function () {
            load();
        },
        url: function (newVal) {
            if (newVal) {
                url = newVal;
            } else {
                return url;
            }
        },
        data: function () {
            return data;
        },
        hasPrev: function () {

        },
        hasNext: function () {

        },
        totalPages: function () {

        },
        page: function () {

        },
        checkbox: function (hasCb, checkboxHandler) {
            if (hasCb) {
                settings.checkbox = Boolean(hasCb);
                if (hasCb && checkboxHandler) {
                    settings.checkboxHandler = checkboxHandler;
                }
            } else {
                return settings.checkbox;
            }
        },
        select: function (hasSelect, headerHandler) {
        },
        selectedItems: function () {

        },
        template: function (model) {
            return getTableTemplate()(model);
        },
        getTableTemplate: function () {
            return getTableTemplate();
        }
    };
    Saga.Util.extend(pub, Saga.Event());
    return pub;
};

Saga.CountDown = function (time) {
    "use strict";
    var pub,
        u = Saga.Util,
        debug = Saga.Debug,
        timeCountdown = time || false,
        timeLeft = false,
        running = false,
        delay = false,
        date = false,
        getTimeLeft = function () {
            var seconds = timeLeft,
                minutes = Math.floor(seconds / 60),
                hours = Math.floor(minutes / 60),
                days = Math.floor(hours / 24);

            hours = hours - (days * 24);
            minutes = minutes - (days * 24 * 60) - (hours * 60);
            seconds = seconds - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);

            return {
                'days': Math.floor(days),
                'hours': Math.floor(hours),
                'minutes': Math.floor(minutes),
                'seconds': Math.floor(seconds),
                'totalSeconds': timeLeft
            };

        },
        tick = function () {
            timeLeft = timeCountdown - (new Date().getTime() / 1000);
            pub.fire("changed", getTimeLeft());
        },
        interval = function () {
            //debug.info("Saga.CountDown.interval()");
            delay = u.delay(function () {
                tick();
                if (running) {
                    interval();
                }
            }, 1000);
        },
        start = function () {
            debug.info("Saga.CountDown.start()");
            running = true;
            tick();
            interval();
        },
        stop = function () {
            debug.info("Saga.CountDown.stop()");
            clearTimeout(delay);
            running = false;
        };

    date = new Date();
    date.setTime(timeCountdown * 1000);
    debug.info("Saga.CountDown -> End Time : ", date);
    pub = {
        start: function () {
            start();
        },
        stop: function () {
            stop();
        },
        timeLeft: function () {
            getTimeLeft();
        }
    };
    Saga.Util.extend(pub, Saga.Event());
    return pub;
};