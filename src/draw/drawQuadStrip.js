export function drawQuadStrip(quadStrip){

    var path = '';

    for (var i = quadStrip.length - 1; i >= 2; i = i - 2) {

        var h = i - 1;
        var g = h - 1;
        var f = g - 1;

        var v0 = quadStrip[i].projected;
        var v1 = quadStrip[h].projected;
        var v2 = quadStrip[g].projected;
        var v3 = quadStrip[f].projected;

        path += 'M' + v0.x + ',' + v0.y + 'L' + v1.x + ',' + v1.y + 'M' + v2.x + ',' + v2.y + 'L' + v0.x + ',' + v0.y + 'M' + v3.x + ',' + v3.y + 'L' + v1.x + ',' + v1.y;
    }

    var _v = quadStrip[0].projected, _w = quadStrip[1].projected;

    path += 'M' + _v.x + ',' + _v.y + 'L' + _w.x + ',' + _w.y;

	return path;
}
