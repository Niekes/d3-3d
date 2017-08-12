export function drawPolygon(d){
    var lastPoint = d[d.length - 1];
    var path = 'M' + lastPoint.projected.x + ',' + lastPoint.projected.y;
    for (var i = d.length - 2; i >= 0; i--) {
        var p = d[i].projected;
        path += 'L' + p.x + ',' + p.y;
    }
    path += 'Z';
    return path;
}
