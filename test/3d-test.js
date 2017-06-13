var tape = require('tape');
var d3   = require('../');

tape('_3d has expected defaults', function(test) {
	var _3d = d3._3d();
	test.deepEqual(_3d.origin(), [0, 0]);
	test.equal(_3d.scale(), 1);
	test.equal(_3d.rotateX(), 0);
	test.equal(_3d.rotateY(), 0);
	test.equal(_3d.rotateZ(), 0);
	test.equal(_3d.primitiveType(), 'POINTS');
	test.end();
});

tape('set origin', function(test) {
	var _3d = d3._3d().origin([100, 100]);
	test.deepEqual(_3d.origin(), [100, 100]);
	test.end();
});

tape('set scale', function(test) {
	var _3d = d3._3d().scale(100);
	test.equal(_3d.scale(), 100);
	test.end();
});

tape('allow method chaining', function(test) {
	var _3d = d3._3d().origin([200, 200]).scale(100);
	test.deepEqual(_3d.origin(), [200, 200]);
	test.equal(_3d.scale(), 100);
	test.end();
});

tape('set angles', function(test){
	var _3d = d3._3d().rotateX(Math.PI).rotateY(Math.PI/2).rotateZ(3/2*Math.PI);
	test.equal(_3d.rotateX(), Math.PI);
	test.equal(_3d.rotateY(), Math.PI/2);
	test.equal(_3d.rotateZ(), 3/2*Math.PI);
	test.end();
});
