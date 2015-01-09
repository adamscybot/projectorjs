---
layout: index
---
# Projector.js

A small no-dependencies JavaScript library that enables the display of overlays on native HTML5 video elements, or (optionally) video elements powered by [videojs](https://github.com/videojs/video.js/). Overlays can be triggered via time ranges or events. A set of useful overlays is (WIP) included to cover common use cases.

## Getting Started

### Raw browser

You need to include both the javascript and css files from the project. Both of these are located in the dist directory.

```html
<head>
    <script src="projector.min.js"></script>
    <link rel="stylesheet" type="text/css" href="../dist/css/projector-js.min.css">
</head>
<body>
    <video id="video" controls>
        <source src="video.webm" type="video/webm">
    </video>
    <script>
    var v = Projector.init('video');
    v.addOverlay(
        Projector.TextBox({text: "Hello"}),
        {
            top: '50%',
            left: '50%',
            timings: [
                {
                    timing:'0-10,15-20'
                }
            ]
        }
    )
    </script>
</body>
```

Or you can use projector.js with videojs:

```html
<head>
    <script src="video.js"></script>
    <link href="video-js.css" rel="stylesheet">
    <script src="projector.min.js"></script>
    <link rel="stylesheet" type="text/css" href="../dist/css/projector-js.min.css">
</head>
<body>
    <video id="videojs-test" controls>
        <source src="video.webm" type="video/webm">
    </video>
    <script>
    var v = videojs("videojs-test").projector();
    v.addOverlay(
        Projector.TextBox({text: "Hello"}),
        {
            top: '50%',
            left: '50%',
            timings: [
                {
                    start: 5,
                    end: 10
                },
                {
                    start: 15,
                    end: 20
                }
            ]
        }
    );
    </script>
</body>


```

### Other require libs

Projector.js uses the [UMD](https://github.com/umdjs/umd) pattern and so should work with both [require.js](https://github.com/jrburke/requirejs) and [browserify](https://github.com/substack/node-browserify).

## Considerations

### Overlays block clicks

A common issue with video overlays is that one overlay blocks events from hitting other overlays that are underneath. E.g, you have 2 overlays that both provide user input, but because one is on top, the other is not accessible.

Projector.js attempts to counter this by assigning the [```pointer-events: none;```](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events) CSS property to overlay wrappers (```.projector-overlay```). This allows child elements to be clickable, but the containing overlay div (which covers the whole video) allows events to "pass-through." However, this is a new property and support is limited on older browsers. It is of note that it is unsupported on < IE11.

A good way to avoid this issue is to keep all individual elements on a separate overlay. I.e. avoid having 2 separate divs in a single overlay. This would cause the overlay container to stretch to fit both, introducing transparent white space which would block clicks if on a browser that does not support pointer-events.

### Scaling up videos

It is important to use percentage values for dimensions/margins/paddings if you want your overlay to scale up if the video size changes (I.e. full screen).

Projector.js sets the font-size of the overlay wrappers to 1% of the width of the video. This should allow you to use em or percentage values for font-size. You could also use [viewport units](http://caniuse.com/#feat=viewport-units) if you don't care about older browsers.

### Sub-second accuracy

Different browsers report the time elapsed at different intervals. This unfortunately limits the use of milliseconds. Projector.js does not currently support milliseconds, but is being considered for inclusion in the library via setTimeout() hacks. Regardless, **exact** precision is not easily achievable and is out of scope.

### Dirty triggers

Projector.js ensures your overlay is active between the user-specified times. Consequentially, as the users elapsed video time breaches a user specified time period, the relevant overlay is triggered to be active.

However, the user may have seeked directly into this time period, and not naturally watched the video in real time. For this reason, callbacks such as `beforeBeginOverlay` are passed a "dirty" flag when the user has seeked into one of the specified time ranges. This allows the developer to disable certain affects when the player is used in this way, e.g. fade in animations.

## Core API

### Projector object

The projector object provides the intialization function to allow projectorjs to attach to your video element.

#### init(element, [options])
Type: `function`  
Arguments: `element<string|HTMLElement>`, `options<object>`  
Returns: `pInstance`

##### options

Instead of using the `addOverlay` function of a `pInstance`, you can use the shorthand method to specify all of your overlays in the initial options object. Please see the  [`addOverlay`](#addOverlay)  documentation for full description of options.


```javascript
var p = Projector.init(document.getElementById('video'), {
    overlays: [
        {
            overlay: Projector.TextBox({text: "Test"}),
            left:'40%',
            top: '50%',
            timings: [
                {
                    timing: '8-14'
                }
            ]
        }
    ]
});

// Add more overlays programmatically
p.addOverlay(...)
```

Init can also be called via video.js intialization.

```javascript
var p = videojs("video").projector({
    // Options
    ...
});

// Add more overlays programmatically
p.addOverlay(...)
```

### pInstance object

The pInstance (projector instance) object is attached to a single HTML or videojs video element. It exposes functions to attach overlays.

#### addOverlay
Type: `function`  
Arguments: `overlay<Overlay>`, `options<object>`  
Returns: `pInstance`

Attach an overlay object (see [Bundled overlays](#bundled-overlays)) with the given options.

##### Options

###### left
Type: `string`  
Default: `undefined` (effectively auto)

The position of the overlay relative to the left boundary. Include units.

###### right
Type: `string`  
Default: `undefined` (effectively auto)

The position of the overlay relative to the right boundary. Include units.

###### top
Type: `string`  
Default: `undefined` (effectively auto)

The position of the overlay relative to the top boundary. Include units.

###### bottom
Type: `string`  
Default: `undefined` (effectively auto)

The position of the overlay relative to the bottom boundary. Include units.

###### height
Type: `string`  
Default: `undefined` (effectively auto)

The width of the overlay. Include units.

###### width
Type: `string`  
Default: `undefined`

The height of the overlay. Include units.

###### timings
Type: `array<timings>`  
Default: `[]`

An array of timing singleton objects. See [Timing object](#timing-object).

### Timing object

A user-provided singleton object passed as part of the options for `Projector.init` or `pInstance.addOverlay`.

#### timing
Type: `string`  
Default: `undefined`  
Example: `"3-6,6-10,20"`

A shorthand string representing time periods for the start and end of overlays. This string is a comma separated list of

* min/max integer ranges (seconds) delimited by hyphens.
* or singular integers (seconds).

If a single integer 'x' is specified, this is processed as a timing that starts at 'x' seconds, with no end.

Overrides start and end values if set.

#### start
Type: `integer|string`  
Default: `undefined`

The number of seconds elapsed upon which the overlay starts. Alternatively, an event name such as play or pause. Any event fired on the video element (native or videojs) works.

#### end
Type: `integer|string`  
Default: `undefined`

The number of seconds elapsed upon which the overlay ends. Alternatively, an event name such as play or pause. Any event fired on the video element (native or videojs) works.


#### beforeBeginOverlay
Type: `function`  
Default: `undefined`  
Arguments: `overlay<Overlay>`, `currentTime<integer>`, `dirtyTrigger<boolean>`

A callback called before the overlay begins. This function is passed the overlay object, the current time elapsed and a "dirty trigger flag" (see [Dirty triggers](#dirty-triggers)).

#### afterBeginOverlay
Type: `function`  
Default: `undefined`  
Arguments: `overlay<Overlay>`, `currentTime<integer>`, `dirtyTrigger<boolean>`

A callback called after the overlay begins. This function is passed the overlay object, the current time elapsed and a "dirty trigger flag" (see [Dirty triggers](#dirty-triggers)).

#### beforeEndOverlay
Type: `function`  
Default: `undefined`  
Arguments: `overlay<Overlay>`, `currentTime<integer>`, `dirtyTrigger<boolean>`

A callback called before the overlay ends. This function is passed the overlay object, the current time elapsed and a "dirty trigger flag" (see [Dirty triggers](#dirty-triggers)).

#### afterEndOverlay
Type: `function`  
Default: `undefined`  
Arguments: `overlay<Overlay>`, `currentTime<integer>`, `dirtyTrigger<boolean>`

A callback called after the overlay ends. This function is passed the overlay object, the current time elapsed and a "dirty trigger flag" (see [Dirty triggers](#dirty-triggers)).


### Overlay object

The overlay object represents the overlay itself. [Built in overlays](#bundled-overlays) and custom overlays extend this object.

#### init
Type: `function`
Arguments: `options<Object>`  
Returns: `boolean`

Sets up the overlay. No need to call manually as is invoked upon overlay creation.

```javascript
// Creates overlay, calls init, and returns overlay object
var o = Projector.TextBox();
```

##### Options

###### attrs
Type: `object`

A set of attributes that you wish to be copied over to the styles of the overlay.

```javascript
// Creates overlay, calls init, and returns overlay object
var o = Projector.TextBox({
    attrs: {
        class: 'custom-class',
        id: 'custom-id'
    }
});
```
#### render
Type: `function`  
Return: `HTMLElement`

Builds and returns the DOM element representing the overlay. Override in custom overlays.

#### beginOverlay
Type: `function`  
Arguments: `cb<function>`, `curTime<integer>`, `dirty<boolean>`

Main function to trigger the overlay "on". Default is to unhide DOM element. Override in custom overlays. Execute the callback when done.

#### endOverlay
Type: `function`  
Arguments: `cb<function>`, `curTime<integer>`, `dirty<boolean>`

Main function to trigger the overlay "off". Default is to hide DOM element. Override in custom overlays. Execute the callback when done.

#### update
Type: `function`
Arguments: `curTime<integer>`, `dirty<boolean>`

Given an elapsed time in seconds and the dirty flag (see [Dirty triggers](#dirty-triggers)), check if the overlay should show (according to passed elapsed time). Can override in custom overlays if you wish to trigger your overlay on more complicated logic than time ranges. This function is called each time the "timeupdate" event is triggered on the video.

#### isActive
Type: `function`  
Returns: `boolean`

Returns true if the overlay is in an active state.


#### element
Type: `HTMLElement`

The HTMLElement representing the overlay.

#### class
Type: `string`

The default class of an overlay. Override in custom overlays.


## Bundled overlays

Projector.js comes with some bundled overlays to cover the most common use cases (WIP).

### Projector.TextBox(options)

#### Options

#####text
Type: `string`

The text to display in the text box.

### Projector.HTMLBox(options)

#### Options

##### html
Type: `string|HTMLElement`

The text to display in the text box.


## Building overlays

Extend the `Projector.Overlay` object. Always call the super function within each method unless you know what you are doing. This example creates a text box overlay that fades in:

```javascript
var TextBox = (function () {
    var exports = function(options) {
        var ret = Object.create(exports.prototype);
        ret.init(options);
        return ret;
    };

    exports.prototype = Object.create(Overlay.prototype);
    exports.prototype.class = 'projector-textbox-fade';
    exports.prototype.init = function() {
        Overlay.prototype.init.apply(this, arguments);
    };

    exports.prototype.beginOverlay = function(cb) {
        Overlay.prototype.beginOverlay.apply(this, arguments);
        $(this.element).fadeIn();
    };

    exports.prototype.endOverlay = function(cb) {
        Overlay.prototype.endOverlay.apply(this, arguments);
        $(this.element).fadeOut();
    };

    exports.prototype.render = function() {
        var div = Overlay.prototype.render.call(this);
        div.innerHTML = this.options.text;
        return div;
    };

    return exports;
})();
```

## Build

To build, use [gulp](https://github.com/gulpjs/gulp/) and simply run `gulp` in the project root.

## Release History
- 0.1.0: Initial release
