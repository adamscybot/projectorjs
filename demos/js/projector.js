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

    // The projector instance attached to a single video element.
    var pInstance = function (element, options, vjs) {
        vjs = vjs || false;

        var that = this;

        this.element = element;
        this.coptions = options;
        this.overlays = [];
        this.vjs = vjs;

        if (!vjs) {
            // If not videojs, create wrapper for video in dom.
            var parent = element.parentNode;
            var wrapper = document.createElement('div');
            wrapper.setAttribute('data-projectorid', pCount);
            wrapper.setAttribute('class', 'projector-wrapper');
            parent.replaceChild(wrapper, element);
            wrapper.appendChild(element);
            this.wrapper = wrapper;

            // Set width and height of wrapper according to video.
            element.addEventListener("loadedmetadata", function() {
                var h = element.offsetHeight;
                var w = element.offsetWidth;
                that.wrapper.style.height = h+'px';
                that.wrapper.style.width = w+'px';
            });

        } else {
            // Not videojs? Just get the wrapper vjs put in.
            this.wrapper = element.el();

            // Videojs triggers its even via the on method.
            element.addEventListener = element.on;

            element.projector = this;
        }


        // Add overlays already defined in options
        if (options.overlays) {
            options.overlays.forEach(function (overlayDefintion) {
                var overlay = overlayDefintion.overlay;
                that.addOverlay(overlayDefintion.overlay, overlayDefintion);
            });
        }

        // When size of player changes, we should set the font size as 1% of width.
        // TODO: Detect video size change beyond full screen.
        element.addEventListener("fullscreenchange", function() {
            var overlays = document.getElementsByClassName('projector-overlay');
            for (var i = 0; i < overlays.length; i++) {
                overlays[i].style.fontSize = that.wrapper.offsetWidth * 0.01+'px';
            }
        });

        // Each time the time updates, we need to tell the overlays.
        element.addEventListener("timeupdate", function() {
            // If the element is seeking, we pass a "dirty" flag.
            // E.g. A user may want to show/hide an overlay without an
            // animation if the user seeked straight in.
            if (that.getSeeking()) {
                that.updateOverlays(true);
            } else {
                that.updateOverlays();
            }
        });

        pCount++;
    };

    // Notifies each overlay that the time has been updated.
    pInstance.prototype.updateOverlays = function (dirty) {
        var that = this;
        var curTime = this.getCurrentTime();
        this.overlays.forEach(function(overlay) {
            overlay.update(curTime, dirty);
        });
    };

    // Set size and position of an element according to available options
    pInstance.prototype.setPositionAttributes = function (el, options) {
        ['top', 'right', 'left', 'bottom', 'height', 'width'].forEach(function(attr) {
            if(options[attr]) {
                el.style[attr] = options[attr];
            }
        });
    }

    // Parse timings in shorthand form, e.g. 1-10,45-60
    // and then create individual timing objects for each range.
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

    // Get the current time elapsed
    pInstance.prototype.getCurrentTime = function () {
        return this.vjs ? this.element.currentTime() : this.element.currentTime;
    }

    // Get the current seeking status
    pInstance.prototype.getSeeking = function () {
        return this.vjs ? this.element.seeking() : this.element.seeking;
    }


    // Add an overlay to the video
    pInstance.prototype.addOverlay = function (overlay, options) {
        var that = this;
        var div = document.createElement('div');
        div.setAttribute('class', 'projector-overlay');


        this.setPositionAttributes(div, options);

        // Each overlay has its own wrapper.
        div.appendChild(overlay.el);
        div.style.fontSize = this.wrapper.offsetWidth * 0.01+'px';
        overlay.wrapper = div;

        // Unwind timings
        overlay.__timings = this.unwindTimings(options.timings);


        // Allow user to specify player events for start and end values.
        overlay.__timings.forEach(function (timing) {
            ['start', 'end'].forEach(function(boundary) {
                if (typeof timing[boundary] === 'string') {
                    that.element.addEventListener(timing[boundary], function() {
                        var curTime = that.getCurrentTime();
                        boundary === 'start' ? overlay.__runBeginOverlay(timing, curTime, false) : overlay.__runEndOverlay(timing, curTime, false);
                    });
                }
            });
        });

        // Add overlay to list of overlays attached to this video.
        this.overlays.push(overlay);

        // Insert the overlay into DOM
        this.wrapper.insertBefore(div, this.wrapper.childNodes[0]);

        return this;
    };

    // Run a function only if target is actually a function.
    var runFunc = function () {
        var args = Array.prototype.slice.call(arguments);
        args.shift();
        if (typeof(arguments[0]) == "function") {
            arguments[0].apply(this, args);
        }
    };

    // Base overlay class. All other overlays should extend from this and call
    // these methods before doing their own work.
    var Overlay = (function(){
        var exports = function(options) {
            var ret = Object.create(exports.prototype);
            ret.init(options);
            return ret;
        };

        exports.prototype = {};
        exports.prototype.options = {};
        exports.prototype.element = undefined;
        exports.prototype.class = '';
        exports.prototype.init = function(options) {
            this.options = options || {};
            this.options.attrs = this.options.attrs || {};
            this.el = this.render();
            return this;
        };

        // Builds the overlay DOM
        exports.prototype.render = function () {
            var that = this;
            var div = document.createElement("div");
            div.style.display = 'none';
            div.setAttribute('class', that.class+' projector-overlay-item');

            // Allow user to set attributes in options object.
            // Copy them over to style object here.
            for (var key in this.options.attrs) {
                if (key === 'class') {
                    div.setAttribute(key, that.class ? that.class+' '+this.options.attrs[key] : this.options.attrs[key]);
                } else {
                    div.setAttribute(key, this.options.attrs[key]);
                }
            }
            return div;
        }

        // Check if the overlay is currently active
        exports.prototype.isActive = function (timing, curTime, dirty) {
            return this.__timings.some(function(timing) {
                return timing.active === true;
            });
        }


        // Triggers the userland functions to start overlay.
        // Run the overlays start overlay logic.
        exports.prototype.__runBeginOverlay = function (timing, curTime, dirty) {
            var that = this;
            runFunc(timing.beforeBeginOverlay, this, curTime, dirty);
            this.beginOverlay(function() {
                runFunc(timing.afterBeginOverlay, that, curTime, dirty);
            }, curTime, dirty);

            timing.active = true;
        }

        // Triggers the userland functions to end overlay.
        // Run the overlays end overlay logic.
        exports.prototype.__runEndOverlay = function (timing, curTime, dirty) {
            var that = this;
            runFunc(timing.beforeEndOverlay, this, curTime, dirty);
            this.endOverlay(function() {
                runFunc(timing.afterEndOverlay, that, curTime, dirty);
            }, curTime, dirty);
            timing.active = false;
        }

        // The function that executes when the overlay starts.
        // DOM should be edited here.
        exports.prototype.beginOverlay = function (cb, curTime, dirty) {
            this.el.style.display = 'block';
            cb();
        }

        // The function that executes when the overlay ends.
        // DOM should be edited here.
        exports.prototype.endOverlay = function (cb, curTime, dirty) {
            this.el.style.display = 'none';
            cb();
        }

        // The function that decides if the overlay should be started or ended.
        exports.prototype.update = function (curTime, dirty) {
            var that = this;

            dirty = dirty || false;

            this.__timings.forEach(function (timing) {
                if (!timing.active && ((curTime >= timing.start && curTime <= timing.end) || (curTime >= timing.start && timing.end === undefined))) {
                    that.__runBeginOverlay(timing, curTime, dirty);
                } else if (timing.active && (curTime < timing.start || curTime > timing.end)){
                    that.__runEndOverlay(timing, curTime, dirty);
                }
            });
        };

        return exports;
    })();

    // Built in textbox overlay.
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

    // Built in HTML box overlay.
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

    // The primary export of the module. Provides init functions.
    var Projector = {
        VERSION: '0.1.0',
        // Given an element or ID, create a new projector instance.
        init: function (element, options) {
            if (typeof element === "string") {
                element = document.getElementById(element);
            }
            return new pInstance(element, options);
        },
        // Create a new projector instance on top of a videojs instance.
        initVjs: function (options) {
            this.projector = new pInstance(this, options, true);
            return this.projector;
        }
    };

    // Register as videojs plugin
    if (vjs) {
        vjs.plugin('projector', Projector.initVjs);
    }

    Projector.Overlay = Overlay;
    Projector.TextBox = TextBox;
    Projector.HTMLBox = HTMLBox;

    return Projector;

}));
