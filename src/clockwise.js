export function clockwise(polygon) {

    var _polygon = polygon.slice(0), sum = 0;

    _polygon.push(_polygon[0]);

    for (var i = polygon.length - 1; i >= 0; i--) {

        var p1 = _polygon[i].rotated;
        var p2 = _polygon[i + 1].rotated;

        sum += (p2.x - p1.x)*(p2.y + p1.y);
    }

    return sum > 0 ? true : false;
}
