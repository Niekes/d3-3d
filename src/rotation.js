export function rotateRxRyRz(d, a, b, g){
    // b = y, g = x, z = a
    d.z = -d.z;
    d.y = -d.y;

    var ry = rotateY(d,  b);
    var rx = rotateX(ry, g);

    return rx;
}

function rotateX(d, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: d.x,
        y: d.y * ca - d.z * sa,
        z: d.y * sa + d.z * ca
    };
}

function rotateY(d, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: d.z * sa + d.x * ca,
        y: d.y,
        z: d.z * ca - d.x * sa
    };
}

function rotateZ(d, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: d.x * ca - d.y * sa,
        y: d.y * sa + d.y * ca,
        z: d.z
    };
}
