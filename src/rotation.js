export function rotateRzRyRx(po, angles){

    var rc = angles.rotateCenter;

    po.x -= rc[0];
    po.y -= rc[1];
    po.z -= rc[2];

    var rz = rotateZ(po, angles.z);
    var ry = rotateY(rz, angles.y);
    var rx = rotateX(ry, angles.x);

    rx.x += rc[0];
    rx.y += rc[1];
    rx.z += rc[2];

    return rx;
}

function rotateX(p, a){
    var sa = Math.sin(a), ca = Math.cos(a);
    return {
        x: p.x,
        y: p.y * ca - p.z * sa,
        z: p.y * sa + p.z * ca
    };
}

function rotateY(p, a){
    var sa = Math.sin(a), ca = Math.cos(a);
    return {
        x: p.z * sa + p.x * ca,
        y: p.y,
        z: p.z * ca - p.x * sa
    };
}

function rotateZ(p, a){
    var sa = Math.sin(a), ca = Math.cos(a);
    return {
        x: p.x * ca - p.y * sa,
        y: p.x * sa + p.y * ca,
        z: p.z
    };
}
