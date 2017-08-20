export function ccw(polygon) {

    var _p = polygon.slice(0), sum = 0;

    _p.push(_p[0]);

    for (var i = 0; i <= polygon.length - 1; i++) {

        var j  = i + 1;
        var p1 = _p[i].rotated;
        var p2 = _p[j].rotated;

        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    // if the area is positive
    // the curve is counter-clockwise
    // because of the flipped y-Axis in the browser
    return sum > 0 ? true : false;
}
