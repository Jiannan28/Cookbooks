
/**
 * @class
 */
vizuly.svg.text = {}

/**
 * This function creates a single line path that can be used for texts along an arc.
 *  @memberof vizuly.svg.text
 *  @function
 *  @param {number} radius - The radius
 *  @param {number} color1 - The start angle of the arc in degrees.
 *  @returns {d3.svg.arc} - The d3 arc function to be used.
 */
vizuly.svg.text.arcPath = function (radius,startAngle) {
    var radian = 0.0174533;
    var d={};
    d.angle=startAngle;
    d.startAngle = d.angle - (179 * radian);
    d.endAngle  = d.angle + (179 * radian);
    var pd=d3.svg.arc().innerRadius(radius).outerRadius(radius)(d);
    var justArc = /[Mm][\d\.\-e,\s]+[Aa][\d\.\-e,\s]+/;
    var arcD = justArc.exec(pd);

    if (arcD) arcD=arcD[0];
    return arcD;

}

/**
 * This function will take an *SVG text* object and create line wraps at word breaks by converting the
 * *text* object text into separate *tspan* elements.   This works by mutating the inbound *text*.
 *  @memberof vizuly.svg.text
 *  @function
 *  @param {d3.selection} text - The SVG.Text object as a D3 selection.
 *  @param {String} value - The string that will be wrapped.
 *  @param {Number} lineHeight - The desired lineHeight in pixels.
 *  @param {Number} width - The maximum width of the text block in pixels.
 */
vizuly.svg.text.wrap = function (text, value, lineHeight, width) {

    if (!width && text.attr("width")) width = Number(text.attr("width")); else width = width;

    text.each(function() {
        var text = d3.select(this);

        //We need to remove our previous lines of text and put them back.
        text.selectAll("tspan").remove();

        var words = value.split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(lineHeight);
        if (isNaN(dy)) dy=0;
        var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", "0px");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                lineNumber++;
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("class","vz-multi-line").attr("x", x).attr("y", y).attr("dy", + dy + "px").text(word);
                dy = dy + lineHeight;
            }
        }

    });
}
