//    abc_absolute_element.js: Definition of the AbsoluteElement class.
//    Copyright (C) 2010-2020 Gregory Dyke (gregdyke at gmail dot com) and Paul Rosen
//
//    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//    documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//    the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
//    to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
//    BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//    DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var setClass = require('./set-class');
var calcHeight = require('./calcHeight');

// duration - actual musical duration - different from notehead duration in triplets. refer to abcelem to get the notehead duration
// minspacing - spacing which must be taken on top of the width defined by the duration
// type is a meta-type for the element. It is not necessary for drawing, but it is useful to make semantic sense of the element. For instance, it can be used in the element's class name.
var AbsoluteElement = function AbsoluteElement(abcelem, duration, minspacing, type, tuneNumber, options) {
	//console.log("Absolute:",abcelem, type);
	if (!options)
		options = {};
	this.tuneNumber = tuneNumber;
	this.abcelem = abcelem;
	this.duration = duration;
	this.durationClass = options.durationClassOveride ? options.durationClassOveride : this.duration;
	this.minspacing = minspacing || 0;
	this.x = 0;
	this.children = [];
	this.heads = [];
	this.extra = [];
	this.extraw = 0;
	this.w = 0;
	this.right = [];
	this.invisible = false;
	this.bottom = undefined;
	this.top = undefined;
	this.type = type;

	// The following are the dimensions of the fixed part of the element.
	// That is, the chord text will be a different height depending on lot of factors, but the 8th flag will always be in the same place.
	this.fixed = { w: 0, t: undefined, b: undefined }; // there is no x-coord here, because that is set later.

	// these are the heights of all of the vertical elements that can't be placed until the end of the line.
	// the vertical order of elements that are above is: tempo, part, volume/dynamic, ending/chord, lyric
	// the vertical order of elements that are below is: lyric, chord, volume/dynamic
	this.specialY = {
		tempoHeightAbove: 0,
		partHeightAbove: 0,
		volumeHeightAbove: 0,
		dynamicHeightAbove: 0,
		endingHeightAbove: 0,
		chordHeightAbove: 0,
		lyricHeightAbove: 0,

		lyricHeightBelow: 0,
		chordHeightBelow: 0,
		volumeHeightBelow: 0,
		dynamicHeightBelow: 0
	};
};

AbsoluteElement.prototype.getFixedCoords = function () {
	return { x: this.x, w: this.fixed.w, t: this.fixed.t, b: this.fixed.b };
};

AbsoluteElement.prototype.addExtra = function (extra) {
	this.fixed.w = Math.max(this.fixed.w, extra.dx+extra.w);
	if (this.fixed.t === undefined) this.fixed.t = extra.top; else this.fixed.t = Math.max(this.fixed.t, extra.top);
	if (this.fixed.b === undefined) this.fixed.b = extra.bottom; else this.fixed.b = Math.min(this.fixed.b, extra.bottom);
	if (extra.dx<this.extraw) this.extraw = extra.dx;
	this.extra[this.extra.length] = extra;
	this.addChild(extra);
};

AbsoluteElement.prototype.addHead = function (head) {
	if (head.dx<this.extraw) this.extraw = head.dx;
	this.heads[this.heads.length] = head;
	this.addRight(head);
};

AbsoluteElement.prototype.addRight = function (right) {
	// These are the elements that are the fixed part.
	this.fixed.w = Math.max(this.fixed.w, right.dx+right.w);
	if (right.top !== undefined) {
		if (this.fixed.t === undefined) this.fixed.t = right.top; else this.fixed.t = Math.max(this.fixed.t, right.top);
	}
	if (right.bottom !== undefined) {
		if (this.fixed.b === undefined) this.fixed.b = right.bottom; else this.fixed.b = Math.min(this.fixed.b, right.bottom);
	}
	if (isNaN(this.fixed.t) || isNaN(this.fixed.b))
		debugger;
	if (right.dx+right.w>this.w) this.w = right.dx+right.w;
	this.right[this.right.length] = right;
	this.addChild(right);
};

AbsoluteElement.prototype.addCentered = function (elem) {
	var half = elem.w/2;
	if (-half<this.extraw) this.extraw = -half;
	this.extra[this.extra.length] = elem;
	if (elem.dx+half>this.w) this.w = elem.dx+half;
	this.right[this.right.length] = elem;
	this.addChild(elem);
};

AbsoluteElement.prototype.setLimit = function(member, child) {
	if (!child[member]) return;
	if (!this.specialY[member])
		this.specialY[member] = child[member];
	else
		this.specialY[member] = Math.max(this.specialY[member], child[member]);
};

AbsoluteElement.prototype.addChild = function (child) {
	//console.log("Relative:",child);
	child.parent = this;
	this.children[this.children.length] = child;
	this.pushTop(child.top);
	this.pushBottom(child.bottom);
	this.setLimit('tempoHeightAbove', child);
	this.setLimit('partHeightAbove', child);
	this.setLimit('volumeHeightAbove', child);
	this.setLimit('dynamicHeightAbove', child);
	this.setLimit('endingHeightAbove', child);
	this.setLimit('chordHeightAbove', child);
	this.setLimit('lyricHeightAbove', child);
	this.setLimit('lyricHeightBelow', child);
	this.setLimit('chordHeightBelow', child);
	this.setLimit('volumeHeightBelow', child);
	this.setLimit('dynamicHeightBelow', child);
};

AbsoluteElement.prototype.pushTop = function (top) {
	if (top !== undefined) {
		if (this.top === undefined)
			this.top = top;
		else
			this.top = Math.max(top, this.top);
	}
};

AbsoluteElement.prototype.pushBottom = function (bottom) {
	if (bottom !== undefined) {
		if (this.bottom === undefined)
			this.bottom = bottom;
		else
			this.bottom = Math.min(bottom, this.bottom);
	}
};

AbsoluteElement.prototype.setX = function (x) {
	this.x = x;
	for (var i=0; i<this.children.length; i++)
		this.children[i].setX(x);
};

AbsoluteElement.prototype.center = function (before, after) {
	// Used to center whole rests
	var midpoint = (after.x - before.x) / 2 + before.x;
	this.x = midpoint - this.w / 2;
	for (var k = 0; k < this.children.length; k++)
		this.children[k].setX(this.x);
};

AbsoluteElement.prototype.setHint = function () {
	this.hint = true;
};

AbsoluteElement.prototype.isIE=/*@cc_on!@*/false;//IE detector

AbsoluteElement.prototype.highlight = function (klass, color) {
	if (klass === undefined)
		klass = "abcjs-note_selected";
	if (color === undefined)
		color = "#ff0000";
	setClass(this.elemset, klass, "", color);
};

AbsoluteElement.prototype.unhighlight = function (klass, color) {
	if (klass === undefined)
		klass = "abcjs-note_selected";
	if (color === undefined)
		color = "#000000";
	setClass(this.elemset, "", klass, color);
};

module.exports = AbsoluteElement;
