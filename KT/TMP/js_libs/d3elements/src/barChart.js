/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true, _ */

if (typeof d3 === 'undefined') { throw new Error('This module requires d3') }
if (typeof _ === 'undefined') { throw new Error('This module requires underscore') }

var d3 = (function (d3, _) {
	'use strict';
	// requires d3 & underscorejs
	// adds d3.elts.barChart

	function barChart() {
		// approach based on http://bost.ocks.org/mike/chart/
		// call this as, eg.:
		//    var myChart = d3.elts.barChart().width(...); 
		//    d3.select('body').datum(points).call(myChart);
		//

		var margin = {top: 10, right: 20, bottom: 120, left: 60},
			width = 760,
			height = 300,
			duration = 500,
			svgClass = "bar-chart",
			xValue = function(d) { return d[0]; },
			yValue = function(d) { return d[1]; },
			xPadding = 0.1,
			yMin =  function(data) { return Math.min(0, d3.min(data, function(d) {return d[1]})) }, // can be a constant
			yMax = function(data) { return Math.max(0, d3.max(data, function(d) {return d[1]})) }, // can be a constant
			xScale = d3.scale.ordinal(),
			yScale = d3.scale.linear(),
			xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0),  // set to null for none (faster than hiding it)
			xAxisIfBarsWiderThan = null, // set this to only show the xAxis if the bars are wider than some amount
			xAxisTickFormat = null, // can be a function of the actual data, not just the primary id, eg. function(d) { return d[2] }
			xAxisText = function(textSel) {textSel.attr("x", -8)
							.attr("y", 0)
							.attr("dy", ".35em")
							.attr("transform", "rotate(-90)")
							.style("text-anchor", "end");
						},
			xAxisAnimate = true,
			yValueOfXAxis = 0,  // or a function of the data
			commasFormatter = d3.format(",.0f"),
			yAxis = d3.svg.axis().orient("left").tickSize(6, 0).tickFormat(commasFormatter), // set to null for none (faster than hiding it)
			yNoOverlap = 18,
			fill = function(d) { return d[1]>=0 ? "#66BB66" : "#BB6666" },
			stroke = function(d) { return d[1]>=0 ? "gray" : "#BB6666" },
			mouseOver = function() {}, // function(elt, d) {}
			mouseOut = function() {}, // function(elt, d) {}
			rangeWidget = null,
			xDomain = null; // set this to positions [start, end] into the data, to restrict the x domain

		var hadXAxis = false;

		function chart(selection) {

			function update(elt, data) {

				var heightWithoutRange = height - (rangeWidget ? rangeWidget.height() : 0);
				// Convert data to standard representation greedily;
				// this is needed for nondeterministic accessors.
				// (After this, d[0] is x and d[1] is y; don't use X and Y fns)
				
				if (_.isArray(data[0])) {
					// make sure d[0] and d[1] are the x and y values, but leave the rest
					_.each(data, function(d, i) {
						d[0] = xValue.call(data, d, i);
						d[1] = yValue.call(data, d, i);
					});
				} else {
					// if data is not an array of arrays, turn it into one
					data = _.map(data, function(d, i) {
						return [xValue.call(data, d, i), yValue.call(data, d, i)];
					});
				}
				
				if (!xDomain) {
					xDomain = [0, data.length-1];
				}
				var subdata = data.slice(xDomain[0], xDomain[1]+1);
				function getDataLine(x) {
					var matches = _.filter(subdata, function(d) { return d[0]===x});
					if (matches.length!==1) { throw "cannot find "+x+" in data"; } // shouldn't happen
					return matches[0];
				}
				// Update the x-scale.
				xScale.rangeBands([0, width - margin.left - margin.right], xPadding)
					.domain(_.map(subdata, function(d) {return d[0]}));
				
				// Update the y-scale.
				// Note d3.functor allows for constants or functions
				//  - see https://github.com/mbostock/d3/wiki/Internals#functor
				yScale
					.domain([d3.functor(yMin)(subdata), d3.functor(yMax)(subdata)])
					.range([(heightWithoutRange - margin.top - margin.bottom), 0]);
				
				// Select the svg element, if it exists.
				var svg = d3.select(elt).selectAll("svg."+svgClass).data([1]);

				// Otherwise, create the svg and the g.
				var gEnter = svg.enter().append("svg").attr("class",svgClass).append("g");
				gEnter.append("g").attr("class", "bars");
				gEnter.append("g").attr("class", "x axis");
				gEnter.append("g").attr("class", "y axis");

				// Update the inner dimensions.
				var g = svg.select("g")
							.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
				
				var bars = g.select("g.bars").selectAll("rect.bar")
					.data(subdata, function(d) {return d[0]});
				
				// ENTER
				bars.enter().append("rect")
					.attr("class", "bar")
					.attr("x", xX )
					.attr("y", yScale(0) )
					.attr("height", 0 )
					.attr("width", xScale.rangeBand())
					.attr("fill", fill)
					.attr("stroke", stroke);
				
				// UPDATE
				bars.on("mouseover", function(d) { mouseOver(this, d) }) // put these on the update in case they have changed
					.on("mouseout", function(d) { mouseOut(this, d) })
					.transition()
						.duration(duration)
						.attr("x", xX )
						.attr("y", function(d) { return d[1]>0 ? yY(d) : yScale(0) } )
						.attr("height", function(d) { return Math.abs(yY(d)-yScale(0)) } )
						.attr("width", xScale.rangeBand())
						.attr("fill", fill)
						.attr("stroke", stroke);

				// EXIT
				bars.exit().transition()
					.duration(duration)
					.attr("y", yScale(0) )
					.attr("height", 0 )
					.remove();
				
				// Update the outer dimensions.
				svg .attr("width", width)
					.attr("height", heightWithoutRange);

				if (xAxis && xScale.rangeBand()>=xAxisIfBarsWiderThan) {
					// Update the x-axis.
					if (xAxisTickFormat) {
						// don't just set it directly using xAxis.tickFormat(xAxisTickFormat), 
						// because xAxisTickFormat is a function(d) of the data line
						// whereas xAxis.tickFormat() takes a function of the string used in the domain
						// which might just be a non-human-readable id field
						xAxis.tickFormat(function(x) { return xAxisTickFormat(getDataLine(x)) });
					}
					if (xAxisAnimate) {
						// this approach animates the x-axis onto the screen
						g.select(".x.axis")
							.transition()
							.duration(duration)
								.attr("transform", "translate(0," + yScale(d3.functor(yValueOfXAxis)(data)) + ")")
								.call(xAxis)
					 				.selectAll("text")
									.call(xAxisText);
					} else {
						// this approach immediately presents the x-axis
						g.select(".x.axis")
							.call(xAxis)
								.attr("transform", "translate(0," + yScale(d3.functor(yValueOfXAxis)(data)) + ")")
								.transition()
								.duration(duration)
						 				.selectAll("text")
										.call(xAxisText);
					}
					g.select(".x.axis")
		 				.selectAll("text")
							.on("mouseover", function(x) { mouseOver(this, getDataLine(x)) })
							.on("mouseout", function(x) { mouseOut(this, getDataLine(x)) })
							.call(xAxisText);
					hadXAxis = true;
				} else if (hadXAxis) {
					g.select(".x.axis").selectAll(".tick").remove();
					hadXAxis = false;
				}

				if (yAxis) {
					// Update the y-axis. Note if you turn the yAxis on/off dynamically it won't pick up the change
					var dataMin = d3.min(subdata, function(d) {return d[1]}),
						dataMax = d3.max(subdata, function(d) {return d[1]});
					var tickValues = [0];
					if (yScale(dataMin)-yScale(0)>yNoOverlap) {tickValues.push(dataMin); } // only if it won't overlap 0
					else if (dataMin<0) {tickValues.push(yScale.invert(yScale(0)+yNoOverlap))} // if neg data but min near 0, show domain limit
					if (yScale(dataMax)-yScale(0)<-yNoOverlap) {tickValues.push(dataMax); }
					else if (dataMax>0) {tickValues.push(yScale.invert(yScale(0)-yNoOverlap))} // if pos data but max near 0, show domain limit
					yAxis.scale(yScale).tickValues(tickValues);
					g.select(".y.axis")
							.transition()
							.duration(duration)
							//.attr("transform", "translate(0," + yScale(0) + ")")
							.call(yAxis);
				}
			}

			selection.each(function(data) {
				// generate chart here, using width & height etc;
				// use 'data' for the data and 'this' for the element
				var elt = this;
				update(elt, data);
				// Update the range widget, if present
				// don't put this in the update method or it becomes circular
				if (rangeWidget) {
					rangeWidget.width(width).margin({top:0, right:margin.right, bottom:0, left:margin.left});
					rangeWidget.onDrag(function(start, end) { 
						xDomain = [Math.round(start), Math.round(end)];
						var oldDur = duration;
						duration = 0;
						update(elt, data);
						duration = oldDur;
					});
					d3.select(elt).datum([{
							scale: d3.scale.linear().domain([0,data.length-1]),
							start: xDomain ? xDomain[0] : 0, 
							end: xDomain ? xDomain[1] : data.length-1
						}]).call(rangeWidget);
				}
			});
		}

		// The x-accessor for the path generator; xScale xValue.
		function xX(d) {
			return xScale(d[0]);
		}

		// The y-accessor for the path generator; yScale yValue.
		function yY(d) {
			return yScale(d[1]);
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

		chart.xPadding = function(_) {
			if (!arguments.length) return xPadding;
			xPadding = _;
			return chart;
		};

		chart.xAxisText = function(_) {
			if (!arguments.length) return xAxisText;
			xAxisText = _;
			return chart;
		};

		chart.yMin = function(_) {
			if (!arguments.length) return yMin;
			yMin = _;
			return chart;
		};

		chart.yMax = function(_) {
			if (!arguments.length) return yMax;
			yMax = _;
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

		chart.xAxisIfBarsWiderThan = function(_) {
			if (!arguments.length) return xAxisIfBarsWiderThan;
			xAxisIfBarsWiderThan = _;
			return chart;
		};

		chart.xAxisTickFormat = function(_) {
			if (!arguments.length) return xAxisTickFormat;
			xAxisTickFormat = _;
			return chart;
		};

		chart.xAxisAnimate = function(_) {
			if (!arguments.length) return xAxisAnimate;
			xAxisAnimate = _;
			return chart;
		};

		chart.yValueOfXAxis = function(_) {
			if (!arguments.length) return yValueOfXAxis;
			yValueOfXAxis = _;
			return chart;
		};

		chart.x = function(_) {
			if (!arguments.length) return xValue;
			xValue = _;
			return chart;
		};

		chart.y = function(_) {
			if (!arguments.length) return yValue;
			yValue = _;
			return chart;
		};

		chart.mouseOver = function(_) {
			if (!arguments.length) return mouseOver;
			mouseOver = _;
			return chart;
		};
		
		chart.mouseOut = function(_) {
			if (!arguments.length) return mouseOut;
			mouseOut = _;
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

		chart.xDomain = function(_) {
			if (!arguments.length) return xDomain;
			xDomain = _;
			return chart;
		};

		chart.rangeWidget = function(_) {
			if (!arguments.length) return rangeWidget;
			rangeWidget = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		return chart;
	}

	// attach barChart to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.barChart = barChart;
	return d3;

}(d3, _));
