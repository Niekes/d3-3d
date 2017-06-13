export function drawPolygons(lineStrip){
    var lastPoint = lineStrip[lineStrip.length - 1];
    var line = 'M' + lastPoint.projected.x + ',' + lastPoint.projected.y;
    for (var i = lineStrip.length - 2; i >= 0; i--) {
        var p = lineStrip[i].projected;
        line += 'L' + p.x + ',' + p.y;
    }
    line += 'Z';
    return line;
}
