/*!
 * D3 Elements v0.1.2 (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014-2015 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */

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

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */

var d3 = (function (d3) {
	"use strict";
	// requires d3
	// adds d3.elts.makeClickPanel

	var makeClickPanel = function(selector) {
		// Make a panel if needed, in the supplied element selector (defaults to "body")
		// Returns a function which other widgets can use to show html in the click panel
		// And includes a dismiss button (x)
		// You can dismiss by calling clickPanel()
		//
		var clickDiv = null,
			offset = {top: 20, left: 11},
			opacity = 0.9,
			autoCloseDuration = 500;

		function clickPanel (elt, html, closeHandler) {
			// if this is called with no arguments, then it is a request to close the panel
			if (typeof elt==="undefined") {
				//console.log("closing");
				clickDiv.transition()
					.duration(autoCloseDuration)
						.style("opacity", 1e-6)
					.transition()
						.style("z-index", "-1")
						.style("visibility", "hidden");
			} else {
				clickDiv.select(".click-panel-body").html(html); // put this first so the width is known below

				clickDiv
					.style("top", function () { 
						return Math.min((d3.event.pageY - offset.top), Math.max(5,window.innerHeight-clickDiv[0][0].offsetHeight))+"px";
					})
					.style("left", function () { 
						return Math.max(offset.left, d3.event.pageX - offset.left - clickDiv[0][0].offsetWidth)+"px";
					}) 
					.style("visibility", "visible")
					.style("z-index", "5")
					.style("opacity", 1e-6)
					.transition()
						.style("opacity", opacity);

				clickDiv.select(".close").on("click", function() {
					clickDiv
						.transition()
							.style("opacity", 1e-6)
							.style("z-index", "-1")
							.style("visibility", "hidden");
					closeHandler();
				});
			}
		}

		// Make the click panel element if needed
		if (typeof selector === "undefined") { selector = "body"; }
		clickDiv = d3.select(selector).selectAll("div.click-panel").data(["dummy"]);
		var panel = clickDiv.enter().append("div").attr("class","click-panel");
		panel.append("div").attr("class","close").html("&times;");
		panel.append("div").attr("class","click-panel-body");

		clickPanel.offset = function(_) {
			if (!arguments.length) return offset;
			offset = _;
			return clickPanel;
		};

		clickPanel.opacity = function(_) {
			if (!arguments.length) return opacity;
			opacity = _;
			return clickPanel;
		};

		clickPanel.autoCloseDuration = function(_) {
			if (!arguments.length) return autoCloseDuration;
			autoCloseDuration = _;
			return clickPanel;
		};

		return clickPanel;

	};

	// attach to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.makeClickPanel = makeClickPanel;
	return d3;

}(d3));

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */
//
// flowChord
//
// A reusable d3 element
// Approach based on http://bost.ocks.org/mike/chart/
// 
// Requires a matrix of flows (an array of arrays).
// Assumes the rows and columns represent different concepts
// The matrix should have row and column headers, which are taken as the labels for the arcs.
// Rows appear on the right, columns on the left of the circle, with the flows
// shown connecting them.  (Use .flip() to transpose the rows and columns.)
// Hovering dims other flows, and optionally shows a popup with provided html.
// Eg.:
//
// 	var chordDiagram = d3.elts.flowChord(); // append options eg. .width(500).flip() etc - see getters and setters list at end
// 	var data = [['Eye colour','Introvert','Extrovert'],['Brown eyes', 0.8, 0.2],['Blue eyes', 0.4, 0.6],['Green eyes', 0.66, 0.34]];
// 	d3.select("body").datum(data).call(chordDiagram);
//
// TODO: allow colors of rows and columns to be set separately
//       change hoverHtml structure (currently keyed off the labels) in case rows and columns have the same label
//

