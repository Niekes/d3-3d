import projections      from './projections.js';
import {points}         from './primitiveTypes/points.js';
import {lines}          from './primitiveTypes/lines.js';
import {linesLoop}      from './primitiveTypes/linesLoop.js';
import {linesStrip}     from './primitiveTypes/linesStrip.js';
import {triangles}      from './primitiveTypes/triangles.js';
import {trianglesStrip} from './primitiveTypes/trianglesStrip.js';
import {trianglesFan}   from './primitiveTypes/trianglesFan.js';
import {drawLines}      from './draw.js';

export default function() {

    var ortho           = projections.ortho,
        persp           = projections.persp,
        projection      = ortho,
        origin          = [0, 0],
        scale           = 1,
        distance        = 1,
        alpha           = 0,
        beta            = 0,
        gamma           = 0,
        primitiveType   = 'POINTS',
        processData = {
            POINTS          : points,
            LINES           : lines,
            LINES_LOOP      : linesLoop,
            LINES_STRIP     : linesStrip,
            TRIANGLES       : triangles,
            TRIANGLES_STRIP : trianglesStrip,
            TRIANGLES_FAN   : trianglesFan
        },
        draw = {
            POINTS : undefined,
            LINES  : drawLines,
        };



    function _3d(data){
        return processData[primitiveType](data, projection, alpha, beta, gamma, origin, scale, distance);
    }

    _3d.projection = function(_){
        return arguments.length ? (projection = _, _3d) : projection;
    };

    _3d.origin = function(_){
        return arguments.length ? (origin = _, _3d) : origin;
    };

    _3d.scale = function(_){
        return arguments.length ? (scale = _, _3d) : scale;
    };

    _3d.distance = function(_){
        return arguments.length ? (distance = _, _3d) : distance;
    };

    _3d.rotateZ = function(_){
        return arguments.length ? (alpha = _, _3d) : alpha;
    };

    _3d.rotateY = function(_){
        return arguments.length ? (beta = _, _3d) : beta;
    };

    _3d.rotateX = function(_){
        return arguments.length ? (gamma = _, _3d) : gamma;
    };

    _3d.primitiveType = function(_){
        return arguments.length ? (primitiveType = _, _3d) : primitiveType;
    };

    _3d.draw = function(d){
        return primitiveType === 'POINTS' ? undefined : draw[primitiveType](d);
    };

    return _3d;
}
