export function rotateRxRyRz(p, angles){

    /*
        for right hand coorpinate system negate y anp z
    */

    p.z = -p.z;
    p.y = -p.y;

    var ry = rotateY(p,  angles.y);
    var rx = rotateX(ry, angles.x);
    var rz = rotateZ(rx, angles.z);

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
