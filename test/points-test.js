var tape = require('tape');
var d3   = require('../');

tape('points don\'t have draw function', function(test){
    var _3d = d3._3d();
    test.equal(_3d.draw(), undefined);
    test.end();
});

tape('access point coords via array', function(test){
    var _3d = d3._3d();
    var data = [[1,2,3],[4,5,6]];
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.end();
});

tape('access point coords via function', function(test){
    var data = [{x: 1, y: 2, z: 3}, {x: 4, y: 5, z: 6}];
    var _3d = d3._3d().x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.end();
});

tape('rotate zero point along x axis by 180°', function(test){
    var data = [{x: 0, y: 0, z: 0}];
    var _3d = d3._3d().rotateX(Math.PI).x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    test.deepEqual(_3d(data)[0].rotated, {x: 0, y: 0, z: 0});
    test.end();
});

tape('rotate point 1|1|1 along x axis by 180°', function(test){
    var data = [{x: 1, y: 1, z: 1}];
    var _3d = d3._3d().rotateX(Math.PI).x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    test.deepEqual(_3d(data)[0].rotated, {x: 1, y: -1.0000000000000002, z: -0.9999999999999999});
    test.end();
});

tape('project point 1|1|1 on to screen', function(test){
    var data = [[1,1,1]];
    var _3d = d3._3d().scale(100);
    test.deepEqual(_3d(data)[0].projected, {x: 100, y: -100});
    test.end();
});
