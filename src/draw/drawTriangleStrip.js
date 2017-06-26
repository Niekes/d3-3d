export function drawTriangleStrip(triangleStrip){

    var path = '';

    for (var i = triangleStrip.length - 1; i >= 2; i--) {

        var j = i - 1;
        var k = j - 1;

        var v0 = triangleStrip[i].projected;
        var v1 = triangleStrip[j].projected;
        var v2 = triangleStrip[k].projected;

        path += 'M' + v1.x + ',' + v1.y + ' ' + v0.x + ',' + v0.y + ' ' + v2.x + ',' + v2.y;
    }

    path += 'Z';

	return path;
}
