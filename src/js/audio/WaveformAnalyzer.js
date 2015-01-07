'use strict';

var EventEmitter = require('../core/EventEmitter.js');

var WaveformAnalyzer = EventEmitter.extend({
    constructor: function (context) {
        this.audioContext = context;

        this.buffer = null;
        this.loaded = false;
        this.data = [];

        this.init();
    }
});

WaveformAnalyzer.prototype.init = function(){

};

WaveformAnalyzer.prototype.load = function(src) {
    var request = new XMLHttpRequest();

    this.src = src;

    request.open('GET', this.src, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        this.audioContext.decodeAudioData(
            request.response,
            function(buffer) {
                this.loadBuffer(buffer);
            }.bind(this),
            function(e){
                alert(e);
            }
        );
    }.bind(this);

    request.send();
};

WaveformAnalyzer.prototype.loadBuffer = function(buffer) {
    this.buffer = buffer;
    this.loaded = true;
    this.emit('load');
};

WaveformAnalyzer.prototype.getData = function(bars) {
    if (!this.buffer) return [];

    var i, j, c, start, end, max, val, values,
        size = this.buffer.length / bars,
        step = ~~(size / 10) || 1,
        data = new Float32Array(bars),
        channels = this.buffer.numberOfChannels;

    // Process each channel
    for (c = 0; c < channels; c++) {
        values = this.buffer.getChannelData(c);

        // Process each bar
        for (i = 0; i < bars; i++) {
            start = ~~(i * size);
            end = ~~(start + size);
            max = 0;

            // Find max value within range
            for (j = start; j < end; j += step) {
                val = values[j];
                if (val > max) {
                    max = val;
                }
                else if (-val > max) {
                    max = -val;
                }
            }
            if (c == 0 || max > data[i]) {
                data[i] = max;
            }
        }
    }

    return data;
};

module.exports = WaveformAnalyzer;