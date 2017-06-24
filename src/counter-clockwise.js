export function ccw(polygon) {

    var _p = polygon.slice(0), sum = 0;

    _p[polygon.length] = _p[0];

    for (var i = 0; i <= polygon.length - 1; i = i + 1) {

        var j  = i + 1;
        var p1 = _p[i].rotated;
        var p2 = _p[j].rotated;

        sum = sum + (p2.x - p1.x) * (p2.y + p1.y);
    }

    return sum < 0 ? true : false;
}
