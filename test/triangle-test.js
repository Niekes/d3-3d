var tape = require('tape');
var d3   = require('../');

tape('triangle draw', function(test){
	var _3d = d3._3d().primitiveType('TRIANGLES');
	var data = [
		[{x: 0, y: 0, z: 0},{x: 0, y: 1, z: 0},{x: 1, y: 0, z: 0}]
	];
	test.equal(_3d.draw(_3d(data)[0]), 'M0,0L0,-1L1,0Z');
	test.end();
});

tape('triangles are a closed path', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLES');
    var data = [
        [{x: 0, y: 0, z: 0},{x: 0, y: 1, z: 0},{x: 1, y: 0, z: 0}]
    ];
    var path = _3d.draw(_3d(data)[0]);
    var lastChar = path[path.length - 1];
    test.equal(lastChar, 'Z');
    test.end();
});

tape('triangles getting drawn counter-clockwise', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLES');
    var data = [
        [{x: 5, y: 0, z: 0},{x: 6, y: 4, z: 0},{x: 4, y: 5, z: 0}],
        [{x: 2, y: 1, z: 0},{x: 2, y: 2, z: 0},{x: 1, y: 1, z: 0}],
        [{x: 1, y: 0, z: 0},{x: 1, y: 2, z: 0},{x: 2, y: 1, z: 0}],
    ];
    test.equal(_3d(data)[0].ccw, true);
    test.equal(_3d(data)[1].ccw, true);
    test.equal(_3d(data)[2].ccw, false);
    test.end();
});
