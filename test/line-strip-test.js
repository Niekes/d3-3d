var tape = require('tape');
var d3   = require('../');

tape('draw function of \'line_strip\' draws correctly', function(test){
	var _3d = d3._3d().primitiveType('LINE_STRIP');
	var data = [
		[[0,1,2],[3,4,5],[6,7,8]]
	];
	test.deepEqual(_3d.draw(_3d(data)[0]), 'M6,7L3,4L0,1');
	test.end();
});

tape('centroid calculation of \'line_strip\' is correct', function(test){
    // line_strip should have at least three points
    var _3d = d3._3d().primitiveType('LINE_STRIP');
    var data = [
        [[0,1,2],[3,4,5],[6,7,8]],
        [[0,1,2],[3,4,5],[6,7,8],[9,10,11]],
    ];
    test.deepEqual(_3d(data)[0].centroid, {x: 3, y: 4, z: 5});
    test.deepEqual(_3d(data)[1].centroid, {x: 4.5, y: 5.5, z: 6.5});
    test.end();
});
