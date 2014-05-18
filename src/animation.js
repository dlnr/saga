/*jslint browser:true*/
/*global Saga*/

Saga.Animation = (function () {
    "use strict";
    var pub,
        u = Saga.Util,
        debug = Saga.Debug,
        animations = [],
        animationCore,
        transitionTypes = ['-webkit-transition', '-moz-transition', '-o-transition', '-ms-transition', 'transition'],
        transformTypes = ['-webkit-transform', '-moz-transform', '-o-transform', '-ms-transform', 'transform'],
        transformTemplate = "",
        transformProperties = [
            "none",
            "matrix",
            "matrix3d",
            "translate",
            "translate3d",
            "matrix",
            "matrix3d",
            "translate",
            "translate3d",
            "translateX",
            "translateY",
            "translateZ",
            "scale",
            "scale3d",
            "scaleX",
            "scaleY",
            "scaleZ",
            "rotate",
            "rotate3d",
            "rotateX",
            "rotateY",
            "rotateZ",
            "skew",
            "skewX",
            "skewY",
            "perspective",
            "initial",
            "inherit"
        ],
        toCamelCase = function (str) {
            if (str.charAt(0) === "-") {
                return str;
            }
            var nr = 0,
                parts = str.split("-"),
                newParts = u.map(parts, function (part) {
                    if (nr === 0) {
                        nr += 1;
                        return part;
                    }
                    if (part === "") { // troubles, check for starting with - ?? mayb <- it fuckes le transform , grrr
                        debug.warn("Something is starting with a -");
                    }
                    return part.charAt(0).toUpperCase() + part.slice(1);
                });
            return newParts.join("");
        },
        transitionEnd = function () {
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
                        return transEndEventNames[name];
                    }
                }
            }
            return false;
        },
        transitionStyles = function (props) {
            var types = ['-webkit-transition', '-moz-transition', '-o-transition', '-ms-transition', 'transition'],
                transforms = ['-webkit-transform', '-moz-transform', '-o-transform', '-ms-transform', 'transform'],
                styles = {},
                values;
            u.each(types, function (type, index) {
                values = [];
                u.each(props, function (val, prop) {
                    if (prop === "transform") {
                        prop = transforms[index];
                    }
                    values.push(prop + " " + val);
                });
                styles[type] = values.join(", ");
            });
            return styles;
        },


        transformStyles = function (props, elem) {
            var transformStyles = {},
                styles = {},
                //prevTransform = {},
                tmp;

            if (elem) { //&& elem.hasOwnProperty("style") && elem.style.hasOwnProperty("transform")) {
                //debug.error("tStyles elem: ", elem, elem.style.transform);
                if (elem.style.transform !== "") {
                    u.each(elem.style.transform.split(" "), function (val) {
                        tmp = val.split("(");
                        //debug.warn("tmp", tmp);
                        transformStyles[tmp[0]] = val;
                    });
                }
            }
            //debug.error("1", transformStyles);
            // need previous string!!!!
            /*
            if (!props.hasOwnProperty("translate3d")) { // force 3d // wont work!, its a string in the value!!
                props.translate3d = "0, 0, 0";
            }
            */
            u.each(props, function (val, prop) {
                if (transformProperties.hasOwnProperty(prop)) {
                    //transformStyles.push(prop + "(" + val + ")");
                    transformStyles[prop] = prop + "(" + val + ")";
                } else {
                    styles[toCamelCase(prop)] = val;
                }
            });
            //debug.error("2", transformStyles);
            transformStyles = u.toArray(transformStyles).join(" ");
            //debug.error("3", transformStyles);
            u.each(transformTypes, function (type) {
                styles[type] = transformStyles;
            });
            return styles;
        },
        setStyles = function (elem, obj, obj2, obj3, obj4) { /// ugly -> rewrite to check arguments, but i need it njouw
            var styles = obj || {};
            if (obj2) {
                u.extend(styles, obj2);
            }
            if (obj3) {
                u.extend(styles, obj3);
            }
            if (obj4) {
                u.extend(styles, obj4);
            }

            styles = transformStyles(styles, elem);
            debug.info("Saga.Dom.setStyles() -> Applying: ", elem, styles);
            u.each(styles, function (value, style) {

                elem.style[style] = value;
                debug.info("Saga.Dom.setStyles() -> Applying: ", style, " -> ", value, elem.style[style]);
            });
        },
        animationCss3 = function () {
            var pub,
                tEnd = transitionEnd(),
                set = function (elem, props) {
                    debug.warn("set", elem, props);
                    setStyles(elem, props);
                },
                to = function (elem, props, time, cb) {
                    debug.warn("to", elem, props, time);
                    /*
                    -webkit-transition: width 2s, height 2s,-webkit-transform 2s;  // For Safari 3.1 to 6.0 
                    transition: width 2s, height 2s, transform 2s;
                    */
                    var transStyles = {},
                        tEndListener;
                    u.each(props, function (val, prop) {
                        if (transformProperties.hasOwnProperty(prop)) {
                            prop = "transform";
                        }
                        transStyles[prop] = time + "ms";
                    });

                    transStyles = transitionStyles(transStyles);
                    setStyles(elem, transStyles);

                    if (cb) {
                        tEndListener = function (evt) {
                            elem.removeEventListener(tEnd, tEndListener);
                            cb();
                        };
                        if (tEnd) {
                            elem.addEventListener(tEnd, tEndListener);
                        } else {
                            cb();
                        }
                    }
                    u.defer(function () {
                        setStyles(elem, props);
                    });

                    /*
                    
                    if (transitionEvts) {
                        logoContainer.addEventListener(transitionEvts.end, function (something) {
                            debug.log("App.Manager.initComplete() -> Animation End ", something, logoContainer, transitionEvts.end);
                            if (ended === 0) {
                                if (cb) {
                                    cb();
                                    cb = null;
                                }
                            }
                            ended += 1;
                        });
                    } else {
                        if (cb) {
                            cb();
                            cb = null;
                        }
                    }
                    d.setStyles(logoContainer, transform);
                }, 100);
                    */


                    /*
                    var newS = u.object(u.map(props, function (value, prop) {
                            return [prop, time + "ms"];
                        })),
                        transStyles = transitionStyles(newS);

                    debug.log(newS, transStyles);

                    setStyles(elem, transStyles);
                    u.defer(function () {
                        setStyles(elem, props);
                    });
                    */

                    /*
                    we get 
                    props:
                    {
                        'margin-top':"auto",
                        'width':"100px"
                    }
                    
                    time: 100 (ms)
                    
                    function needs : 
                    {
                        transform: "1s",
                        opacity: "0.4s",
                        'margin-top': "0.5s"
                    }
                    
                    */

                    // chec for transform styles
                    /*
                    debug.warn("to: ", props);
                    var newS = u.object(u.map(props, function (value, prop) {
                            return [prop, time + "ms"];
                        })),
                        transStyles = transitionStyles(newS);

                    debug.warn("to", elem, newS, transStyles, transformStyles(props));
                    set(elem, newS);
                    */
                    /*
                    u.delay(function () {
                        setStyles(elem, transformStyles({
                            scale: 2
                        }));
                    }, 10);
                    */
                };

            pub = {
                set: function (elem, props, time, cb) {
                    set(elem, props, time, cb);
                },
                to: function (elem, props, time, cb) {
                    to(elem, props, time, cb);
                }
            };

            return pub;
        };

    /*
    u.each(transformTypes, function (type) {
        transformTemplate[type]="[TRANSFORM]";
    });
    //debug.warn(template);
    transformTemplate = u.template(transformTemplate);
*/

    transformProperties = u.object(transformProperties, transformProperties);
    animationCore = animationCss3();

    pub = {
        /*
        gen: function (elem, styles) {
            return animationCss3(elem, styles);
        }
        */
        set: function () {
            //animationCore.set();
            animationCore.set.apply(this, arguments);
        },
        to: function () {
            animationCore.to.apply(this, arguments);
        }
    };

    return pub;
}());