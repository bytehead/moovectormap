/*
---
name: MooVectorMap
description: 
authors: David Greminger
requires: []
provides: MooVectorMap
...
*/

var MooVectorMap = new Class({
    
    Implements: [Options, Events],
    
    options: {
        map: 'world_en',
        fileExtension: '.json',
        backgroundColor: '#505050',
        color: '#fff',
        hoverColor: '#000',
        scaleColor: ['#b6d6ff', '#005ace'],
        normalizeFunction: 'linear',
        strokeColor: '#000',
        strokeWidth: 0.5,
        showZoom: true
    },
    
    apiParams: {
        colors: 1,
        values: 1,
        backgroundColor: 1,
        scaleColors: 1,
        normalizeFunction: 1
    },
    
    apiEvents: {
        onLabelShow: 'labelShow',
        onRegionOver: 'regionOver',
        onRegionOut: 'regionOut',
        onRegionClick: 'regionClick'
    },
    
    container: null,
    mapData: null,
    map: null,
    canvas: null,
    methodName: null,
    event: null,
    
    transX: 0,
    transY: 0,
    scale: 1,
    baseTransX: 0,
    baseTransY: 0,
    baseScale: 1,
    
    width: 0,
    height: 0,
    countries: {},
    countriesColors: {},
    countriesData: {},
    zoomStep: 1.4,
    zoomMaxStep: 10,
    zoomCurStep: 1,
    
    xlink: "http://www.w3.org/1999/xlink",
    mapIndex: 1,
    maps: {},
    
    initialize: function(element, options){
        var self = this;
        this.setOptions(options);        
        
        if (!element) {
            return false;
        }
        
        this.container = document.id(element);
        this.container.setStyles({
            position: 'relative',
            overflow: 'hidden'
        });
        
        new Request({
            url: this.options.map+this.options.fileExtension,
            method: 'get',
            onRequest: function(){
            },
            onSuccess: function(responseText){
                self.mapData = JSON.decode(responseText);
                self.createMap();
            },
            onFailure: function(){
            }
        }).send();
    },
    
    createMap: function(){
        var selector;
        
        this.applySettings();
        this.resize();
        this.addResizeHandler();
        
        this.canvas = new VectorCanvas(this.width, this.height, this.color);
        this.container.adopt(this.canvas.canvas);
        
        this.makeDraggable();
        
        this.rootGroup = this.canvas.createGroup(true);
        
        this.index = this.mapIndex;
        
        this.createLabel();
        this.createZoomButtons();
        
        this.applyMapPaths();
        
        this.setColors(this.apiParams.colors);
        //this.canvas.canvas.adopt(this.rootGroup);
        this.canvas.canvas.appendChild(this.rootGroup);
        
        this.applyTransform();
        this.bindZoomButtons();
        
        this.mapIndex++;
        
        this.addMouseOverEvent();
        this.addMouseOutEvent();
        this.addClickEvent();
        this.addMouseMoveEvent();
    },
    
    applySettings: function() {
        this.defaultWidth = this.mapData.width;
        this.defaultHeight = this.mapData.height;
        
        this.color = this.options.color;
        this.hoverColor = this.options.hoverColor;
        this.container.setStyle('background-color', this.options.backgroundColor);
        
        this.width = this.container.getSize().x;
        this.height = this.container.getSize().y;
    },
    
    addResizeHandler: function() {
        window.addEvent('resize', function(e){
            this.width = this.container.getSize().x;
            this.height = this.container.getSize().y;
            this.resize();
            this.canvas.setSize(map.width, map.height);
            this.applyTransform();
        }.bind(this));
    },
    
    createLabel: function() {
        this.label = new Element('div');
        this.label.addClass('moovectormap-label').inject(document.getElement('body'));
    },
    
    createZoomButtons: function() {
        if (this.options.showZoom)
        {
            new Element('div', {
                'class': 'moovectormap-zoomin'
            }).set('text', '+').inject(this.container);
            
            new Element('div', {
                'class': 'moovectormap-zoomout'
            }).set('html', '&#x2212;').inject(this.container);
        }
    },
    
    applyMapPaths: function() {
        for (var key in this.mapData.paths) {
            var path = this.canvas.createPath({path: this.mapData.paths[key].path});
            path.setFill(this.color);
            path.setStrokeColor(this.options.strokeColor);
            path.setStrokeWidth(this.options.strokeWidth);
            path.id = 'moovectormap'+this.index+'_'+key;
            this.countries[key] = path;
            //path.inject(this.rootGroup);
            //this.rootGroup.adopt(path);
            this.rootGroup.appendChild(path);
        }
    },
    
    addMouseOverEvent: function() {
        this.container.getElements(this.canvas.mode == 'svg' ? 'path' : 'shape').addEvent('mouseover', function(e){
            var path = e.target,
            code = e.target.id.split('_').pop();
            
            this.fireEvent(this.apiEvents.onRegionOver, [e, code]);
            
            if (!e.event.defaultPrevented) {
                if (this.options.hoverOpacity) {
                    path.setOpacity(this.options.hoverOpacity);
                }

                if (this.options.hoverColor) {
                    path.currentFillColor = path.getFill()+'';
                    path.setFill(this.options.hoverColor);
                }
            }
            
            this.label.set('text', this.mapData.paths[code].name);
            this.fireEvent(this.apiEvents.onLabelShow, [e, this.label, code]);
            
            if (!e.event.defaultPrevented) {
                this.label.setStyle('display', 'block').addClass('visible');
                
                this.labelWidth = this.label.getSize().x;
                this.labelHeight = this.label.getSize().y;
            }
            
        }.bind(this));
    },
    
    addMouseOutEvent: function() {
        this.container.getElements(this.canvas.mode == 'svg' ? 'path' : 'shape').addEvent('mouseout', function(e){
            var path = e.target,
            code = e.target.id.split('_').pop();
            
            path.setOpacity(1);
            
            if (path.currentFillColor) {
                path.setFill(path.currentFillColor);
            }
            
            this.label.setStyle('display', 'none').removeClass('visible');
            
            this.fireEvent(this.apiEvents.onRegionOut, [e, code]);
        }.bind(this));
    },
    
    addClickEvent: function() {
        this.container.getElements(this.canvas.mode == 'svg' ? 'path' : 'shape').addEvent('click', function(e){
            var path = e.target,
            code = e.target.id.split('_').pop();
            this.fireEvent(this.apiEvents.onRegionClick, [e, code]);
            
        }.bind(this));
    },
    
    addMouseMoveEvent: function() {
        this.container.addEvent('mousemove', function(e){
            if (this.label.hasClass('visible')) {
                this.label.setStyles({
                    left: e.page.x-5-this.labelWidth,
                    top: e.page.y-5-this.labelHeight
                })
            }
        }.bind(this));
    },
    
    setColors: function(key, color) {
        if (typeof key == 'string') {
            this.countries[key].setFill(color);
        }
        
        else {
            var colors = key;
            for (var code in colors) {
                if (this.countries[code]) {
                    this.countries[code].setFill(colors[code]);  
                }
            }
        }
    },
    
    setValues: function(values) {
        var max = 0,
        min = Number.MAX_VALUE,
        val;
        
        for (var cc in values) {
            val = parseFloat(values[cc]);
            if (val > max) max = values[cc];
            if (val && val < min) min = val;
        }
        
        this.colorScale.setMin(min);
        this.colorScale.setMax(max);
        
        var colors = {};
        
        for (cc in values) {
            val = parseFloat(values[cc]);
            if (val) {
                colors[cc] = this.colorScale.getColor(val);
            } 
            
            else {
                colors[cc] = this.color;
            }
        }
        
        this.setColors(colors);
        this.values = values;
    },
    
    setBackgroundColor: function(backgroundColor) {
        this.container.css('background-color', backgroundColor);
    },
    
    setScaleColors: function(colors) {
        this.colorScale.setColors(colors);
        
        if (this.values) {
            this.setValues(this.values);  
        }
    },
    
    setNormalizeFunction: function(f) {
        this.colorScale.setNormalizeFunction(f);
        
        if (this.values) {
            this.setValues(this.values);  
        }
    },
    
    resize: function() {
        var curBaseScale = this.baseScale;
        
        if (this.width / this.height > this.defaultWidth / this.defaultHeight) {
            this.baseScale = this.height / this.defaultHeight;
            this.baseTransX = Math.abs(this.width - this.defaultWidth * this.baseScale) / (2 * this.baseScale);
        } 
        
        else {
            this.baseScale = this.width / this.defaultWidth;
            this.baseTransY = Math.abs(this.height - this.defaultHeight * this.baseScale) / (2 * this.baseScale);
        }
        
        this.scale *= this.baseScale / curBaseScale;
        this.transX *= this.baseScale / curBaseScale;
        this.transY *= this.baseScale / curBaseScale;
    },
    
    reset: function() {
        this.countryTitle.reset();
        
        for(var key in this.countries) {
            this.countries[key].setFill(WorldMap.defaultColor);
        }
        
        this.scale = this.baseScale;
        this.transX = this.baseTransX;
        this.transY = this.baseTransY;
        this.applyTransform();
    },
    
    applyTransform: function() {
        var maxTransX, maxTransY, minTransX, maxTransY;
        
        if (this.defaultWidth * this.scale <= this.width) {
            maxTransX = (this.width - this.defaultWidth * this.scale) / (2 * this.scale);
            minTransX = (this.width - this.defaultWidth * this.scale) / (2 * this.scale);
        } 
        
        else {
            maxTransX = 0;
            minTransX = (this.width - this.defaultWidth * this.scale) / this.scale;
        }
        
        if (this.defaultHeight * this.scale <= this.height) {
            maxTransY = (this.height - this.defaultHeight * this.scale) / (2 * this.scale);
            minTransY = (this.height - this.defaultHeight * this.scale) / (2 * this.scale);
        } 
        
        else {
            maxTransY = 0;
            minTransY = (this.height - this.defaultHeight * this.scale) / this.scale;
        }
        
        if (this.transY > maxTransY) {
            this.transY = maxTransY;
        } 
        
        else if (this.transY < minTransY) {
            this.transY = minTransY;
        }
        
        if (this.transX > maxTransX) {
            this.transX = maxTransX;
        } 
        
        else if (this.transX < minTransX) {
            this.transX = minTransX;
        }

        this.canvas.applyTransformParams(this.scale, this.transX, this.transY);
    },
    
    makeDraggable: function(){
        this.mouseDown = false;
        this.oldPageX = 0;
        this.oldPageY = 0;
        
        this.container.addEvent('mousemove', function(e){
            if (this.mouseDown) {
                var curTransX = this.transX;
                var curTransY = this.transY;
                
                this.transX -= (this.oldPageX - e.page.x) / this.scale;
                this.transY -= (this.oldPageY - e.page.y) / this.scale;
                
                this.applyTransform();
                
                this.oldPageX = e.page.x;
                this.oldPageY = e.page.y;
            }
            return false;
        }.bind(this)).addEvent('mousedown', function(e){
            this.mouseDown = true;
            this.oldPageX = e.page.x;
            this.oldPageY = e.page.y;
            
            return false;
        }.bind(this)).addEvent('mouseup', function(){
            this.mouseDown = false;
            return false;
        }.bind(this));
    },
    
    bindZoomButtons: function() {
        var zoomHeight = document.id('zoom') ? document.id('zoom').getSize().y : null;
        var sliderDelta = (zoomHeight - 6*2 - 15*2 - 3*2 - 7 - 6) / (this.zoomMaxStep - this.zoomCurStep);
        
        this.container.getElements('.moovectormap-zoomin').addEvent('click', function(e){
            if (this.zoomCurStep < this.zoomMaxStep) {
                var curTransX = this.transX;
                var curTransY = this.transY;
                var curScale = this.scale;
                this.transX -= (this.width / this.scale - this.width / (this.scale * this.zoomStep)) / 2;
                this.transY -= (this.height / this.scale - this.height / (this.scale * this.zoomStep)) / 2;
                this.setScale(this.scale * this.zoomStep);
                this.zoomCurStep++;
                
                if (document.id('zoomSlider')){
                    document.id('zoomSlider').setStyle({
                        'top': parseInt(document.id('zoomSlider').getStyle('top') - sliderDelta)
                    });
                }
            }
        }.bind(this));
        
        this.container.getElements('.moovectormap-zoomout').addEvent('click', function(e){
            if (this.zoomCurStep > 1) {
                var curTransX = this.transX;
                var curTransY = this.transY;
                var curScale = this.scale;
                this.transX += (this.width / (this.scale / this.zoomStep) - this.width / this.scale) / 2;
                this.transY += (this.height / (this.scale / this.zoomStep) - this.height / this.scale) / 2;
                this.setScale(this.scale / this.zoomStep);
                this.zoomCurStep--;
                
                if (document.id('zoomSlider')) {
                    document.id('zoomSlider').setStyle({
                        'top': parseInt(document.id('zoomSlider').getStyle('top') + sliderDelta)
                    });
                }
            }
        }.bind(this));
    },
    
    setScale: function(scale) {
        this.scale = scale;
        this.applyTransform();
    },
    
    getCountryPath: function(cc) {
        return document.id(cc)[0];
    }
});