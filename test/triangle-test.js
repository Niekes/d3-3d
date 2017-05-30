var tape = require('tape');
var d3   = require('../');

tape('triangle draw', function(test){
	var _3d = d3._3d().primitiveType('TRIANGLES');
	var data = [
		[{x: 0, y: 0, z: 0},{x: 0, y: 1, z: 0},{x: 1, y: 0, z: 0}]
	];
	test.equal(_3d.draw(_3d(data)[0]), 'M0,0L0,-1L1,0');
	test.end();
});
