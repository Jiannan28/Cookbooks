/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */

if (typeof d3 === 'undefined') { throw new Error('This module requires d3') }

var d3 = (function (d3) {
	'use strict';
	// requires d3
	// adds d3.elts.probWheel

	function probWheel() {
		// Only pass a single data value in, which is the probability (0-1)
		//
		// approach based on http://bost.ocks.org/mike/chart/
		// Eg.
		//    var myWheel = d3.elts.probWheel().width(...);
		//    d3.select('body').datum([0.3]).call(myWheel);
		//
		// To get the fraction (0-1) chosen, use:
		//    d3.select('.prob-wheel').datum()  // eg. 0.27
		// or if you have many prob wheels, you can use
		//    d3.selectAll('.prob-wheel').data() // eg. [0.27, 0.35, 0.11]
		//

		var margin = {top: 0, right: 0, bottom: 0, left: 0},
			width = 220,
			height = 220,
			svgClass = "prob-wheel",
			backClass = "background",
			chosenClass = "chosen",
			knobClass = "knob",
			fill = ["#CCCCCC","orange", "#999999"],  // back, chosen, knob
			stroke = ["white","white","white"],      // back, chosen, knob
			strokeWidth = 2,
			knobWidth = 25,
			startAngle = 0,
			range = [0,1],
			symmetric = true, // overrides startAngle with -endAngle
			onChange = function() {}, // called with the new fraction on drag
			symStartAngle = 0; // TODO: only zero works for now 

		function chart(selection) {

			var tau = 2 * Math.PI;
			var startRadians = startAngle/360*tau;

			function dragKnob() {
				// returns the new fraction chosen
				// newAngle is relative to the vertical
				// negate the y-coord because screen y increases down the page 
				var newAngle = Math.atan(-d3.event.x/d3.event.y);
				if (-d3.event.y<=0) {
					if (d3.event.x>0) {
						newAngle = newAngle + Math.PI;
					} else {
						newAngle = newAngle - Math.PI;
						// TODO: this way of checking for halfway only works if symStartAngle=0
						if (symmetric) { return 1; } // can't go past halfway if sym
					}
				} else if (symmetric && d3.event.x<0) {
					return 0; // can't go to negative x around the top either if sym
				}
				var newFraction = ((tau + newAngle - startRadians) % tau) / tau;
				if (symmetric) {
					newFraction = ((tau + newAngle - symStartAngle*tau/360)*2 % tau) / tau;
				}
				return newFraction;
			}

			function update(elt, fraction) {
				// generate chart here, using width & height etc;
				// use 'data' for the data and 'this' for the element
				if (fraction<range[0]) { fraction = range[0]; }
				if (fraction>range[1]) { fraction = range[1]; }
				onChange(fraction);
				
				if (symmetric) { 
					startRadians = -(fraction * tau)/2 + symStartAngle*tau/360;
				}
				var endRadians = fraction * tau + startRadians;

				var innerWidth = width - margin.left - margin.right - strokeWidth*2 - knobWidth*2,
				    innerHeight = height - margin.top - margin.bottom - strokeWidth*2 - knobWidth*2,
				    radius = Math.min(innerWidth, innerHeight)/2;

				// An arc function with all values bound except the endAngle. So, to compute an
				// SVG path string for a given angle, we pass an object with an endAngle
				// property to the arc function, and it will return the corresponding string.
				var arc = d3.svg.arc()
					.innerRadius(0)
					.outerRadius(radius)
					.startAngle(startRadians);
	
				// Select the svg element, if it exists
				var svg = d3.select(elt).selectAll("svg."+svgClass).data([fraction]);

				// Otherwise, create the svg and the g
				svg.enter().append("svg").attr("class",svgClass).append("g");
				svg.attr("height", height).attr("width",width);

				// Update the location
				var g = svg.select("g")
							.attr("transform", "translate(" +
								(margin.left+innerWidth/2+strokeWidth+knobWidth) + "," + 
								(margin.top+innerHeight/2+strokeWidth+knobWidth) + ")");
				
				var background = g.selectAll("path."+backClass).data([{endAngle: tau+startRadians}]);
				background.enter().append("path").attr("class",backClass);
				background.style("fill", fill[0])
					.style("stroke", stroke[0])
					.style("stroke-width", strokeWidth)
					.attr("d", arc);

				var chosen = g.selectAll("path."+chosenClass).data([{endAngle: endRadians}]);
				chosen.enter().append("path").attr("class",chosenClass);
				chosen.style("fill", fill[1])
					.style("stroke", stroke[1])
					.style("stroke-width", strokeWidth)
					.attr("d", arc);

				var knob = g.selectAll("circle."+knobClass).data([endRadians]);
				knob.enter().append("circle").attr("class",knobClass);
				knob.style("fill", fill[2])
					.style("stroke", stroke[2])
					.style("stroke-width", strokeWidth)
					.attr("cx", function(d) {return radius*Math.cos(d-tau/4)})
					.attr("cy", function(d) {return radius*Math.sin(d-tau/4)})
					.attr("r", knobWidth/2)
					.style("cursor","pointer")
					.call(d3.behavior.drag().on("drag", function() { update(elt, dragKnob()); }));
			}

			selection.each(function(data) {
				update(this, data[0]);
			});

		}

		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin = _;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.stroke = function(_) {
			if (!arguments.length) return stroke;
			stroke = _;
			return chart;
		};

		chart.fill = function(_) {
			if (!arguments.length) return fill;
			fill = _;
			return chart;
		};

		chart.strokeWidth = function(_) {
			if (!arguments.length) return strokeWidth;
			strokeWidth = _;
			return chart;
		};

		chart.startAngle = function(_) {
			if (!arguments.length) return startAngle;
			startAngle = _;
			return chart;
		};

		chart.range = function(_) {
			if (!arguments.length) return range;
			range = _;
			return chart;
		};

		chart.symmetric = function(_) {
			if (!arguments.length) return symmetric;
			symmetric = _;
			return chart;
		};

		chart.knobWidth = function(_) {
			if (!arguments.length) return knobWidth;
			knobWidth = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.backClass = function(_) {
			if (!arguments.length) return backClass;
			backClass = _;
			return chart;
		};

		chart.chosenClass = function(_) {
			if (!arguments.length) return chosenClass;
			chosenClass = _;
			return chart;
		};

		chart.knobClass = function(_) {
			if (!arguments.length) return knobClass;
			knobClass = _;
			return chart;
		};

		chart.onChange = function(_) {
			if (!arguments.length) return onChange;
			onChange = _;
			return chart;
		};

		return chart;
	}

	// attach probWheel to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.probWheel = probWheel;
	return d3;

}(d3));
