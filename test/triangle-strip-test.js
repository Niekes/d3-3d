var tape = require('tape');
var d3   = require('../');

tape.only   ('draw function of \'triangle_strip\' draws correctly', function(test){
	var _3d = d3._3d().primitiveType('TRIANGLE_STRIP');
	var data = [
        [[0,1,0],[0,0,0],[1,1,0],[1.5,0,0]],
		[[0,10,0],[0,0,0],[10,10,0],[15,0,0]],
	];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M6,-7L3,-4L0,-1');
	test.deepEqual(_3d.draw(_3d(data)[1]), 'M6,-7L3,-4L0,-1');
	test.end();
});
