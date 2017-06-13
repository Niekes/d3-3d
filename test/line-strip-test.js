var tape = require('tape');
var d3   = require('../');

tape('draw function of \'line_strip\' draws correctly', function(test){
	var _3d = d3._3d().primitiveType('LINE_STRIP');
	var data = [
		[[0,1,2],[3,4,5],[6,7,8]]
	];
	test.deepEqual(_3d.draw(_3d(data)[0]), 'M6,-7L3,-4L0,-1');
	test.end();
});
