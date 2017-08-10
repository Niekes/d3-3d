export function rotateRxRyRz(po, angles, pivot){

    po.x -= pivot[0];
    po.y -= pivot[1];
    po.z -= pivot[2];

    var ry = rotateY(po, angles.y);
    var rx = rotateX(ry, angles.x);
    var rz = rotateZ(rx, angles.z);

    rz.x += pivot[0];
    rz.y += pivot[1];
    rz.z += pivot[2];

    return rz;
}

function rotateX(p, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: p.x,
        y: p.y * ca - p.z * sa,
        z: p.y * sa + p.z * ca
    };
}

function rotateY(p, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: p.z * sa + p.x * ca,
        y: p.y,
        z: p.z * ca - p.x * sa
    };
}

function rotateZ(p, a){
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    return {
        x: p.x * ca - p.y * sa,
        y: p.y * sa + p.y * ca,
        z: p.z
    };
}
