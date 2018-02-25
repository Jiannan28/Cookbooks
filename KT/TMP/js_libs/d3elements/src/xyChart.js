/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */

var d3 = (function (d3) {
	"use strict";
	// requires d3
	// adds d3.elts.xyChart

	function xyChart() {
		// based on http://bost.ocks.org/mike/chart/time-series-chart.js
		// allows multiple y values (and a diff number per x is ok), 
		// data = [first plot's x-y pairs, second plot's x-y pairs, ...]
		// eg. data = [[[1,10],[2,15],[5,25]], [[1,30],[3,20],[4,5]], [[0,0]]]
		// use the chartTypes param to choose how to display each y,
		// eg. chart.chartTypes(["area line points", "line", "points"])
		// (defaults to area with line and points, then all lines)
		//
		function xX(d) {
			return xScale(d[0]);
		}
		function yY(d) {
			return yScale(d[1]);
		}
		var margin = {top: 10, right: 20, bottom: 120, left: 60},
			width = 760,
			height = 120,
			duration = 500,
			svgClass = "xy-chart", // the svg element is given this class
			plotClass = "xy-plot", // each g group under the svg g is given this class
			gradientPrefix = "gradient-xy-fill",  // class and as id -X is added to this, X=index of plot (0,1,2,...)
			xScale = d3.scale.linear(),
			yScale = d3.scale.linear(),
			xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0),
			yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(6).tickSize(6, 0),
			xAxisText = function() {}, // a function of the text selection eg. to rotate x labels 90 degrees
			smartYFormat = false, // nicely chooses %s for small y-values
			chartTypes = ["area line points"], //  defaults to area with line and points, then all lines
			area = d3.svg.area().x(xX).y1(yY),
			line = d3.svg.line().x(xX).y(yY),
			strokeColor = ["gray"],
			fillColor = [["lightgray", "gray", "white"]],  // if a pair is given, uses a gradient; if a third is given, used for the point fill
			strokeWidth = 1,
			pointRadius = 5,
			opacity = 0.67;

		function update(elt, data) {
			var i, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
			var ptsData, points;
			for (i=0; i<data.length; i++) {
				maxX = Math.max(maxX, d3.max(data[i], function(d) { return d[0] } ));
				minX = Math.min(minX, d3.min(data[i], function(d) { return d[0] } ));
				maxY = Math.max(maxY, d3.max(data[i], function(d) { return d[1] } ));
				minY = Math.min(minY, d3.min(data[i], function(d) { return d[1] } ));
			}

			// Update the x-scale.
			xScale
				.domain([minX, maxX])
				.range([0, width - margin.left - margin.right]);

			// Update the y-scale.
			// note d3.min(d.slice(1)) returns the smallest y_i in d=[x,y_0,y_1,y_2,...]
			yScale
				.domain([minY, maxY])
				.range([height - margin.top - margin.bottom, 0]);

			// Select the svg element, if it exists; otherwise create it
			var svg = d3.select(elt).selectAll("svg."+svgClass).data([1]);
			var svgGEnter = svg.enter().append("svg").attr("class",svgClass).append("g");

			// Select/create a plot for each y.
			var plots = svg.select("g").selectAll("."+plotClass).data(data);

			// create the plots
			var plotsEnter = plots.enter().append("g").attr("class",plotClass);
			// or remove them
			plots.exit().remove();  // TODO: animate this to zero

			// Set up the area fill gradient
			var gradient = plotsEnter.append("linearGradient")
				.attr("class", gradientPrefix)
				.attr("id", function(d,i) {return gradientPrefix+"-"+i})
				.attr("x1", 0).attr("x2", 1).attr("y1", 0).attr("y2", 0); // horizontal
			gradient.append("stop")
				.attr("class", "stop-1")
				.attr("offset", "0%")
				.attr("stop-color", function(d,i) { return fillColor[i % fillColor.length][0] });
			gradient.append("stop")
				.attr("class", "stop-2")
				.attr("offset", "100%")
				.attr("stop-color", function(d,i) { return fillColor[i % fillColor.length][1] });

			plotsEnter.append("path")
				.attr("class", "area")
				.attr("fill", function(d,i) {
					if (typeof fillColor[i % fillColor.length][1]==="undefined") {
						return fillColor[i % fillColor.length][0];
					} else {
						return "url(#"+gradientPrefix+"-"+i+")";
					}
				})
				.attr("opacity", opacity)
				.attr("d", function(d,i) {
					if (chartTypes[i] && chartTypes[i].indexOf("area")>=0) {
						return d3.svg.area().x(xX).y1(function(){return yScale(0)}).y0(yScale(0)).apply(this, arguments);
					} else {
						return null;
					}
				});

			plotsEnter.append("path")
				.attr("class", "line")
				.attr("stroke", function(d,i) { return strokeColor[i % strokeColor.length] })
				.attr("stroke-width",strokeWidth)
				.attr("fill", "none")
				.attr("d", function(d,i) {
					if (!chartTypes[i] || (chartTypes[i] && chartTypes[i].indexOf("line")>=0)) {
						return d3.svg.line().x(xX).y(function(){return yScale(0)}).apply(this, arguments);
					}
				});

			plotsEnter.append("g")
				.attr("class", function(d,i) { return "points-"+i; }); // ready for the points to be added

			svgGEnter.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + yScale(0) + ")");

			svgGEnter.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(" + xScale(0) + ",0)");

			// Update the outer dimensions.
			svg .attr("width", width)
				.attr("height", height);

			// Update the inner dimensions.
			svg.select("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			// Update the points, one plot at a time (is there a more-D3-like way?)
			// first define some functions we'll need in the loop
			function fillFunc(i) {
				return function() {
						if (typeof fillColor[i % fillColor.length][2]==="undefined") {
							return fillColor[i % fillColor.length][0];
						} else {
							return fillColor[i % fillColor.length][2]; //"url(#"+gradientPrefix+"-"+i+")";
						}
					};
			}
			function strokeFunc(i) {
				return function() { return strokeColor[i % strokeColor.length] };
			}
			function scaledX(d) {return xScale(d[0])}
			function scaledY(d) {return yScale(d[1])}
			for (i=0; i<data.length; i++) {
				if (chartTypes[i] && chartTypes[i].indexOf("point")>=0) {
					ptsData = data[i];
				} else {
					ptsData = [];
				} 
				points = plots.select(".points-"+i).selectAll(".point").data(ptsData);
				points.enter()
					.append("circle")
					.attr("class", "point")
					.attr("r", 0)
					.style("opacity", 1e-6)
					.attr("fill", fillFunc(i))
					.attr("stroke", strokeFunc(i))
					.attr("stroke-width",strokeWidth)
					.attr("cx", scaledX)
					.attr("cy", yScale(0));
				points.transition().duration(duration)
					.style("opacity", 1)
					.attr("r", pointRadius)
					.attr("cx", scaledX)
					.attr("cy", scaledY);
				points.exit().remove();
			}

			// Update the area paths.
			plots.select(".area")  // not selectAll, see http://stackoverflow.com/questions/28057847/d3-line-and-area-charts-not-updating-with-new-data-array
				.transition()
					.duration(duration)
				.attr("d", function(d, i) {
					if (chartTypes[i] && chartTypes[i].indexOf("area")>=0) {
						return area.y0(yScale(0)).apply(this, arguments);
					}
				});

			// Update the gradient (since the gradient id stays the same, no need to change the circles' fill)
			plots.select("."+gradientPrefix+" stop.stop-1")
				.transition()
					.duration(duration)
					.attr("stop-color", function(d,i) { return fillColor[i % fillColor.length][0] });
			plots.select("."+gradientPrefix+" stop.stop-2")
				.transition()
					.duration(duration)
					.attr("stop-color", function(d,i) { return fillColor[i % fillColor.length][1] });

			// Update the line paths.
			plots.select(".line")  // not selectAll
				.transition()
				.duration(duration)
				.attr("stroke",function(d,i) { return strokeColor[i % strokeColor.length] })
				.attr("stroke-width",strokeWidth)
				.attr("d", function(d,i) {
					if (!chartTypes[i] || (chartTypes[i] && chartTypes[i].indexOf("line")>=0)) {
						return line.apply(this, arguments);
					}
				});

			// Update the x-axis.
			var svgG = svg.select("g");

			svgG.select(".x.axis")
				.transition()
				.duration(duration)
				.attr("transform", "translate(0," + yScale.range()[0] + ")")
				.call(xAxis)
	 				.selectAll("text")
					.call(xAxisText);
			svgG.select(".x.axis")
					.selectAll("text")
					.call(xAxisText);

			// Update the y-axis
			if (smartYFormat) {
				var absMax = Math.max( Math.abs(yScale.domain()[0]), Math.abs(yScale.domain()[1]) );
				if (absMax>2) {
					yAxis.tickFormat(d3.format("g"));
				} else if (absMax>=0.04) {
					yAxis.tickFormat(d3.format("%"));
				} else if (absMax>0.003) {
					yAxis.tickFormat(d3.format(".1%"));
				} else if (absMax>0.0003) {
					yAxis.tickFormat(d3.format(".2%"));
				} else {
					yAxis.tickFormat(d3.format("g"));
				}
			}
			svgG.select(".y.axis")
				.transition()
				.duration(duration)
				.attr("transform", "translate(" + xScale.range()[0] + ", 0)")
				.call(yAxis);

		}

		function chart(selection) {
			selection.each(function(data) {
				var elt = this;
				update(elt, data);
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

		chart.duration = function(_) {
			if (!arguments.length) return duration;
			duration = _;
			return chart;
		};

		chart.xAxis = function(_) {
			if (!arguments.length) return xAxis;
			xAxis = _;
			return chart;
		};

		chart.yAxis = function(_) {
			if (!arguments.length) return yAxis;
			yAxis = _;
			return chart;
		};

		chart.chartTypes = function(_) {
			if (!arguments.length) return chartTypes;
			chartTypes = _;
			return chart;
		};

		chart.smartYFormat = function(_) {
			if (!arguments.length) return smartYFormat;
			smartYFormat = _;
			return chart;
		};

		chart.strokeWidth = function(_) {
			if (!arguments.length) return strokeWidth;
			strokeWidth = _;
			return chart;
		};

		chart.strokeColor = function(_) {
			if (!arguments.length) return strokeColor;
			strokeColor = _;
			return chart;
		};

		chart.fillColor = function(_) {
			if (!arguments.length) return fillColor;
			fillColor = _;
			return chart;
		};

		chart.pointRadius = function(_) {
			if (!arguments.length) return pointRadius;
			pointRadius = _;
			return chart;
		};

		chart.opacity = function(_) {
			if (!arguments.length) return opacity;
			opacity = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.plotClass = function(_) {
			if (!arguments.length) return plotClass;
			plotClass = _;
			return chart;
		};

		chart.gradientPrefix = function(_) {
			if (!arguments.length) return gradientPrefix;
			gradientPrefix = _;
			return chart;
		};

		return chart;
	}


	// attach timeSeriesChart to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.xyChart = xyChart;
	return d3;

}(d3));
