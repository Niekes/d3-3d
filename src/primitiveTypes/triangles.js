import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function triangles(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var tri      = data[i];

        var p1       = tri[0];
        var p2       = tri[1];
        var p3       = tri[2];

        p1.rotated   = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles, options.pivot);
        p2.rotated   = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles, options.pivot);
        p3.rotated   = rotateRxRyRz({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles, options.pivot);

        p1.projected = project(p1.rotated, options);
        p2.projected = project(p2.rotated, options);
        p3.projected = project(p3.rotated, options);

        tri.ccw      = ccw(tri);
        tri.centroid = centroid(tri);
        tri.lightAngle = angleCos(tri.centroid);
    }
    return data;
}

function angleCos(v){
    var lightSource = {x: 0, y: 0, z: -10},
        vLength = vectorLenght(v),
        lLength = vectorLenght(lightSource),
        dotProduct = (v.x*lightSource.x)+(v.y*lightSource.y)+(v.z*lightSource.z);
    return dotProduct / (vLength * lLength);
}

function vectorLenght(v){
    return Math.sqrt( (v.x*v.x) + (v.y*v.y) + (v.z*v.z) );
}
