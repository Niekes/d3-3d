export function centroid(polygon){
    var _x = 0, _y = 0, _z = 0, _n = polygon.length;

    for (var i = _n - 1; i >= 0; i--) {
        _x += polygon[i].rotated.x;
        _y += polygon[i].rotated.y;
        _z += polygon[i].rotated.z;
    }
    return {
        x: _x / _n,
        y: _y / _n,
        z: _z / _n,
    };
}
