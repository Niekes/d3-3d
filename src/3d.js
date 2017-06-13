import {points}         from './primitiveTypes/points';
import {lines}          from './primitiveTypes/lines';
import {linesStrip}     from './primitiveTypes/linesStrip';
import {triangles}      from './primitiveTypes/triangles';
import {drawTriangles}  from './draw/drawTriangles';
import {drawLinesStrip} from './draw/drawLinesStrip';
import {x as px, y as py, z as pz } from './point';

/**
 * @author Stefan Nieke / http://niekes.com/
 */

export default function() {

    var origin          = [0, 0],
        scale           = 1,
        angleX          = 0,
        angleY          = 0,
        angleZ          = 0,
        x               = px,
        y               = py,
        z               = pz,
        primitiveType   = 'POINTS',
        processData = {
            'POINTS'     : points,
            'LINES'      : lines,
            'LINE_STRIP' : linesStrip,
            'TRIANGLES'  : triangles,
        },
        draw = {
            TRIANGLES   : drawTriangles,
            LINES_STRIP : drawLinesStrip
        };

    function _3d(data){
        return processData[primitiveType](
            data,
            {scale: scale, origin: origin},
            {x: x, y: y, z: z},
            {x: angleX, y: angleY, z: angleZ
        });
    }

    _3d.origin = function(_){
        return arguments.length ? (origin = _, _3d) : origin;
    };

    _3d.scale = function(_){
        return arguments.length ? (scale = _, _3d) : scale;
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