var d3 = (function (d3) {
	'use strict';
	// requires d3
	// adds d3.elts.flowChord

	function flowChord() {
		// call this using selection.call(flowChord); (or just flowChord())
		var margin = {top: 50, right: 50, bottom: 50, left: 50}, // leaves room for labels
			width = 960,
			height = 500,
			arcPadding = 0,
			flip = null,  // append .flip() to transpose the matrix
			hoverFadeOpacity = 0.2,
			colors = d3.scale.category20b(),
			rimWidth = function(outerRadius) {return outerRadius*0.1}, // or use a constant
			hoverHtml = {}, // an object keyed off the row and column labels
			hoverOffset = {top: 60, left: 50},
			svgClass = "chord-diagram",
			hoverClass = "chord-hover",
	    	minAngleForLabel = 0;

		function transpose(A) {
			return A[0].map(function(col, i) { 
				return A.map(function(row) { 
					return row[i];
				});
			});
		}

		function expandedMatrix(A) {
			// given an n x m matrix A, convert to an (n+m) x (n+m) matrix
			// with A in the top right corner and A.transpose in the bottom left corner
			var n = A.length,
					m = A[0].length;
			var big = [];
			for (var i = 0; i < n+m; i++) {
				var row = [];
				for (var j = 0; j < n+m; j++) {
					if ((j>=n) && (i<n)) { 
						row.push(A[i][j-n]); 
					} else {
						if ((j<n) && (i>=n)) { 
							row.push(A[j][i-n]);
						} else {
							row.push(0); 
						}
					}
				}
				big.push(row);
			}
			return big;
		}

		// Returns an event handler for fading a given chord group.
		function fade(svg, opacity) {
			return function(g, i) {
				svg.selectAll(".flows path")
						.filter(function(d) { return d.source.index !== i && d.target.index !== i; })
					.transition()
						.style("opacity", opacity);
			};
		}
		
		function showHover (hoverDiv, d, label) {
			var html = hoverHtml[label];
			if (!html) {
				html = label;
			}
			hoverDiv
				.html(html)
				.style("top", function () { 
					return Math.min((d3.event.pageY - hoverOffset.top), Math.max(5,window.innerHeight-hoverDiv[0][0].offsetHeight))+"px";
				})
				.style("left", function () { 
					return (d3.event.pageX + (d.angle > Math.PI ? -hoverDiv[0][0].offsetWidth-hoverOffset.left : hoverOffset.left))+"px";
				}) 
				.style("visibility", "visible")
				.style("opacity", 1e-6)
				.transition()
					.style("opacity", 1);
		}

		function hideHover (hoverDiv) {
			hoverDiv
				.transition()
					.style("opacity", 1e-6);
					//.style("visibility", "hidden");
		}


		function chart(selection) {
			selection.each(function(data) {
				// generates chart, using width & height etc; 'data' is the data and 'this' is the element
				if (flip) {
					data = transpose(data);
				}
				// take off the labels
				var subMatrix = data.slice(1).map(function(row) { return row.slice(1).map(function(elt) { return +elt }); });
				var colLabels = data[0].slice(1);
				var rowLabels = data.slice(1).map(function(row) { return row[0] });
				var labelText = rowLabels.concat(colLabels); // TODO: check
				var flowMatrix = expandedMatrix(subMatrix);
				var chord = d3.layout.chord()
					.padding(arcPadding)
					.sortSubgroups(function() { return 1; })
					.matrix(flowMatrix);

				var outerRadius = (Math.min(width-margin.left-margin.right, height-margin.top-margin.bottom)/2);
				// Note d3.functor allows for constants or functions
				//  - see https://github.com/mbostock/d3/wiki/Internals#functor
				var innerRadius = outerRadius - d3.functor(rimWidth)(outerRadius);
				
				// Make the hover svg element if needed
				var hoverDiv = d3.select(this).selectAll("div."+hoverClass).data(["TBD"]);
				hoverDiv.enter().append("div").attr("class",hoverClass);

				// Select the svg element, if it exists.
				var svg = d3.select(this).selectAll("svg."+svgClass).data([data]);

				// Otherwise, create the svg and the g which translates the chord diagram properly.
				var gEnter = svg.enter()
								.append("svg").attr("class",svgClass)
									.append("g");
				gEnter.append("g").attr("class", "rim");
				gEnter.append("g").attr("class", "labels");
				gEnter.append("g").attr("class", "flows");

				svg .attr("width", width)
					.attr("height", height);

				// Update the location
				svg.select("g")
					.attr("transform", "translate("+(width+margin.left-margin.right)/2+","+(height+margin.top-margin.bottom)/2+")");

				var rim = svg.select("g.rim")
					.selectAll("path")
					.data(chord.groups);
				rim.enter().append("path");
				rim.style("fill", function(d) { return colors(d.index); })
					.style("stroke", function(d) { return colors(d.index); })
					.attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
					.on("mouseover", function(d,i) {showHover(hoverDiv, d, labelText[d.index]); return fade(svg, hoverFadeOpacity)(d,i)})
					.on("mouseout", function(d,i) {hideHover(hoverDiv); return fade(svg, 1)(d,i)});

				var labels = svg.select("g.labels")
					.selectAll("text")
					.data(chord.groups);
				labels.enter().append("text");
				labels.attr("class", "labels")
					.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
					.attr("dy", ".35em")
					.attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
					.attr("transform", function(d) {
						return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
						"translate(" + (outerRadius + 6) + ")" +
						(d.angle > Math.PI ? "rotate(180)" : "");
					})
					.attr("class", function(d) {return d.index<rowLabels.length ? "row" : "column"})
					.text(function(d) { if ((d.endAngle-d.startAngle)>minAngleForLabel) return labelText[d.index]; }); 

				var flows = svg.select("g.flows")
					.selectAll("path")
					.data(chord.chords);
				flows.enter().append("path");
				flows.attr("d", d3.svg.chord().radius(innerRadius))
					.style("fill", function(d) { return colors(d.target.index); })
					.style("opacity", 1);
			});
		}

		// getters and setters

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

		chart.arcPadding = function(_) {
			if (!arguments.length) return arcPadding;
			arcPadding = _;
			return chart;
		};

		chart.rimWidth = function(_) {
			if (!arguments.length) return rimWidth;
			rimWidth = _;
			return chart;
		};

		chart.colors = function(_) {
			if (!arguments.length) return colors;
			colors = _;
			return chart;
		};

		chart.flip = function() {
			// include chart.flip() to transpose the data before plotting
			flip = true;
			return chart;
		};

		chart.minAngleForLabel = function(_) {
			if (!arguments.length) return minAngleForLabel;
			minAngleForLabel = _;
			return chart;
		};

		chart.hoverFadeOpacity = function(_) {
			if (!arguments.length) return hoverFadeOpacity;
			hoverFadeOpacity = _;
			return chart;
		};

		chart.hoverHtml = function(_) {
			if (!arguments.length) return hoverHtml;
			hoverHtml = _;
			return chart;
		};

		chart.hoverOffset = function(_) {
			if (!arguments.length) return hoverOffset;
			hoverOffset = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.hoverClass = function(_) {
			if (!arguments.length) return hoverClass;
			hoverClass = _;
			return chart;
		};

		return chart;
	}

	// attach to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.flowChord = flowChord;
	return d3;

}(d3));

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

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */

var d3 = (function (d3) {
	"use strict";
	// requires d3
	// adds d3.elts.simpleList

	function simpleList() {
		// approach based on http://bost.ocks.org/mike/chart/
		// call this as, eg.:
		//    var myList = d3.elts.simpleList(); 
		//    d3.select('body').datum([{name:"Newton"}, {name:"Leibniz"}]).call(myList);
		// more options pending
		
		var margin = {top: 20, right: 20, bottom: 20, left: 20},
			width = 600,
			height = 1000,
			duration = 300,
			fontSize = 24,
			lineHeight = 1.5,
			fontColor = "black",
			highlightColor = "orange",
			svgClass = "simple-list",
			listItemClass = "list-item",
			onClick = function() { }; // function(d) { };

		function chart(selection) {
			selection.each(function(data) {
				// Requires data of the format [{name:"Newton"}, {name:"Leibniz"}]
				
				// Returns an event handler for highlighting some text
				function highlight(yayOrNay) {
					return function() {  // function(d,i)
						d3.select(this)
							.attr("fill", yayOrNay ? highlightColor : fontColor);
					};
				}

				// Select the svg element, if it exists.
				var svg = d3.select(this).selectAll("svg."+svgClass).data([data]);

				// Otherwise, create the chart.
				var svgEnter = svg.enter().append("svg");
				svgEnter.attr("class",svgClass).append("g");

				// Update the outer dimensions.
				svg.attr("width", width)
					.attr("height", height);

				// Update the inner dimensions.
				var g = svg.select("g")
						.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				var listItems = g.selectAll("."+listItemClass)
					.data(data, function(d) {return d.name});

				listItems.enter().append("text")
					.attr("class", listItemClass)
					.attr("x", 0)
					.attr("y", function(d,i) {return (i*lineHeight*fontSize)})
					.attr("dy", ".55em")
					.attr("font-size", fontSize)
					.attr("fill", fontColor)
					.attr("cursor", "pointer")
					// .attr("text-anchor", "middle")
					.text(function(d) { return d.name; })
					.style("fill-opacity", 1e-6);

				// Update the list items.  Put mouse evts here in case params change too.
				listItems
					.on("mouseover", highlight(true))
					.on("mouseout", highlight(false))
					.on("click", onClick);
				listItems.transition()
					.duration(duration)
					.style("fill-opacity", 1)
						.text(function(d) { return d.name; });

				listItems.exit().remove();

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

		chart.lineHeight = function(_) {
			if (!arguments.length) return lineHeight;
			lineHeight = _;
			return chart;
		};

		chart.fontSize = function(_) {
			if (!arguments.length) return fontSize;
			fontSize = _;
			return chart;
		};

		chart.fontColor = function(_) {
			if (!arguments.length) return fontColor;
			fontColor = _;
			return chart;
		};

		chart.highlightColor = function(_) {
			if (!arguments.length) return highlightColor;
			highlightColor = _;
			return chart;
		};

		chart.onClick = function(_) {
			if (!arguments.length) return onClick;
			onClick = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.listItemClass = function(_) {
			if (!arguments.length) return listItemClass;
			listItemClass = _;
			return chart;
		};

		return chart;
	}

	// attach to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.simpleList = simpleList;
	return d3;

}(d3));

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true, _ */

var d3 = (function (d3, _) {
	"use strict";
	// requires d3 & underscorejs
	// adds d3.elts.startEndSlider
	
	function startEndSlider() {
		// a reusable d3 element
		// approach based on http://bost.ocks.org/mike/chart/
		// call this as, eg.:
		//    var mySlider = d3.elts.startEndSlider(); 
		//    d3.select('body').datum([{start: new Date("2001-01-01"), end: new Date("2002-01-01")}]).call(mySlider);

		var margin = {top: 0, right: 0, bottom: 0, left: 0}, // but note horizontal sliders are centered vertically
			width = 500,
			height = 30,
			// this is a default scale; it is overridden by any scales provided in the data
			// the scale doesn't have to be a time scale, but does need the domain specified (but not the range)
			// you can't use it with an ordinal scale - instead, pass a linear scale which is based on position in the ordinal scale
			// (you'll need to apply Math.round() to the resulting start and end positions)
			scale = d3.time.scale().domain([new Date("2000-01-01"),new Date("2004-12-31")]),
			// same deal with minRange and maxRange
			minRange = 365*24*3600*1000,
			maxRange = null,
			strokeColor = "gray",  // constant or function
			strokeWidth = 1,
			betweenRectHeight = 20,
			knobFill = "#666",  // constant or function
			knobWidth = 12,
			fillColor = ["lightgray", "gray"],  // uses a gradient between these
			onDrag = function() { },          // function(start, end) { } - callback while dragging
			onDragStart = function() { },     // function(start, end) { } - callback on drag started
			onDragEnd = function() { },       // function(start, end) { } - callback on drag ended
			svgClass = "start-end-slider",
			gradientId = "gradient-startendslider";

		var innerHeight,
			innerWidth,
			localScales
			;

		function chart(selection) {
			// the data should be of the format:
			// { scale: d3.time.scale().domain([new Date("2000-01-01"),new Date("2004-12-31")]), // optional
			//   minRange: ???, // optional, defaults to zero
			//   maxRange: ???, // optional, defaults to full extent
			//   start: ,  // default start position
			//   end: ,    // default end position
			// }

			function thisMinRange(d) {
				if (typeof d.minRange==="undefined") {
					return minRange || 0;
				} else {
					return d.minRange;
				}
			}
			function thisMaxRange(d) {
				if (typeof d.maxRange==="undefined") {
					return maxRange;
				} else {
					return d.maxRange;
				}
			}

			var accumDx = 0;

			function dragBetweenSlider(d, i) {
				/*jshint validthis: true */
				var partialDx = 0;
				var elt = d3.select(this);
				var startKnob = d3.select(this.parentNode).select(".slider-start");
				var endKnob = d3.select(this.parentNode).select(".slider-end");
				var newx = +elt.attr("x") + accumDx + d3.event.dx - partialDx;
				if (newx<0 && accumDx===0) {
					partialDx = newx;
					newx = 0;
				}
				var endx = +endKnob.attr("x") + accumDx + d3.event.dx - partialDx; // note this is the left of the end knob, not the right
				if (endx+knobWidth>innerWidth && accumDx===0) {
					partialDx = endx+knobWidth-innerWidth;
					endx = innerWidth - knobWidth;
					newx -= partialDx;
				}
				if (newx>=0 && endx+knobWidth<=innerWidth) {
					elt.attr("x", newx);
					startKnob.attr("x", newx);
					endKnob.attr("x", endx);
					d.start = localScales[i].invert(newx);
					d.end = localScales[i].invert(endx+knobWidth);
					accumDx = partialDx;
				} else {
					accumDx += d3.event.dx;
				}
			}

			function dragStartKnob(d, i) {
				/*jshint validthis: true */
				var elt = d3.select(this);
				var between = d3.select(this.parentNode).select(".slider-between");
				var newx = d3.event.x;
				if (newx<0) { newx = 0; }
				var newWidth = (+between.attr("x")+(+between.attr("width"))-newx);
				if (newx>=0 && newx<=innerWidth && 
							(d.end-localScales[i].invert(newx))>=thisMinRange(d,i) &&
							(!thisMaxRange(d,i) || (d.end-localScales[i].invert(newx))<=thisMaxRange(d,i))) {
					elt.attr("x", newx);
					between.attr("x", newx);
					between.attr("width", newWidth);
					d.start = localScales[i].invert(newx);
				}
			}

			function dragEndKnob(d, i) {
				/* jshint validthis: true */
				var elt = d3.select(this);
				var between = d3.select(this.parentNode).select(".slider-between");
				var newx = d3.event.x;
				if (newx>innerWidth-knobWidth) { newx = innerWidth-knobWidth; }
				var newWidth = (newx-(+elt.attr("x"))+(+between.attr("width")));
				if (newx>=0 && newx<=innerWidth-knobWidth &&
							(localScales[i].invert(newx) - d.start)>=thisMinRange(d,i) &&
							(!thisMaxRange(d,i) || (localScales[i].invert(newx)-d.start)<=thisMaxRange(d,i))) {
					elt.attr("x", newx);
					between.attr("width", newWidth);
					d.end = localScales[i].invert(newx);
				}
			}

			selection.each(function(data) {

				var elt = d3.select(this);

				innerHeight = height - margin.top - margin.bottom;
				innerWidth = width - margin.left - margin.right;
				localScales = [];

				_.each(data, function(d) {
					if (typeof d.scale!=="undefined") {
						localScales.push(d.scale.range([0, innerWidth]));
					} else {
						localScales.push(scale.range([0, innerWidth]));
					}
				});

				// Select the svg element, if it exists.
				var svg = elt.selectAll("svg."+svgClass).data(data);

				// Otherwise, create it and the slider.
				var svgEnter = svg.enter().append("svg");
				var gEnter = svgEnter.attr("class",svgClass).append("g");

				// function setCursor(value) {
				// 	if (!value) {
				// 		elt.style("cursor","auto");
				// 		elt.select(".slider-between").style("cursor", "grab");
				// 		elt.select(".slider-start").style("cursor", "ew-resize");
				// 		elt.select(".slider-end").style("cursor", "ew-resize");
				// 	} else {
				// 		elt.style("cursor",value);
				// 		elt.select(".slider-between").style("cursor", value);
				// 		elt.select(".slider-start").style("cursor", value);
				// 		elt.select(".slider-end").style("cursor", value);
				// 	}
				// }

				// A function which returns a drag behaviour which calls ondrag
				function drag(doOnDrag, cursorVal) {
					return d3.behavior.drag()
						.on("drag", function(d,i) { doOnDrag.call(this, d,i); onDrag(d.start, d.end); })
						.on("dragstart", function(d) {
							onDragStart(d.start, d.end); 
							accumDx = 0; 
							if (cursorVal==="grabbing") { d3.select(this).style("cursor", "grabbing"); }
							//if (cursorVal) { setCursor(cursorVal); }
						})
						.on("dragend", function(d) {
							onDragEnd(d.start, d.end); 
							if (cursorVal==="grabbing") { d3.select(this).style("cursor", "grab"); }
							//if (cursorVal) { setCursor(null); }
						});
				}

				// Set up a gradient
				var gradient = gEnter.append("linearGradient")
					.attr("id", gradientId)
					.attr("x1", 0).attr("x2", 1).attr("y1", 0).attr("y2", 0); // horizontal
				gradient.append("stop")
					.attr("class", "stop-1")
					.attr("offset", "0%")
					.attr("stop-color", fillColor[0]);
				gradient.append("stop")
					.attr("class", "stop-2")
					.attr("offset", "100%")
					.attr("stop-color", fillColor[1]);

				gEnter.append("line")
					.attr("class", "slider-full-line")
					.attr("stroke", d3.functor(strokeColor))
					.attr("stroke-width", strokeWidth)
					.attr("x1", 0)
					.attr("y1", innerHeight/2)
					.attr("x2", innerWidth)
					.attr("y2", innerHeight/2);
				gEnter.append("rect")
					.attr("class", "slider-between");
				gEnter.append("rect")
					.attr("class", "slider-start");
				gEnter.append("rect")
					.attr("class", "slider-end");

				var g = svg.select("g");
				g.select(".slider-between")
					.attr("fill","url(#"+gradientId+")")
					.attr("x", function(d,i) { return localScales[i](d.start)})
					.attr("y", (innerHeight-betweenRectHeight)/2)
					.attr("width", function(d,i) { return localScales[i](d.end)-localScales[i](d.start)})
					.attr("height", betweenRectHeight)
					.style("cursor", "grab")
					.call(drag(dragBetweenSlider, "grabbing"));
				g.select(".slider-start").attr("fill", d3.functor(knobFill))
					.attr("x", function(d,i) { return localScales[i](d.start)})
					.attr("y", (innerHeight-betweenRectHeight)/2)
					.attr("width", knobWidth)
					.attr("height", betweenRectHeight)
					.style("cursor", "ew-resize")
					.call(drag(dragStartKnob, "ew-resize"));
				g.select(".slider-end").attr("fill", d3.functor(knobFill))
					.attr("x", function(d,i) { return localScales[i](d.end)-knobWidth})
					.attr("y", (innerHeight-betweenRectHeight)/2)
					.attr("width", knobWidth)
					.attr("height", betweenRectHeight)
					.style("cursor", "ew-resize")
					.call(drag(dragEndKnob));
					// drag() should be called with 2nd arg "ew-resize" 
					// but this crashes on the second resize with Mac Firefox 32.0 at least
					// it makes no sense...  

				// Update the outer dimensions.
				svg .attr("width", width)
						.attr("height", height);

				// Update the inner dimensions.
				g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				// Update the line path.
				g.select(".line")
					.attr("stroke",strokeColor)
					.attr("stroke-width",strokeWidth);

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

		chart.scale = function(_) {
			if (!arguments.length) return scale;
			scale = _;
			return chart;
		};

		chart.minRange = function(_) {
			if (!arguments.length) return minRange;
			minRange = _;
			return chart;
		};

		chart.maxRange = function(_) {
			if (!arguments.length) return maxRange;
			maxRange = _;
			return chart;
		};

		chart.strokeColor = function(_) {
			if (!arguments.length) return strokeColor;
			strokeColor = _;
			return chart;
		};

		chart.strokeWidth = function(_) {
			if (!arguments.length) return strokeWidth;
			strokeWidth = _;
			return chart;
		};

		chart.betweenRectHeight = function(_) {
			if (!arguments.length) return betweenRectHeight;
			betweenRectHeight = _;
			return chart;
		};

		chart.knobFill = function(_) {
			if (!arguments.length) return knobFill;
			knobFill = _;
			return chart;
		};

		chart.knobWidth = function(_) {
			if (!arguments.length) return knobWidth;
			knobWidth = _;
			return chart;
		};

		chart.fillColor = function(_) {
			if (!arguments.length) return fillColor;
			fillColor = _;
			return chart;
		};

		chart.onDrag = function(_) {
			if (!arguments.length) return onDrag;
			onDrag = _;
			return chart;
		};
		chart.onDragEnd = function(_) {
			if (!arguments.length) return onDragEnd;
			onDragEnd = _;
			return chart;
		};
		chart.onDragStart = function(_) {
			if (!arguments.length) return onDragStart;
			onDragStart = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.gradientId = function(_) {
			if (!arguments.length) return gradientId;
			gradientId = _;
			return chart;
		};

		return chart;
	}

	// attach startEndSlider to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.startEndSlider = startEndSlider;
	return d3;

}(d3, _));

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true, _, console */

var d3 = (function (d3, _) {
	"use strict";
	// requires d3 & underscorejs
	// adds d3.elts.timeSeriesChart

	function timeSeriesChart() {
		// based on http://bost.ocks.org/mike/chart/time-series-chart.js
		// note this uses underscore.js (just for _.map)
		// The x-accessor for the path generator; xScale ∘ xValue.
		function xX(d) {
			return xScale(d[0]);
		}
		// The x-accessor for the path generator; yScale ∘ yValue.
		function yY(d) {
			return yScale(d[1]);
		}
		var margin = {top: 10, right: 20, bottom: 120, left: 60},
			width = 760,
			height = 120,
			duration = 500,
			svgClass = "time-series-chart",
			highlightedAreaClass = "highlighted-area",
			gradientId = "gradient-timeseries-fill",
			xValue = function(d) { return d[0]; },  // eg. to read date strings myChart.x(function(d) { return d3.time.format("%Y%m%d").parse(d[0]); })
			yValue = function(d) { return +d[1]; },
			xScale = d3.time.scale(),
			yScale = d3.scale.linear(),
			xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0),
			xAxisText = function(textSel) {  // rotates x labels 90 degrees
							textSel.attr("x", -8)
								.attr("y", 0)
								.attr("dy", ".35em")
								.attr("transform", "rotate(-90)")
								.style("text-anchor", "end");
						},
			yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(6).tickSize(6, 0),
			smartYFormat = false, // nicely chooses %s for small y-values
			area = d3.svg.area().x(xX).y1(yY),
			line = d3.svg.line().x(xX).y(yY),
			strokeColor = "gray",
			fillColor = ["lightgray", "gray"],  // uses a gradient
			strokeWidth = 1,
			rangeWidget = null,
			maxNotes = 7,
			notes = null, // eg. an array of objects {startDate: x1, endDate: x2, priority: 1, ... } 
			              // (only startDate and endDate, in the same format as the dates in the main data, are required by this code)
			notesMarkerAttr = {r: 10, stroke: 'white', 'stroke-width': 1}, // a dict of attributes to apply to the notes markers
			notesMarkerStyle = {opacity: 0.82}, // a dict of attributes to apply to the notes markers
			notesMarkerDuration = 500,
			// function called when notes marker is clicked; must call the close handler to hide highlighted range
			notesMarkerClick = function(elt, note, closeHandler) { console.log(elt, note, closeHandler); },
			notesUniqueId = function(d) { return [d.startDate, d.endDate, d.title].join("-")}, // a function to unique identify each note
			xDomain = null, // set this to restrict the x domain
			highlightRange = null,
			onRangeChange = function() {}; // function(data, start, end) {} - hook to eg. show stats on selected range; start & end optional.

		var fullXDomain;

		function update(elt, data) {
			// call with raw data if that's all you've got, otherwise you can pass the processed data
			var heightWithoutRange = height - (rangeWidget ? rangeWidget.height() : 0);

			fullXDomain = d3.extent(data, function(d) { return d[0]; });
			if (!xDomain) { xDomain = fullXDomain }

			var bisect = d3.bisector(function(d) { return d[0] }).left;
			_.each(notes, function(note) {
				// TODO - can we generalize to allow formats other than [x,y] ?
				note.start = xValue([note.startDate]);
				note.end = xValue([note.endDate || note.startDate]);
				note.show = (note.start>=xDomain[0]) && (note.start<=xDomain[1]); // currently only show if start date visible, could change this
				note.startPos = bisect(data, note.start);
				note.endPos = bisect(data, note.end);
				if (note.startPos>=0 && note.startPos<data.length) {
					note.startY = data[note.startPos][1];
				} else {
					note.startY = 0;
				}
			});

			// decide which notes to show based on priority. The num showing must be less than maxNotes.
			// keep hiding higher and higher priority notes until we come in under the max.
			// if no notes have a priority field, better skip this step
			var minShowingPriority = _.min(notes, function(note) {if (note.show) { return note.priority || 0 } else { return 1e6 }}).priority;
			function hideLowPriority(note) { 
				if (note.priority===minShowingPriority) { 
					note.show = false;
				} 
			}
			function notePriority(note) {
				if (note.show) { 
					return note.priority || 0;
				} else { 
					return 1e6;
				}
			}
			while ( (_.filter(notes, function(note) { return note.show }).length > maxNotes) && (typeof minShowingPriority!=="undefined")) {
				// hide notes with the min showing priority
				_.each(notes, hideLowPriority);
				minShowingPriority = _.min(notes, notePriority).priority;
			}

			//console.log("time series chart "+margin.right);
			// Update the x-scale.
			xScale
				.domain(xDomain)
				.range([0, width - margin.left - margin.right]);

			// if you bind the full data, then it shows throught the margins (eg. overlapping the y-axis)
			var subdata = _.filter(data, function(d) { return (d[0]>=xDomain[0] && d[0]<=xDomain[1])});

			// Update the y-scale.
			yScale
				.domain([d3.min(data, function(d) { return d[1]; }), d3.max(data, function(d) { return d[1]; })])
				.range([heightWithoutRange - margin.top - margin.bottom, 0]);

			// Select the svg element, if it exists.
			var svg = d3.select(elt).selectAll("svg."+svgClass).data([subdata]);

			// Otherwise, create the chart.
			var svgEnter = svg.enter().append("svg");
			var gEnter = svgEnter.attr("class",svgClass).append("g");

			// Set up the area fill gradient
			var gradient = gEnter.append("linearGradient")
				.attr("id", gradientId)
				.attr("x1", 0).attr("x2", 1).attr("y1", 0).attr("y2", 0); // horizontal
			gradient.append("stop")
				.attr("class", "stop-1")
				.attr("offset", "0%")
				.attr("stop-color", fillColor[0]);
			gradient.append("stop")
				.attr("class", "stop-2")
				.attr("offset", "100%")
				.attr("stop-color", fillColor[1]);

			gEnter.append("path")
				.attr("class", "area")
				.attr("fill", "url(#"+gradientId+")")
				.attr("d", d3.svg.area().x(xX).y1(function(){return yScale(0)}).y0(yScale(0)));

			gEnter.append("path")
				.attr("class", "line")
				.attr("stroke",strokeColor)
				.attr("stroke-width",strokeWidth)
				.attr("fill", "none")
				.attr("d", d3.svg.line().x(xX).y(function(){return yScale(0)}));

			gEnter.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + yScale(0) + ")");

			gEnter.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(" + xScale(0) + ",0)");

			gEnter.append("g")
				.attr("class", "notes");

			// Update the outer dimensions.
			svg .attr("width", width)
					.attr("height", heightWithoutRange);

			// Update the inner dimensions.
			var g = svg.select("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			// Update the area path.
			g.select(".area")
				.transition()
					.duration(duration)
				.attr("d", area.y0(yScale(0)));

			// Update the gradient (since the gradient id stays the same, no need to change the circles' fill)
			g.select("#"+gradientId+" stop.stop-1").transition().duration(duration).attr("stop-color", fillColor[0]);
			g.select("#"+gradientId+" stop.stop-2").transition().duration(duration).attr("stop-color", fillColor[1]);

			// Update the line path.
			g.select(".line")
				.transition()
				.duration(duration)
				.attr("stroke",strokeColor)
				.attr("stroke-width",strokeWidth)
				.attr("d", line);

			// Update the x-axis.
			g.select(".x.axis")
				.transition()
				.duration(duration)
				.attr("transform", "translate(0," + yScale.range()[0] + ")")
				.call(xAxis)
	 				.selectAll("text")
					.call(xAxisText);
			g.select(".x.axis")
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
			g.select(".y.axis")
				.transition()
				.duration(duration)
				.attr("transform", "translate(" + xScale.range()[0] + ", 0)")
				.call(yAxis);

			// Update highlighted parts of the domain
			var highlightData = highlightRange ? data.slice(highlightRange[0],highlightRange[1]+1) : [];
			var gHighlight = g.selectAll("."+highlightedAreaClass).data([highlightData]);
			gHighlight.enter().append("path")
				.attr("class", highlightedAreaClass);
			gHighlight
				.attr("fill", "#000000")
				.style("opacity", 0.2)  // TODO: generalise?
				.attr("d", area.y0(yScale(0)));

			// Update the notes. Since duration can be set to zero when the range slider is in use, uses a separate "notesMarkerDuration"

			var gNotes = g.select(".notes").selectAll(".note").data(
					_.filter(notes, function(d) { return d.show && (d.priority||0)>=(minShowingPriority||0) }),
					notesUniqueId
				); 
			gNotes.enter()
				.append("circle")
				.attr("class", "note")
				.attr("r", 0)
				.style("opacity", 1e-6)
				.attr("fill", strokeColor)
				.attr("cy", function(d) {return yScale(d.startY)})
				.style("cursor", "pointer");

			if (duration===0) { gNotes.attr("cx", function(d) {return xScale(d.start)}); } // make note markers move promptly if slider moved
			gNotes
				.on("click", function(d) { 
					notesMarkerClick(this, d, noteCloseHandler);
					highlightRange = [d.startPos, d.endPos];
					update(elt, data);
				})
				.transition()
					.duration(duration)
					.attr("fill", strokeColor)
					.attr("cx", function(d) {return xScale(d.start)})  // or slower if the notes themselves have moved (eg with new data)
					.attr("cy", function(d) {return yScale(d.startY)})
				.transition()
					.duration(duration)
						.attr(notesMarkerAttr)
						.style(notesMarkerStyle);
			gNotes.exit()//.transition()
				//.duration(notesMarkerDuration)
					//.attr("r", 0)
					//.style("opacity", 1e-6)
					.remove();

			function noteCloseHandler() {
				highlightRange = [];
				update(elt, data);
			}

		}

		function chart(selection) {
			selection.each(function(rawData) {
				var elt = this;
				// Convert data to standard representation greedily;
				// this is needed for nondeterministic accessors.
				var data = _.map(rawData, function(d, i) {
					return [xValue.call(rawData, d, i), yValue.call(rawData, d, i)];
				});
				// whenever this is called with new data, remove the highlighted range
				highlightRange = [];
				notesMarkerClick();

				update(elt, data);
				if (xDomain) {
					onRangeChange(data, xDomain[0], xDomain[1]);
				} else {
					onRangeChange(data);
				}

				// Update the range widget, if present
				// don't put this in the update method or it becomes circular
				if (rangeWidget) {
					rangeWidget.width(width).margin({top:0, right:margin.right, bottom:0, left:margin.left});
					rangeWidget.onDrag(function(start, end) { 
						xDomain = [start, end]; 
						var oldDur = duration;
						duration = 0;
						update(elt, data);
						duration = oldDur;
						onRangeChange(data, start, end);
					});
					d3.select(elt).datum([{
							scale: xScale.copy().domain(fullXDomain),
							start: xDomain ? xDomain[0] : fullXDomain[0], 
							end: xDomain ? xDomain[1] : fullXDomain[1]
						}]).call(rangeWidget);
				}
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

		chart.xAxisText = function(_) {
			if (!arguments.length) return xAxisText;
			xAxisText = _;
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

		chart.xDomain = function(_) {
			if (!arguments.length) return xDomain;
			xDomain = _;
			return chart;
		};

		chart.maxNotes = function(_) {
			if (!arguments.length) return maxNotes;
			maxNotes = _;
			return chart;
		};

		chart.notes = function(_) {
			if (!arguments.length) return notes;
			notes = _;
			return chart;
		};

		chart.notesMarkerAttr = function(_) {
			if (!arguments.length) return notesMarkerAttr;
			notesMarkerAttr = _;
			return chart;
		};

		chart.notesMarkerStyle = function(_) {
			if (!arguments.length) return notesMarkerStyle;
			notesMarkerStyle = _;
			return chart;
		};

		chart.notesMarkerClick = function(_) {
			if (!arguments.length) return notesMarkerClick;
			notesMarkerClick = _;
			return chart;
		};

		chart.notesMarkerDuration = function(_) {
			if (!arguments.length) return notesMarkerDuration;
			notesMarkerDuration = _;
			return chart;
		};

		chart.notesUniqueId = function(_) {
			if (!arguments.length) return notesUniqueId;
			notesUniqueId = _;
			return chart;
		};

		chart.rangeWidget = function(_) {
			if (!arguments.length) return rangeWidget;
			rangeWidget = _;
			return chart;
		};

		chart.highlightRange = function(_) {
			if (!arguments.length) return highlightRange;
			highlightRange = _;
			return chart;
		};

		chart.onRangeChange = function(_) {
			if (!arguments.length) return onRangeChange;
			onRangeChange = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.highlightedAreaClass = function(_) {
			if (!arguments.length) return highlightedAreaClass;
			highlightedAreaClass = _;
			return chart;
		};

		chart.gradientId = function(_) {
			if (!arguments.length) return gradientId;
			gradientId = _;
			return chart;
		};

		return chart;
	}


	// attach timeSeriesChart to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.timeSeriesChart = timeSeriesChart;
	return d3;

}(d3, _));

/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */

var d3 = (function (d3) {
	"use strict";
	// requires d3
	// adds d3.elts.treeDiagram

	// TODO: add a better description

	function treeDiagram() { // note no argument

		// a reusable d3 element
		// this is a bit unusual, as it does not create its own svg element - you must create your own beforehand 
		// eg. <svg width="300" height="300"><g id="tree" transform="translate(150,0)scale(120,120)"></g></svg>
		//     var myTree = d3.elts.treeDiagram();
		//     d3.select("#tree").datum(treeData).call(myTree);

		var width = 1,
			height = 1,
			levelSpacing = 1,  // spacing of each level in tree
			duration = 500,
			nodeRadius = 0.1,
			linkStrokeColor = "#CCCCCC", // can be function or constant
			linkStrokeWidth = 0.02, // can be function or constant, eg:
			// linkStrokeWidth = function(d) {return Math.max(linkStrokeWidth/3, linkStrokeWidth*d.target.Weight*d.source.children.length)},
			nodeStrokeWidth = 0.01,
			swellScale = 1.25,
			//rotate = false,  // place a rotation field in the data if desired
			infoWidget = null, // also, pass the element on which to call the infoWidget, in the data field infoElement (defaults to d3.select("body"))
			treeShades = {},
			treeClass = "tree-diagram",
			wrapHoverLabelClass = "",
			nameField = "name",
			colorName = "blue",  // a default - override this with a colorName field in the data
			mouseOver = function() {}, // function(elt, d, label) {} - occurs on mouseOver node
			mouseOut = function() {}; // function(elt, d, label) {} - occurs on mouseOut node
		
			function nodeFill(d) { 
				return d._children ? "#999999" : "#CCCCCC"; 
			}
			function selectedNodeFill() { // receives argument d 
				return "steelblue"; 
			}

		// Collapse node
		function collapse(d) {
			if (d.children) {
				d._children = d.children;
				d.children = null;
			}
		}
		// Expand node
		function expand(d) {
			if (d._children) {
				d.children = d._children;
				d._children = null;
			}
		}
		// Expand node, collapse all others
		function expandOnly(d) {
			if (d.parent) {
				// collapse all siblings, including this one
				d.parent.children.forEach(collapse);
			}
			// expand
			expand(d);
			// go up a level and repeat
			if (d.parent) {
				expandOnly(d.parent);
			}
		}

		// Toggle children
		// function toggle(d) {
		// 	if (d.children) {
		// 		d._children = d.children;
		// 		d.children = null;
		// 	} else {
		// 		d.children = d._children;
		// 		d._children = null;
		// 	}
		// }

		function collapseAll(d) {
			if (d && d.children) {
				d.children.forEach(collapseAll);
				collapse(d);
			}
		}

		// Returns an event handler for swelling a node
		function swell(vis, scale) {
			return function(d) {
				vis.selectAll(".node circle")
						.filter(function(dd) { return (d.id===dd.id) })
					.transition()
						.duration(duration/2)
						.attr("r", nodeRadius * scale);
			};
		}

		function parent(d) {
			// returns the parent node if available, else the same node
			if (d.parent) { return d.parent; }
			else { return d; }
		}

		function chart(selection) {

			var nodeNum = 0,
				tree = d3.layout.tree(),
				diagonal = d3.svg.diagonal().projection(function(d) { return [d.x, d.y]; });

			// Returns an event handler for highlighting a node
			function highlight(vis) {  // also a second argument colorName passed
				return function(d) {
					vis.selectAll(".node circle")
							.filter(function(dd) { return (d.id!==dd.id) })
							.style("fill", d3.functor(nodeFill) );
					vis.selectAll(".node circle")
							.filter(function(dd) { return (d.id===dd.id); })
							.style("fill", d3.functor(selectedNodeFill) );
				};
			}

			function update(element, data) {

				var rotation = (typeof data.rotation!=="undefined") ? data.rotation : 0;
				var colorName = (typeof data.colorName!=="undefined") ? data.colorName : colorName;

				tree.size([width, height]);
				data.x0 = width/2;
				data.y0 = 0;
				
				// Compute the tree layout
				var nodes = tree.nodes(data).reverse();

				// Work inside a group of class treeClass - create it if necessary
				var vis = d3.select(element).selectAll("g."+treeClass).data([data]);
				vis.enter().append("g")
					.attr("class", treeClass)
					.attr("transform", function() { // only apply the rotation once at the start
						return "rotate("+rotation+","+(data.x)+","+(data.y)+")";
					});

				vis.transition()
					.duration(duration) // but we may need to re-center the root node since expanding the hierarchy can move it
					.attr("transform", function() { 
						return "translate(" + (-data.x) + "," + (-data.y) + ") " + 
							"rotate("+rotation+","+(data.x)+","+(data.y)+")"; 
					});

				// Normalize for fixed-depth.
				nodes.forEach(function(d) { d.y = d.depth * levelSpacing; });

				// Update the nodes
				var node = vis.selectAll("g.node")
						.data(nodes, function(d) { return d.id || (d.id = ++nodeNum); });

				// Enter any new nodes at the parent's previous position.
				var nodeEnter = node.enter().append("svg:g")
						.attr("class", "node")
						.attr("transform", function(d) { var p=parent(d); return "translate(" + p.x0 + "," + p.y0 + ")"; })
						.on("mouseover", function(d, i) { 
							if (wrapHoverLabelClass) {
								mouseOver(this, d, "<div class='"+wrapHoverLabelClass+"'>"+d[nameField]+"</div>");
							} else {
								mouseOver(this, d, d[nameField]);
							}
							swell(vis, swellScale)(d,i);
						 })
						.on("mouseout", function(d, i) { mouseOut(this, d, d[nameField]); swell(vis, 1)(d,i); })
						.on("click", function(d, i) { 
							//mouseOut(this, d, d[nameField]);
							swell(vis, 1)(d,i); 
							expandOnly(d);
							highlight(vis, colorName)(d,i);
							update(element, data);
							if (infoWidget) {
								infoWidget.colorName(colorName);
								var elt = (typeof data.infoElement!=="undefined" ? data.infoElement : d3.select("body"));
								elt.datum([d]).call(infoWidget.show());
							}
						});

				nodeEnter.append("svg:circle")
						.attr("r", 1e-6)
						.style("fill", d3.functor(nodeFill))
						.style("stroke-width", d3.functor(nodeStrokeWidth)) 
						.style("opacity", 1);  // want 1e-6, but sometimes the opacity doesn't finish updating

				node.style("fill", d3.functor(nodeFill))
					.style("stroke-width", d3.functor(nodeStrokeWidth));

				// Transition nodes to their new position.
				var nodeUpdate = node.transition()
						.duration(duration)
						.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

				nodeUpdate.select("circle")
						.attr("r", nodeRadius)
						.style("opacity", 1);

				nodeUpdate.selectAll("text")
						.style("fill-opacity", 1);

				// Transition exiting nodes to the parent's new position.
				var nodeExit = node.exit().transition()
						.duration(duration)
						.attr("transform", function(d) { var p=parent(d); return "translate(" + p.x + "," + p.y + ")"; })
						.remove();

				nodeExit.select("circle")
						.attr("r", 1e-6);

				nodeExit.select("text")
						.style("fill-opacity", 1e-6);

				// Update the links…
				var link = vis.selectAll("path.link")
						.data(tree.links(nodes), function(d) { return d.target.id; });

				// Enter any new links at the parent's previous position.
				link.enter().insert("svg:path", "g")
						.attr("class", "link")
						.style("stroke", d3.functor(linkStrokeColor))
						.style("stroke-width", d3.functor(linkStrokeWidth))
						.style("fill","none")
						.attr("d", function(d) {
							var o = {x: d.source.x0, y: d.source.y0};
							return diagonal({source: o, target: o});
						})
					.transition()
						.duration(duration)
						.attr("d", diagonal);

				// Transition links to their new position.
				link.transition()
						.duration(duration)
						.attr("d", diagonal);

				// Transition exiting nodes to the parent's new position.
				link.exit().transition()
						.duration(duration)
						.attr("d", function(d) {
							var o = {x: d.source.x, y: d.source.y};
							return diagonal({source: o, target: o});
						})
						.remove();

				// Stash the old positions for transition.
				nodes.forEach(function(d) {
					d.x0 = d.x;
					d.y0 = d.y;
				});
			}
			
			selection.each(function(data) {
				//
				// Note this is scaled so that size 1 is the outer radius of the spinner
				//
				// Collapse the nodes to the first layer
				if (data.children) {
					data.children.forEach(collapseAll);
				}

				update(this, data);
			});
		}

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

		chart.levelSpacing = function(_) {
			if (!arguments.length) return levelSpacing;
			levelSpacing = _;
			return chart;
		};

		chart.infoWidget = function(_) {
			if (!arguments.length) return infoWidget;
			infoWidget = _;
			return chart;
		};

		chart.linkStrokeColor = function(_) {
			if (!arguments.length) return linkStrokeColor;
			linkStrokeColor = _;
			return chart;
		};

		chart.linkStrokeWidth = function(_) {
			if (!arguments.length) return linkStrokeWidth;
			linkStrokeWidth = _;
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

		chart.treeShades = function(_) {
			if (!arguments.length) return treeShades;
			treeShades = _;
			return chart;
		};

		chart.treeClass = function(_) {
			if (!arguments.length) return treeClass;
			treeClass = _;
			return chart;
		};

		chart.wrapHoverLabelClass = function(_) {
			if (!arguments.length) return wrapHoverLabelClass;
			wrapHoverLabelClass = _;
			return chart;
		};

		chart.nameField = function(_) {
			if (!arguments.length) return nameField;
			nameField = _;
			return chart;
		};

		chart.colorName = function(_) {
			if (!arguments.length) return colorName;
			colorName = _;
			return chart;
		};

		chart.nodeFill = function(_) {
			if (!arguments.length) return nodeFill;
			nodeFill = _;
			return chart;
		};

		chart.selectedNodeFill = function(_) {
			if (!arguments.length) return selectedNodeFill;
			selectedNodeFill = _;
			return chart;
		};

		return chart;

	}

	// attach to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.treeDiagram = treeDiagram;
	return d3;

}(d3));

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
