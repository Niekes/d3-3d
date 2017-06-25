var tape = require('tape');
var d3   = require('../');

tape('draw function of \'triangle_strip\' draws correctly', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLE_STRIP');
    var data = [
        [[0,1,0],[0,0,0],[1,1,0],[1.5,0,0]],
        [[0,10,0],[0,0,0],[10,10,0],[15,0,0]],
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M1.5,0L1,-1L0,0ZM1,-1L0,0L0,-1Z');
    test.deepEqual(_3d.draw(_3d(data)[1]), 'M15,0L10,-10L0,0ZM10,-10L0,0L0,-10Z');
    test.end();
});

tape('\'triangle_strip\' creates n-2 triangles', function(test){
    var regex = /(?=[M])/;
    var _3d = d3._3d().primitiveType('TRIANGLE_STRIP');
    var data = [
        [[0,1,0],[0,0,0],[1,1,0],[1.5,0,0]],
        [[0,10,0],[0,0,0],[10,10,0],[15,0,0],[20,0,0]],
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]).split(regex).length, data[0].length - 2);
    test.deepEqual(_3d.draw(_3d(data)[1]).split(regex).length, data[1].length - 2);
    test.end();
});

tape('access points via function or array', function(test){
    var data1 = [ [[0,1,0],[0,0,0],[1,1,0],[1.5,0,0]], [[0,10,0],[0,0,0],[10,10,0],[15,0,0],[20,0,0]]];
    var data2 = [ [{x: 0, y: 1, z: 0},{x: 0, y: 0, z: 0},{x: 1, y: 1, z: 0},{x: 1.5, y: 0, z: 0}], [{x: 0, y: 10, z: 0},{x: 0, y: 0, z: 0},{x: 10, y: 10, z: 0},{x: 15, y: 0, z: 0},{x: 20, y: 0, z: 0}]];
    var _3d1 = d3._3d().primitiveType('TRIANGLE_STRIP');
    var _3d2 = d3._3d().primitiveType('TRIANGLE_STRIP').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });

    test.deepEqual(_3d1(data1)[0].projected, _3d2(data2)[0].projected);
    test.deepEqual(_3d1(data1)[0].rotated, _3d2(data2)[0].rotated);
    test.deepEqual(_3d1(data1)[0].ccw, _3d2(data2)[0].ccw);

    test.deepEqual(_3d1(data1)[1].projected, _3d2(data2)[1].projected);
    test.deepEqual(_3d1(data1)[1].rotated, _3d2(data2)[1].rotated);
    test.deepEqual(_3d1(data1)[1].ccw, _3d2(data2)[1].ccw);
    test.end();
});
