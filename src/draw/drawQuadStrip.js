export function drawQuadStrip(quadStrip){

    var path = '';

    for (var i = quadStrip.length - 1; i >= 2; i--) {

        var j = i - 1;
        var k = j - 1;

        var v0 = quadStrip[i].projected;
        var v1 = quadStrip[j].projected;
        var v2 = quadStrip[k].projected;

        path += 'M' + v0.x + ',' + v0.y + 'L' + v1.x + ',' + v1.y + 'L' + v2.x + ',' + v2.y + 'Z';
    }

	return path;
}
