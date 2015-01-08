(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['videojs'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        var videojs = undefined;
        try {
            videojs = require('video.js');
        } catch (e) {}
        module.exports = factory(videojs);
    } else {
        // Browser globals (root is window)
        root.Projector = factory(root.videojs);
    }
}(this, function (vjs) {
    'use strict';

    var pCount = 0;
    var pInstance = function (element, config, vjs) {
        vjs = vjs || false;

        var that = this;

        this.element = element;
        this.config = config;
        this.overlays = [];
        this.vjs = vjs;

        if (!vjs) {
            var parent = element.parentNode;
            var wrapper = document.createElement('div');
            wrapper.setAttribute('data-projectorid', pCount);
            wrapper.setAttribute('class', 'projector-wrapper');
            parent.replaceChild(wrapper, element);
            wrapper.appendChild(element);
            this.wrapper = wrapper;

            element.addEventListener("loadedmetadata", function() {
                var h = element.offsetHeight;
                var w = element.offsetWidth;
                that.wrapper.style.height = h+'px';
                that.wrapper.style.width = w+'px';
            });

        } else {
            this.wrapper = element.el();
            element.addEventListener = element.on;
            element.projector = this;
        }

        element.addEventListener("fullscreenchange", function() {
            var overlays = document.getElementsByClassName('projector-overlay');
            for (var i = 0; i < overlays.length; i++) {
                overlays[i].style.fontSize = that.wrapper.offsetWidth * 0.01+'px';
            }
        });

        element.addEventListener("timeupdate", function() {
            if (element.seeking) {
                that.updateOverlays(true);
            } else {
                that.updateOverlays();
            }
        });

        pCount++;
    };

    pInstance.prototype.updateOverlays = function (dirty) {
        var that = this;
        var curTime = this.getCurrentTime();
        this.overlays.forEach(function(overlay) {
            overlay.update(curTime, dirty);
        });
    };

    pInstance.prototype.setPositionAttributes = function (el, options) {
        ['top', 'right', 'left', 'bottom', 'height', 'width'].forEach(function(attr) {
            if(options[attr]) {
                el.style[attr] = options[attr];
            }
        });
    }

    pInstance.prototype.unwindTimings = function (timings) {
        var that = this;
        var newTimings = [];
        timings.forEach(function (timing) {
            if (timing.timing) {
                var multiTimings = timing.timing.split(',');
                multiTimings.forEach(function (values) {
                    var newTiming = {};
                    var range = values.split('-');
                    newTiming.start = range[0];
                    newTiming.end = range[1];
                    newTiming.beforeBeginOverlay = timing.beforeBeginOverlay;
                    newTiming.afterBeginOverlay = timing.afterBeginOverlay;
                    newTiming.beforeEndOverlay = timing.beforeEndOverlay;
                    newTiming.afterEndOverlay = timing.afterEndOverlay;
                    newTimings.push(newTiming);
                });
            } else {
                newTimings.push(timing);
            }
        });

        return newTimings;
    }


    pInstance.prototype.getCurrentTime = function () {
        return this.vjs ? this.element.currentTime() : this.element.currentTime;
    }

    pInstance.prototype.addOverlay = function (overlay, options) {
        var that = this;
        var div = document.createElement('div');
        div.setAttribute('class', 'projector-overlay');

        options.cover = options.cover === undefined ? true : options.cover;
        if (options.cover) {
            div.setAttribute('class', 'projector-overlay projector-overlay-cover');
            this.setPositionAttributes(overlay.el, options)
        } else {
            this.setPositionAttributes(div, options)
        }

        div.appendChild(overlay.el);
        div.style.fontSize = this.wrapper.offsetWidth * 0.01+'px';
        overlay.wrapper = div;


        overlay.__timings = this.unwindTimings(options.timings);



        overlay.__timings.forEach(function (timing) {
            ['min', 'max'].forEach(function(boundary) {
                if (typeof timing[boundary] === 'string') {
                    that.element.addEventListener(timing[boundary], function() {
                        var curTime = that.getCurrentTime();
                        boundary === 'min' ? overlay.runBeginOverlay(timing, curTime, false) : overlay.runEndOverlay(timing, curTime, false);
                    });
                }
            });
        });

        this.overlays.push(overlay);
        this.wrapper.insertBefore(div, this.wrapper.childNodes[0]);
    };

    var Projector = {
        VERSION: '0.0.1',
        init: function (element, options) {
            return new pInstance(element, options);
        },
        initVjs: function (options) {
            return new pInstance(this, options, true);
        }
    };

    var runFunc = function () {
        var args = Array.prototype.slice.call(arguments);
        args.shift();
        if (typeof(arguments[0]) == "function") {
            arguments[0].apply(this, args);
        }
    };

    var Overlay = (function(){
        var exports = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        exports.prototype = {};
        exports.prototype.options = {};
        exports.prototype.element = {};
        exports.prototype.class = '';
        exports.prototype.init = function(options) {
            this.options = options || {};
            this.options.attr = this.options.attr || {};
            this.el = this.render();
        };

        exports.prototype.render = function () {
            var that = this;
            var div = document.createElement("div");
            div.style.display = 'none';
            div.setAttribute('class', that.class+' projector-overlay-item');
            for (var key in this.options.attr) {
                if (key === 'class') {
                    div.setAttribute(key, that.class ? that.class+' '+this.options.attr[key] : this.options.attr[key]);
                } else {
                    div.setAttribute(key, this.options.attr[key]);
                }
            }
            return div;
        }

        exports.prototype.runBeginOverlay = function (timing, curTime, dirty) {
            runFunc(timing.beforeBeginOverlay, this, curTime, dirty);
            this.beginOverlay();
            runFunc(timing.afterBeginOverlay, this, curTime, dirty);
            timing.active = true;
        }

        exports.prototype.runEndOverlay = function (timing, curTime, dirty) {
            runFunc(timing.beforeEndOverlay, this, curTime, dirty);
            this.endOverlay();
            runFunc(timing.afterEndOverlay, this, curTime, dirty);
            timing.active = false;
        }

        exports.prototype.beginOverlay = function () {
            this.el.style.display = 'block';
        }

        exports.prototype.endOverlay = function () {
            this.el.style.display = 'none';
        }

        exports.prototype.update = function (curTime, dirty) {
            var that = this;
            dirty = dirty || false;

            this.__timings.forEach(function (timing) {
                if (!timing.active && ((curTime >= timing.start && curTime <= timing.end) || (curTime >= timing.start && timing.end === undefined))) {
                    that.runBeginOverlay(timing, curTime, dirty);
                } else if (timing.active && (curTime < timing.start || curTime > timing.end)){
                    that.runEndOverlay(timing, curTime, dirty);
                }
            });
        };

        return exports;
    })();

    var TextBox = (function () {
        var exports = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        exports.prototype = Object.create(Overlay.prototype);
        exports.prototype.class = 'projector-textbox';
        exports.prototype.init = function() {
            Overlay.prototype.init.apply(this, arguments);
        };

        exports.prototype.render = function() {
            var div = Overlay.prototype.render.call(this);
            div.innerHTML = this.options.text;
            return div;
        };

        return exports;
    })();

    var HTMLBox = (function () {
        var exports = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        exports.prototype = Object.create(Overlay.prototype);
        exports.prototype.init = function() {
            Overlay.prototype.init.apply(this, arguments);
        };

        exports.prototype.render = function() {
            var div = Overlay.prototype.render.call(this);
            div.innerHTML = this.options.html;
            return div;
        };

        return exports;
    })();

    if (vjs) {
        vjs.plugin('projector', Projector.initVjs);
    }

    Projector.Overlay = Overlay;
    Projector.TextBox = TextBox;
    Projector.HTMLBox = HTMLBox;

    return Projector;

}));
