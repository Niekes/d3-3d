import {lineStrip}                  from './primitiveTypes/lineStrip';
import {lines}                      from './primitiveTypes/lines';
import {points}                     from './primitiveTypes/points';
import {polygons}                   from './primitiveTypes/polygons';
import {quadStrip}                  from './primitiveTypes/quadStrip';
import {quads}                      from './primitiveTypes/quads';
import {triangleStrip}              from './primitiveTypes/triangleStrip';
import {triangles}                  from './primitiveTypes/triangles';

import {drawLineStrip}              from './draw/drawLineStrip';
import {drawPolygons}               from './draw/drawPolygons';
import {drawQuadStrip}              from './draw/drawQuadStrip';
import {drawQuads}                  from './draw/drawQuads';
import {drawTriangleStrip}          from './draw/drawTriangleStrip';
import {drawTriangles}              from './draw/drawTriangles';

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
            'LINE_STRIP'    : lineStrip,
            'LINES'         : lines,
            'POINTS'        : points,
            'POLYGONS'      : polygons,
            'QUAD_STRIP'    : quadStrip,
            'QUADS'         : quads,
            'TRIANGLE_STRIP': triangleStrip,
            'TRIANGLES'     : triangles,
        },
        draw = {
            'LINE_STRIP'       : drawLineStrip,
            'POLYGONS'         : drawPolygons,
            'QUAD_STRIP'       : drawQuadStrip,
            'QUADS'            : drawQuads,
            'TRIANGLE_STRIP'   : drawTriangleStrip,
            'TRIANGLES'        : drawTriangles,
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
