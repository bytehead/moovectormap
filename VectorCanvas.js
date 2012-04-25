/*
---
name: VectorCanvas
description: 
authors: David Greminger
requires: []
provides: VectorCanvas
...
*/
var VectorCanvas = new Class({

    Implements: [Options, Events],

    options: {
        width: 500,
        height: 500,
        color: '#fff'
    },

    svgns: "http://www.w3.org/2000/svg",
    mode: 'svg',
    canvas: null,

    initialize: function(options) {
        if (options) {
            this.setOptions(options);
        }

        this.mode = window.SVGAngle ? 'svg': 'vml';
        
        if (this.mode == 'svg') {
            this.createSvgNode = function(nodeName) {
                //var element = document.createElementNS(this.svgns, nodeName);
                return new Element(nodeName);
            }
        } 
        
        else {
            try {
                if (!document.namespaces.rvml) {
                    document.namespaces.add("rvml", "urn:schemas-microsoft-com:vml");
                }
                
                this.createVmlNode = function(tagName) {
                    return document.createElement('<rvml:' + tagName + ' class="rvml">');
                };
            } 
            
            catch(e) {
                this.createVmlNode = function(tagName) {
                    return document.createElement('<' + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
                };
            }
            document.createStyleSheet().addRule(".rvml", "behavior:url(#default#VML)");
        }
        
        if (this.mode == 'svg') {
            this.canvas = this.createSvgNode('svg');
        } 
        
        else {
            this.canvas = this.createVmlNode('group');
            this.canvas.style.position = 'absolute';
        }
        
        this.setSize(this.options.width, this.options.height);
    },

    setSize: function(width, height) {
        if (this.mode == 'svg') {
            this.canvas.setAttribute('width', width);
            this.canvas.setAttribute('height', height);
        }

        else {
            this.canvas.style.width = width + "px";
            this.canvas.style.height = height + "px";
            this.canvas.coordsize = width + ' ' + height;
            this.canvas.coordorigin = "0 0";

            if (this.rootGroup) {
                var paths = this.rootGroup.getElementsByTagName('shape');

                for (var i = 0, l = paths.length; i < l; i++) {
                    paths[i].coordsize = width + ' ' + height;
                    paths[i].style.width = width + 'px';
                    paths[i].style.height = height + 'px';
                }

                this.rootGroup.coordsize = width + ' ' + height;
                this.rootGroup.style.width = width + 'px';
                this.rootGroup.style.height = height + 'px';
            }
        }

        this.options.width = width;
        this.options.height = height;
    },

    createPath: function(config) {
        var node,
        scale,
        fill;

        if (this.mode == 'svg') {
            node = this.createSvgNode('path');
            node.setAttribute('d', config.path);
            node.setAttribute('fill-rule', 'evenodd');

            node.setFill = function(color) {
                this.setAttribute("fill", color);
            };

            node.getFill = function(color) {
                return this.getAttribute("fill");
            };

            node.setOpacity = function(opacity) {
                this.setAttribute('fill-opacity', opacity);
            };
            
            node.setStrokeColor = function(color) {
                this.setAttribute('stroke', color);
            };
            
            node.setStrokeWidth = function(width) {
                this.setAttribute('stroke-width', width);
            };
        }

        else {
            node = this.createVmlNode('shape');
            node.coordorigin = "0 0";
            node.coordsize = this.options.width + ' ' + this.options.height;
            node.style.width = this.options.width + 'px';
            node.style.height = this.options.height + 'px';
            node.fillcolor = this.options.color;
            node.stroked = false;
            node.path = this.pathSvgToVml(config.path);

            scale = this.createVmlNode('skew');
            scale.on = true;
            scale.matrix = '0.01,0,0,0.01,0,0';
            scale.offset = '0,0';
            node.appendChild(scale);

            fill = this.createVmlNode('fill');
            node.appendChild(fill);

            node.setFill = function(color) {
                this.getElementsByTagName('fill')[0].color = color;
            };

            node.getFill = function(color) {
                return this.getElementsByTagName('fill')[0].color;
            };

            node.setOpacity = function(opacity) {
                this.getElementsByTagName('fill')[0].opacity = parseInt(opacity * 100) + '%';
            };
            
            node.setStrokeColor = function(color) {
                this.strokecolor = color;
            };
            
            node.setStrokeWidth = function(width) {
                this.stroked = false;
                if (width > 0) this.stroked = true;
                this.strokeweight = width/5;
            };
        }

        return node;
    },

    createGroup: function(isRoot) {
        var node;

        if (this.mode == 'svg') {
            node = this.createSvgNode('g');
        }

        else {
            node = this.createVmlNode('group');
            node.style.width = this.options.width + 'px';
            node.style.height = this.options.height + 'px';
            node.style.left = '0px';
            node.style.top = '0px';
            node.coordorigin = "0 0";
            node.coordsize = this.options.width + ' ' + this.options.height;
        }

        if (isRoot) {
            this.rootGroup = node;
        }

        return node;
    },

    applyTransformParams: function(scale, transX, transY) {
        if (this.mode == 'svg') {
            this.rootGroup.setAttribute('transform', 'scale(' + scale + ') translate(' + transX + ', ' + transY + ')');
        }

        else {
            this.rootGroup.coordorigin = (this.options.width - transX) + ',' + (this.options.height - transY);
            this.rootGroup.coordsize = this.options.width / scale + ',' + this.options.height / scale;
        }
    },

    pathSvgToVml: function(path) {
        var result = '',
        cx = 0,
        cy = 0,
        ctrlx,
        ctrly;

        path = path.replace(/(-?\d+)e(-?\d+)/g,
        function(s) {
            return 0;
            //var p = s.split('e');
            //return p[0]*Math.pow(10, p[1]);
        });

        return path.replace(/([MmLlHhVvCcSs])\s*((?:-?\d*(?:\.\d+)?\s*,?\s*)+)/g,
        function(segment, letter, coords, index) {
            coords = coords.replace(/(\d)-/g, '$1,-').replace(/\s+/g, ',').split(',');
            if (!coords[0]) coords.shift();
            for (var i = 0, l = coords.length; i < l; i++) {
                coords[i] = Math.round(100 * coords[i]);
            }
            switch (letter) {
            case 'm':
                cx += coords[0];
                cy += coords[1];
                return 't' + coords.join(',');
                break;
            case 'M':
                cx = coords[0];
                cy = coords[1];
                return 'm' + coords.join(',');
                break;
            case 'l':
                cx += coords[0];
                cy += coords[1];
                return 'r' + coords.join(',');
                break;
            case 'L':
                cx = coords[0];
                cy = coords[1];
                return 'l' + coords.join(',');
                break;
            case 'h':
                cx += coords[0];
                return 'r' + coords[0] + ',0';
                break;
            case 'H':
                cx = coords[0];
                return 'l' + cx + ',' + cy;
                break;
            case 'v':
                cy += coords[0];
                return 'r0,' + coords[0];
                break;
            case 'V':
                cy = coords[0];
                return 'l' + cx + ',' + cy;
                break;
            case 'c':
                ctrlx = cx + coords[coords.length - 4];
                ctrly = cy + coords[coords.length - 3];
                cx += coords[coords.length - 2];
                cy += coords[coords.length - 1];
                return 'v' + coords.join(',');
                break;
            case 'C':
                ctrlx = coords[coords.length - 4];
                ctrly = coords[coords.length - 3];
                cx = coords[coords.length - 2];
                cy = coords[coords.length - 1];
                return 'c' + coords.join(',');
                break;
            case 's':
                coords.unshift(cy - ctrly);
                coords.unshift(cx - ctrlx);
                ctrlx = cx + coords[coords.length - 4];
                ctrly = cy + coords[coords.length - 3];
                cx += coords[coords.length - 2];
                cy += coords[coords.length - 1];
                return 'v' + coords.join(',');
                break;
            case 'S':
                coords.unshift(cy + cy - ctrly);
                coords.unshift(cx + cx - ctrlx);
                ctrlx = coords[coords.length - 4];
                ctrly = coords[coords.length - 3];
                cx = coords[coords.length - 2];
                cy = coords[coords.length - 1];
                return 'c' + coords.join(',');
                break;
            }

            return '';
        }).replace(/z/g, 'e');
    }
});