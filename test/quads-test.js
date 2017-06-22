var tape = require('tape');
var d3   = require('../');

tape('quads\' centroid calculation is correct', function(test){
    var _3d = d3._3d().primitiveType('QUADS').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    var data = [
        [ {x: 1, y: 1, z: 0}, {x: -1, y: 1, z: 0}, {x: 1, y:-1, z: 1}, {x: -1, y: -1, z: 1}],
    ];
    test.deepEqual(_3d(data)[0].centroid, { x: 0, y: 0, z: 0.5 });
    test.end();
});

tape('draw function of \'quads\' draws correctly', function(test){
    var _3d = d3._3d().primitiveType('QUADS');
    var data = [
        [[5,0,2],[6,4,1],[4,5,8],[1,5,9]]
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M5,0L6,-4L4,-5L1,-5Z');
    test.end();
});
