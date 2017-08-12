var tape = require('tape');
var d3   = require('../');

tape('_3d has expected defaults', function(test) {
	var _3d = d3._3d();
	test.deepEqual(_3d.origin(), [0, 0]);
	test.equal(_3d.scale(), 1);
	test.equal(_3d.perspective(), undefined);
	test.equal(_3d.rotateX(), 0);
	test.equal(_3d.rotateY(), 0);
	test.equal(_3d.rotateZ(), 0);
	test.equal(_3d.primitiveType(), 'POINTS');
	test.deepEqual(_3d.rotateCenter(), [0,0,0]);
	test.end();
});

tape('set origin', function(test) {
	var _3d = d3._3d().origin([100, 100]);
	test.deepEqual(_3d.origin(), [100, 100]);
	test.end();
});

tape('set scale', function(test) {
	var _3d1 = d3._3d();
	var _3d2 = d3._3d().scale(2);
	var _3d3 = d3._3d().scale(3);
	var _3d4 = d3._3d().scale(4);
	test.equal(_3d1.scale(), 1);
	test.equal(_3d2.scale(), 2);
	test.equal(_3d3.scale(), 3);
	test.equal(_3d4.scale(), 4);
	test.end();
});

tape('set perspective', function(test) {
	var _3d1 = d3._3d().perspective(1000);
	var _3d2 = d3._3d().perspective(999);
	var _3d3 = d3._3d();
	test.equal(_3d1.perspective(), 1000);
	test.equal(_3d2.perspective(), 999);
	test.equal(_3d3.perspective(), undefined);
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
