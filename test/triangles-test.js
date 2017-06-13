var tape = require('tape');
var d3   = require('../');

tape('triangle draw', function(test){
	var _3d = d3._3d().primitiveType('TRIANGLES').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
	var data = [
		[{x: 0, y: 0, z: 0},{x: 0, y: 1, z: 0},{x: 1, y: 0, z: 0}]
	];
	test.equal(_3d.draw(_3d(data)[0]), 'M0,0L0,-1L1,0Z');
	test.end();
});

tape('access triangle coords via array', function(test){
    var _3d = d3._3d();
    var data = [[1,2,3],[4,5,6],[7,8,9]];
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: -2, z: -3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: -5, z: -6 });
    test.deepEqual(_3d(data)[2].rotated, { x: 7, y: -8, z: -9 });
    test.end();
});

tape('access triangle coords via function', function(test){
    var data = [{x: 1, y: 2, z: 3}, {x: 4, y: 5, z: 6}, {x: 7, y: 8, z: 9}];
    var _3d = d3._3d().x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: -2, z: -3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: -5, z: -6 });
    test.deepEqual(_3d(data)[2].rotated, { x: 7, y: -8, z: -9 });
    test.end();
});

tape('triangles are a closed path', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLES');
    var data = [[[0,0,0],[0,1,0],[1,0,0]]];
    var path = _3d.draw(_3d(data)[0]);
    var lastChar = path[path.length - 1];
    test.equal(lastChar, 'Z');
    test.end();
});

tape('triangles getting drawn counter-clockwise', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLES').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    var data = [
        [{x: 5, y: 0, z: 0},{x: 6, y: 4, z: 0},{x: 4, y: 5, z: 0}],
        [{x: 2, y: 1, z: 0},{x: 2, y: 2, z: 0},{x: 1, y: 1, z: 0}],
        [{x: 1, y: 0, z: 0},{x: 1, y: 2, z: 0},{x: 2, y: 1, z: 0}],
    ];
    test.equal(_3d(data)[0].ccw, false);
    test.equal(_3d(data)[1].ccw, false);
    test.equal(_3d(data)[2].ccw, true);
    test.end();
});
