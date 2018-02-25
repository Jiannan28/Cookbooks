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
