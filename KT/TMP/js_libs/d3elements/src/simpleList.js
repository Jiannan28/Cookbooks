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
