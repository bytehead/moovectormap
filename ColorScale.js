var ColorScale = new Class({

    Implements: [Options, Events],

    options: {
        colors: []
    },

    initialize: function(options) {
        this.setOptions(options);
    },

    setMin: function(min) {
        this.options.clearMinValue = min;

        if (typeof this.options.normalize === 'function') {
            this.options.minValue = this.options.normalize(min);
        }

        else {
            this.options.minValue = min;
        }
    },

    setMax: function(max) {
        this.options.clearMaxValue = max;

        if (typeof this.options.normalize === 'function') {
            this.options.maxValue = this.options.normalize(max);
        }

        else {
            this.options.maxValue = max;
        }
    },

    setColors: function(colors) {
        for (var i = 0; i < colors.length; i++) {
            colors[i] = ColorScale.rgbToArray(colors[i]);
        }

        this.options.colors = colors;
    },

    setNormalizeFunction: function(f) {
        if (f === 'polynomial') {
            this.options.normalize = function(value) {
                return Math.pow(value, 0.2);
            }
        }

        else if (f === 'linear') {
            delete this.options.normalize;
        }

        else {
            this.options.normalize = f;
        }

        this.setMin(this.options.clearMinValue);
        this.setMax(this.options.clearMaxValue);
    },

    getColor: function(value) {
        var lengths = [];
        var fullLength = 0;
        var color;
        var l;
        var c;
        var i;

        if (typeof this.options.normalize === 'function') {
            value = this.options.normalize(value);
        }

        for (i = 0; i < this.options.colors.length - 1; i++) {
            l = this.vectorLength(this.vectorSubtract(this.options.colors[i + 1], this.options.colors[i]));
            lengths.push(l);
            fullLength += l;
        }

        c = (this.options.maxValue - this.options.minValue) / fullLength;

        for (i = 0; i < lengths.length; i++) {
            lengths[i] *= c;
        }

        i = 0;

        value -= this.options.minValue;

        while (value - lengths[i] >= 0) {
            value -= lengths[i];
            i++;
        }

        if (i == this.options.colors.length - 1) {
            color = this.vectorToNum(this.options.colors[i]).toString(16);
        }

        else {
            color = (
                this.vectorToNum(
                    this.vectorAdd(this.options.colors[i],
                        this.vectorMult(
                            this.vectorSubtract(this.options.colors[i + 1], this.options.colors[i]),
                            (value) / (lengths[i])
                        )
                    )
                )
            ).toString(16);
        }

        while (color.length < 6) {
            color = '0' + color;
        }
        return '#' + color;
    },

    vectorToNum: function(vector) {
        var num = 0;
        
        for (var i = 0; i < vector.length; i++) {
            num += Math.round(vector[i]) * Math.pow(256, vector.length - i - 1);
        }
        
        return num;
    },
    
    vectorSubtract: function(vector1, vector2) {
        var vector = [];
        
        for (var i=0; i<vector1.length; i++) {
            vector[i] = vector1[i] - vector2[i];
        }
        
        return vector;
    },
    
    vectorAdd: function(vector1, vector2) {
        var vector = [];
        
        for (var i=0; i<vector1.length; i++) {
            vector[i] = vector1[i] + vector2[i];
        }
        
        return vector;
    },
    
    vectorMult: function(vector, num) {
        var result = [];
        
        for (var i=0; i<vector.length; i++) {
            result[i] = vector[i] * num;
        }
        
        return result;
    },
    
    vectorLength: function(vector) {
        var result = 0;
        
        for (var i=0; i<vector.length; i++) {
            result += vector[i]*vector[i];
        }
        
        return Math.sqrt(result);
    },
    
    arrayToRgb: function(ar) {
        var rgb = '#';
        var d;
        
        for (var i=0; i<ar.length; i++) {
            d = ar[i].toString(16);
            rgb += d.length == 1 ? '0'+d : d;
        }
        
        return rgb;
    },
    
    rgbToArray: function(rgb) {
        rgb = rgb.substr(1);
        return [parseInt(rgb.substr(0, 2), 16), parseInt(rgb.substr(2, 2), 16), parseInt(rgb.substr(4, 2), 16)];
    }
})