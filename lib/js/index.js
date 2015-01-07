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

        if (!vjs) {
            var parent = element.parentNode;
            var wrapper = document.createElement('div');
            wrapper.setAttribute('data-projectorid', pCount);
            wrapper.setAttribute('class', 'projector-wrapper');
            parent.replaceChild(wrapper, element);
            wrapper.appendChild(element);
            this.wrapper = wrapper;
        } else {
            this.wrapper = element.el();
            element.addEventListener = element.on;
            element.projector = this;
        }

        pCount++;


        element.addEventListener("loadedmetadata", function() {
            var h = element.offsetHeight;
            var w = element.offsetWidth;
            that.wrapper.style.height = h+'px';
            that.wrapper.style.width = w+'px';
        });

        element.addEventListener("timeupdate", function() {
            if (element.seeking) {
                that.updateOverlays(true);
            } else {
                that.updateOverlays();
            }
        });
    };

    pInstance.prototype.updateOverlays = function (dirty) {
        /*var curSec = Math.floor(this.element.currentTime);
        if (curSec !== this.lastSecondSeen) {
            this.overlays.forEach(function(overlay) {
                overlay.update(curSec);
            });
        }
        this.lastSecondSeen = curSec;*/
        var that = this;
        var curTime = vjs ? that.element.currentTime() : that.element.currentTime;
        this.overlays.forEach(function(overlay) {
            overlay.update(curTime, dirty);
        });
    };


    pInstance.prototype.addOverlay = function (overlay) {
        this.overlays.push(overlay);
        var div = document.createElement('div');
        div.setAttribute('class', 'projector-overlay');
        div.appendChild(overlay.element);
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

    var Overlay = (function(){
        var exports = {};
        exports.prototype = {};
        exports.prototype.options = {};
        exports.prototype.element = {};
        exports.prototype.init = function(options) {
            this.options = options;
            this.element = this.render();
        };

        exports.prototype.render = function () {
            var div = document.createElement("div");
            div.style.display = 'none';
            if (this.options.class) {
                div.setAttribute('class', this.options.class);
            }
            return div;
        }

        exports.prototype.update = function (curTime, dirty) {
            var that = this;
            dirty = dirty || false;

            this.options.timings.forEach(function (timing) {
                if (!timing.active && curTime >= timing.min && curTime <= timing.max) {
                    timing.beginOverlay(that.element, curTime, dirty);
                    timing.active = true;
                } else if (timing.active && (curTime < timing.min || curTime > timing.max)){
                    timing.endOverlay(that.element, curTime, dirty);
                    timing.active = false;
                }
            });
        }

        exports.create = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        return exports;
    })();

    var TextBox = (function () {
        var exports = {};
        exports.prototype = Object.create(Overlay.prototype);
        exports.prototype.init = function(options) {
            Overlay.prototype.init.apply(this, arguments);
        };

        exports.prototype.render = function() {
            var div = Overlay.prototype.render();
            div.innerHTML = this.options.text;
            return div;
        };

        exports.create = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        return exports;

    })();

    if (vjs) {
        vjs.plugin('projector', Projector.initVjs);
    }

    Projector.Overlay = Overlay;
    Projector.TextBox = TextBox;

    return Projector;

}));
