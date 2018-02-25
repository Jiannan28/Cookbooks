# Reusable D3 elements

This package contains the following reusable d3 widgets. All the live examples linked below can be found together [here](http://racingtadpole.com/blog/tag/d3elements/):

- [`barChart`](http://racingtadpole.com/blog/reusable-d3-barchart/): for (vertical) bar charts which can be positive or negative, with categories on the x-axis
- [`timeSeriesChart`](http://racingtadpole.com/blog/d3-bar-chart-with-zoom-and-hover/): a time series chart with optional notes to describe key events
- [`startEndSlider`](http://racingtadpole.com/blog/d3-bar-chart-with-zoom-and-hover/): a range slider which can be hooked into the preceding charts to zoom in and out
- [`flowChord`](http://racingtadpole.com/blog/flows-d3-chord-hover/): a chord diagram specifically designed for flows from one category of things to another, with hovering effects
- `clickPanel`: a simple panel to make it easy to display notes and hover panels
- `simpleList`: a no-frills list

These elements are based on the approach described in the post [Towards reusable charts](http://bost.ocks.org/mike/chart/).

They are all appended to the `d3` module under `d3.elts`.

The complete minified library is available as `dist/d3elements.min.js`.

This library is under development, so the calling syntax may change.

## Bar Chart
    
    <script src="barChart.js"></script>
    <script>
        var points = [['Beagle',-10],['Terrier',30],['Poodle',55],['Greyhound',-24],['Spaniel',19]];
        var myChart = d3.elts.barChart().width(300);
        d3.select("body").datum(points).call(myChart);
    </script>

See `barChart.html` for a slightly more detailed example.

Note this includes a minimalist y-axis, which shows zero, the minimum (if negative) and the maximum (if positive), 
but only if the minimum and maximum would not overlap the zero marker.  
If this does not suit your needs, for now you'll need to comment out the relevant piece of code;
I intend to generalise this at some point.

To see it in action, check out [this simple example](http://racingtadpole.com/blog/reusable-d3-barchart/) or [this example](http://racingtadpole.com/blog/d3-bar-chart-with-zoom-and-hover/) with a range slider.

The options you can append to `d3.elts.barChart()` are:

- `margin`: Margins, leaving room for all the axis labels, eg. `margin({top: 10, right: 30, bottom: 20, left: 50})`
- `width`
- `height`
- `duration`
- `stroke`: can be a color string, eg. `"gray"`, or a function, eg. `function(d) { return d[1]>=0 ? "green" : "red" }`
- `fill`: as `stroke`
- `xPadding`: the second argument to [`rangeBands`](https://github.com/mbostock/d3/wiki/Ordinal-Scales#ordinal_rangeBands)
- `xAxisText`: a function of the x-axis label `text` elements to rotate and translate the label
- `yMax`: a scalar or a function of the entire data set, eg. `function(data) { return Math.max(0, d3.max(data, function(d) {return d[1]})) }`
- `yMin`: a scalar or a function of the entire data set
- `xAxis`: pass a custom `d3.svg.axis()` if desired
- `yAxis`: as `xAxis`
- `x`: a function to pull the x-value out of the data; defaults to `function(d) { return d[0] }`
- `y`: a function to pull the y-value out of the data; defaults to `function(d) { return d[1] }`
- `xAxisIfBarsWiderThan`: pass the label width in pixels, eg. 12; only shows the xAxis if the bars are wide enough to fit the labels
- `xAxisTickFormat`: can be a function of the actual data, not just the primary id, eg. function(d) { return d[2] }
- `xAxisAnimate`: true/false, defaults to true
- `mouseOver`: a hook to handle hover text; pass a function `function(elt, d) {}`
- `mouseOut`: as `mouseOver`
- `svgClass`: the class name to give the svg element; defaults to "bar-chart"
- `rangeWidget`: pass a `startEndSlider` (see below) to enable zooming
- `xDomain`: when using a range widget, pass eg. `[0,30]` to only show the first 30 datapoints initially


## Time Series Chart

(More details to follow)

## Start-End Slider

(More details to follow)

## Flow Chord

    <script src="flowChord.js"></script>
    <script>
        var chordDiagram = d3.elts.flowChord(); //  add options like colours here too
        var matrix = [['Eye colour','Introvert','Extrovert'],['Brown eyes', 0.8, 0.2],['Blue eyes', 0.4, 0.6]];
        d3.select("body").datum(matrix).call(chordDiagram);
    </script>

See `flowChord.html` for a slightly more detailed example, or [here](http://racingtadpole.com/blog/flows-d3-chord-hover/) for a live example.

(More details to follow)


