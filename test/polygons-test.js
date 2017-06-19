var tape = require('tape');
var d3   = require('../');

tape('draw function of \'polygons\' draws correctly', function(test){
	var _3d = d3._3d().primitiveType('POLYGONS');
	var data = [
		[[5,0,2],[6,4,1],[4,5,8],[1,5,9],[1,0,1]]
	];
	test.deepEqual(_3d.draw(_3d(data)[0]), 'M1,0L1,-5L4,-5L6,-4L5,0Z');
	test.end();
});

tape.only('polygons are getting drawn clockwise', function(test){
    var _3d = d3._3d().primitiveType('POLYGONS');
    var data = [
        [[5,0,2],[6,4,1],[4,5,8],[1,5,9],[1,0,1]],
        [[1,0,1],[5,0,2],[6,4,1],[4,5,8],[1,5,9]],
        [[1,5,9],[4,5,8],[6,4,1],[5,0,2],[1,0,1]],
    ];
    test.deepEqual(_3d(data)[0].cw, true);
    test.deepEqual(_3d(data)[1].cw, true);
    test.deepEqual(_3d(data)[2].cw, false);
    test.end();
});
