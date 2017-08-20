var tape = require('tape');
var d3   = require('../');

tape('draw function of \'polygons\' draws correctly', function(test){
	var _3d = d3._3d().shape('POLYGON');
	var data = [
		[[5,0,2],[6,4,1],[4,5,8],[1,5,9],[1,0,1]]
	];
	test.deepEqual(_3d.draw(_3d(data)[0]), 'M1,0L1,5L4,5L6,4L5,0Z');
	test.end();
});

tape('polygons are getting drawn counter-clockwise', function(test){
    var _3d = d3._3d().shape('POLYGON');
    var data = [
        [[5,0,2],[6,4,1],[4,5,8],[1,5,9],[1,0,1]],
        [[1,0,1],[5,0,2],[6,4,1],[4,5,8],[1,5,9]],
        [[1,5,9],[4,5,8],[6,4,1],[5,0,2],[1,0,1]],
        [[1,0,0],[-1,0,0],[0,1,0]],
        [[3,4,0],[5,11,0],[12,8,0],[9,5,0],[5,6,0]],
        [[-3,4,0],[-5,11,0],[-12,8,0],[-9,5,0],[-5,6,0]],
    ];
    test.deepEqual(_3d(data)[0].ccw, false);
    test.deepEqual(_3d(data)[1].ccw, false);
    test.deepEqual(_3d(data)[2].ccw, true);
    test.deepEqual(_3d(data)[3].ccw, true);
    test.deepEqual(_3d(data)[4].ccw, true);
    test.deepEqual(_3d(data)[5].ccw, false);
    test.end();
});

tape('polygon\'s  centroid function is correct', function(test){
    var _3d = d3._3d().shape('POLYGON');
    var data = [
        [[5,0,2],[6,4,1],[4,5,8],[1,5,9],[1,0,1]],
        [[1,0,1],[5,0,2],[6,4,1],[4,5,8],[1,5,9]],
        [[1,5,9],[4,5,8],[6,4,1],[5,0,2],[1,0,1]],
    ];
    test.deepEqual(_3d(data)[0].centroid, { x: 3.4, y: 2.8, z: 4.2 });
    test.deepEqual(_3d(data)[1].centroid, { x: 3.4, y: 2.8, z: 4.2 });
    test.deepEqual(_3d(data)[2].centroid, { x: 3.4, y: 2.8, z: 4.2 });
    test.end();
});

