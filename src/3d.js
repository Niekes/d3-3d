import {points}         from './primitiveTypes/points';
import {lines}          from './primitiveTypes/lines';
import {linesLoop}      from './primitiveTypes/linesLoop';
import {linesStrip}     from './primitiveTypes/linesStrip';
import {triangles}      from './primitiveTypes/triangles';
import {trianglesStrip} from './primitiveTypes/trianglesStrip';
import {trianglesFan}   from './primitiveTypes/trianglesFan';
import {drawTriangles}  from './draw/drawTriangles';
import {x as pointX, y as pointY, z as pointZ } from './point';

/**
 * @author Stefan Nieke / http://niekes.com/
 */

export default function() {

    var origin          = [0, 0],
        scale           = 1,
        distance        = 1,
        angleX          = 0,
        angleY          = 0,
        angleZ          = 0,
        x               = pointX,
        y               = pointY,
        z               = pointZ,
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
            TRIANGLES   : drawTriangles
        };


    function _3d(data){
        return processData[primitiveType](data, angleX, angleY, angleZ, origin, scale, distance);
    }

    _3d.origin = function(_){
        return arguments.length ? (origin = _, _3d) : origin;
    };

    _3d.scale = function(_){
        return arguments.length ? (scale = _, _3d) : scale;
    };

    _3d.distance = function(_){
        return arguments.length ? (distance = _, _3d) : distance;
    };

    _3d.rotateX = function(_){
        return arguments.length ? (angleX = _, _3d) : angleX;
    };

    _3d.rotateY = function(_){
        return arguments.length ? (angleY = _, _3d) : angleY;
    };

    _3d.rotateZ = function(_){
        return arguments.length ? (angleZ = _, _3d) : angleZ;
    };

    _3d.primitiveType = function(_){
        return arguments.length ? (primitiveType = _, _3d) : primitiveType;
    };

    _3d.x = function(_){
        return arguments.length ? (x = typeof _ === 'function' ? _ : +_, _3d) : x;
    };

    _3d.y = function(_){
        return arguments.length ? (y = typeof _ === 'function' ? _ : +_, _3d) : y;
    };

    _3d.z = function(_){
        return arguments.length ? (z = typeof _ === 'function' ? _ : +_, _3d) : z;
    };

    _3d.draw = function(d){
        if(!((primitiveType === 'POINTS') || (primitiveType === 'LINES'))){
            return draw[primitiveType](d);
        }
    };

    return _3d;
}
