var tape = require('tape');
var d3   = require('../');

tape('point draw function', function(test){
	var _3d = d3._3d();
	var data = [
		{x:  100, y:  100, z: 0, radius: 75},
	];
	var projectedData = _3d(data);
	var a = _3d.draw(projectedData[0]);
	test.equal(a, 'M100,-100m-75,0a75,75,0,1,1,150,0a75,75,0,1,1,-150');
	test.end();
});
