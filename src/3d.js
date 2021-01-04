import {cube}          from './primitiveShapes/cube';
import {gridPlane}     from './primitiveShapes/gridPlane';
import {lineStrip}     from './primitiveShapes/lineStrip';
import {line}          from './primitiveShapes/line';
import {plane}         from './primitiveShapes/plane';
import {point}         from './primitiveShapes/point';
import {triangle}      from './primitiveShapes/triangle';

import {drawLineStrip} from './draw/drawLineStrip';
import {drawPlane}     from './draw/drawPlane';
import {drawTriangle}  from './draw/drawTriangle';

import {orthographic}  from './projection-orthographic';

import {x as px, y as py, z as pz } from './point';

/**
* @author Stefan Nieke / http://niekes.com/
*/
export default function() {

    var origin          = [0, 0],
        scale           = 1,
        projection      = orthographic,
        angleX          = 0,
        angleY          = 0,
        angleZ          = 0,
        rotateCenter    = [0,0,0],
        x               = px,
        y               = py,
        z               = pz,
        row             = undefined,
        shape           = 'POINT',
        processData = {
            'CUBE'       : cube,
            'GRID'       : gridPlane,
            'LINE'       : line,
            'LINE_STRIP' : lineStrip,
            'PLANE'      : plane,
            'POINT'      : point,
            'SURFACE'    : gridPlane,
            'TRIANGLE'   : triangle,
        },
        draw = {
            'CUBE'       : drawPlane,
            'GRID'       : drawPlane,
            'LINE_STRIP' : drawLineStrip,
            'PLANE'      : drawPlane,
            'SURFACE'    : drawPlane,
            'TRIANGLE'   : drawTriangle,
        };

    function _3d(data){
        return processData[shape](
            data,
            { scale: scale, origin: origin, project: projection, row: row },
            { x: x, y: y, z: z },
            { x: angleX, y: angleY, z: angleZ, rotateCenter: rotateCenter }
        );
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

    _3d.shape = function(_, r){
        return arguments.length ? (shape = _, row = r, _3d) : shape;
    };

    _3d.rotateCenter = function(_){
        return arguments.length ? (rotateCenter = _, _3d) : rotateCenter;
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

    _3d.sort = function(a, b){
        var _a = a.centroid.z, _b = b.centroid.z;
        return _a < _b ? -1 : _a > _b ? 1 : _a >= _b ? 0 : NaN;
    };

    _3d.draw = function(d){
        if(!((shape === 'POINT') || (shape === 'LINE'))){
            return draw[shape](d);
        }
    };

    return _3d;
}
