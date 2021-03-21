import { test } from 'tape';
import * as d3 from '../';

test('planes\' centroid calculation is correct', function(t){


    var _3d = d3._3d().shape('PLANE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    var data = [
        [ {x: 1, y: 1, z: 0}, {x: -1, y: 1, z: 0}, {x: 1, y:-1, z: 1}, {x: -1, y: -1, z: 1}],
    ];
    t.deepEqual(_3d(data)[0].centroid, { x: 0, y: 0, z: 0.5 });
    t.end();
});

test('draw function of \'planes\' draws correctly', function(t){
    var _3d = d3._3d().shape('PLANE');
    var data = [
        [[5,0,2],[6,4,1],[4,5,8],[1,5,9]]
    ];
    t.deepEqual(_3d.draw(_3d(data)[0]), 'M5,0L6,4L4,5L1,5Z');
    t.end();
});

test('planes are drawn counter-clockwise', function(t){
    var _3d = d3._3d().shape('PLANE');
    var data = [
        [[-1,0,0],[1,0,0],[1,1,0],[-1,1,0]]
    ];
    t.deepEqual(_3d(data)[0].ccw, false);
    t.end();
});
