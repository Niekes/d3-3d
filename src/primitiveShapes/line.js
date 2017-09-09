import {centroid}       from '../centroid';
import {rotateRzRyRx}   from '../rotation';

export function line(lines, options, point, angles){

    for (var i = lines.length - 1; i >= 0; i--) {

        var line      = lines[i];

        var p1        = line[0];
        var p2        = line[1];

        p1.rotated    = rotateRzRyRx({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated    = rotateRzRyRx({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);

        p1.projected  = options.project(p1.rotated, options);
        p2.projected  = options.project(p2.rotated, options);

        line.centroid = centroid(line);
    }
    return lines;
}
