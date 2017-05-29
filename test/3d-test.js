var tape = require('tape');
var d3   = require('../');

tape('_3d has expected defaults', function(test) {
	var _3d = d3._3d();
	test.equal(_3d.projection(), 'ortho');
	test.deepEqual(_3d.origin(), [0, 0]);
	test.equal(_3d.scale(), 1);
	test.equal(_3d.distance(), 1);
	test.equal(_3d.rotateX(), 0);
	test.equal(_3d.rotateY(), 0);
	test.equal(_3d.rotateZ(), 0);
	test.end();
});

tape('set projection to perspective "ortho"', function(test) {
	var _3d = d3._3d().projection('ortho');
	test.equal(_3d.projection(), 'ortho');
	test.end();
});

tape('set projection to perspective "persp"', function(test) {
	var _3d = d3._3d().projection('persp');
	test.equal(_3d.projection(), 'persp');
	test.end();
});

tape('set origin', function(test) {
	var _3d = d3._3d().origin([100, 100]);
	test.deepEqual(_3d.origin(), [100, 100]);
	test.end();
});

tape('set distance', function(test) {
	var _3d = d3._3d().distance(1000);
	test.equal(_3d.distance(), 1000);
	test.end();
});

tape('set scale', function(test) {
	var _3d = d3._3d().scale(100);
	test.equal(_3d.scale(), 100);
	test.end();
});


tape('allow method chaining', function(test) {
	var _3d = d3._3d().projection('persp').origin([200, 200]);
	test.deepEqual(_3d.projection(), 'persp');
	test.deepEqual(_3d.origin(), [200, 200]);
	test.end();
});

tape('set angles', function(test){
	var _3d = d3._3d().rotateX(Math.PI).rotateY(Math.PI/2).rotateZ(3/2*Math.PI);
	test.equal(_3d.rotateX(), Math.PI);
	test.equal(_3d.rotateY(), Math.PI/2);
	test.equal(_3d.rotateZ(), 3/2*Math.PI);
	test.end();
});

tape('mid point calculation for lines', function(test){
	var _3d = d3._3d().primitiveType('LINES');
	var data = [
		[{x:  0, y:   0, z:   0}, {x:    0, y:    0, z:    0}],
		[{x:  1, y:   2, z:   3}, {x:    3, y:    2, z:    1}],
		[{x: 10, y: 9.5, z: 8.6}, {x: 34.3, y: 11.2, z: 27.4}]
	];
	var line0 = _3d(data)[0];
	var line1 = _3d(data)[1];
	var line2 = _3d(data)[2];
	test.deepEqual(line0.midPoint, {x:     0, y:     0, z:   0});
	test.deepEqual(line1.midPoint, {x:     2, y:     2, z:   2});
	test.deepEqual(line2.midPoint, {x: 22.15, y: 10.35, z: 18});
	test.end();
});

tape('length calculation for lines', function(test){
	var _3d = d3._3d().primitiveType('LINES');
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

tape('line draw function', function(test){
	var _3d = d3._3d().primitiveType('LINES');
	var data = [
		[{x:  0, y:   0, z:   0}, {x:   -1, y:    0, z:    0}],
		[{x:  0, y:   0, z:   0}, {x:    0, y:    0, z:    1}],
		[{x:  0, y:   0, z:   0}, {x:    0, y:    1, z:    0}],
	];
	var projectedData = _3d(data);
	var a = _3d.draw(projectedData[0]);
	var b = _3d.draw(projectedData[1]);
	var c = _3d.draw(projectedData[2]);
	test.equal(a, 'M0,0L-1,0');
	test.equal(b, 'M0,0L0,0');
	test.equal(c, 'M0,0L0,-1');
	test.end();
});

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

// tape('rotate zero point along x axis by 180°', function(test){
// 	var data = [{x: 0, y: 0, z: 0}];
// 	var _3d = d3._3d().rotateX(Math.PI);
// 	test.deepEqual(_3d(data)[0].rotated, {x: 0, y: 0, z: 0});
// 	test.end();
// });

// tape('rotate 1|1|1 along x axis by 180°', function(test){
// 	var data = [{x: 1, y: 1, z: 1}];
// 	var _3d = d3._3d().rotateX(Math.PI);
// 	test.deepEqual(_3d(data)[0].rotated, {x: 1, y: 0.9999999999999999, z: -1.0000000000000002});
// 	test.end();
// });

// tape('project 1|1|1 on to screen', function(test){
// 	var data = [{x: 1, y: 1, z: 1}];
// 	var _3d = d3._3d().rotateX(Math.PI).scale(100);
// 	test.deepEqual(_3d(data)[0].projected, {x: 100, y: 99.99999999999999});
// 	test.end();
// });

// var data3d = d3._3d()
// 	.projection('persp')
//	.scale(100)
//	.distance(1000)
// 	.origin([width/2, height/2])
// 	.rotateX(alpha) 	// z
// 	.rotateY(beta) 		// y
// 	.rotateZ(gamma) 	// x
//  .primitiveType('TRIANGLES');

// var points = svg.selectAll('circle').data(_3d(data));


