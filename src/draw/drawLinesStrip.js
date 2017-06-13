export function drawLinesStrip(lineStrip){
    var lastPoint = lineStrip[lineStrip.length - 1];
    var line = 'M' + lastPoint.projected.x + ',' + lastPoint.projected.y;
    for (var i = lineStrip.length - 2; i >= 0; i--) {
        var x = lineStrip[i].projected.x;
        var y = lineStrip[i].projected.y;
        line += 'L' + x + ',' + y;
    }
    return line;
}
