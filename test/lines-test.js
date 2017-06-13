var tape = require('tape');
var d3   = require('../');

tape('lines don\'t have a draw function', function(test){
    var _3d = d3._3d().primitiveType('LINES');
    test.equal(_3d.draw(), undefined);
    test.end();
});

tape('centroid calculation for lines', function(test){
	var _3d = d3._3d().primitiveType('LINES').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
	var data = [
		[{x:  0, y:   0, z:   0}, {x:    0, y:    0, z:    0}],
		[{x:  1, y:   2, z:   3}, {x:    3, y:    2, z:    1}],
		[{x: 10, y: 9.5, z: 8.6}, {x: 34.3, y: 11.2, z: 27.4}]
	];
	var line0 = _3d(data)[0];
	var line1 = _3d(data)[1];
	var line2 = _3d(data)[2];
	test.deepEqual(line0.centroid, {x:     0, y:     0, z:   0});
	test.deepEqual(line1.centroid, {x:     2, y:     2, z:   2});
	test.deepEqual(line2.centroid, {x: 22.15, y: 10.35, z: 18});
	test.end();
});

tape('length calculation for lines', function(test){
	var _3d = d3._3d().primitiveType('LINES').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
	var data = [
		[{x:  0, y:   0, z:   0}, {x:   -1, y:    0, z:    0}],
		[{x:  0, y:   0, z:   0}, {x:    0, y:    0, z:    1}],
		[{x:  0, y:   0, z:   0}, {x:    0, y:    1, z:    0}],
	];
	var line0 = _3d(data)[0];
	var line1 = _3d(data)[1];
	var line2 = _3d(data)[2];
	test.deepEqual(line0.lng, 1);
	test.deepEqual(line1.lng, 1);
	test.deepEqual(line2.lng, 1);
	test.end();
});
