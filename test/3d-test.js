var tape = require('tape');
var d3   = require('../');

tape("d3-3d has expected defaults", function(test) {
	var _3d = d3._3d();
	test.deepEqual(_3d.origin(), [0, 0]);
	test.equal(_3d.scale(), 1);
	test.equal(_3d.rotateX(), 0);
	test.equal(_3d.rotateY(), 0);
	test.equal(_3d.rotateZ(), 0);
	test.equal(_3d.shape(), "POINT");
	test.deepEqual(_3d.rotateCenter(), [0,0,0]);
	test.end();
});

tape('set origin', function(test) {
	var _3d = d3._3d().origin([100, 100]);
	test.deepEqual(_3d.origin(), [100, 100]);
	test.end();
});

tape('set rotateCenter', function(test) {
	var _3d = d3._3d().rotateCenter([100, 100, 100]);
	test.deepEqual(_3d.rotateCenter(), [100, 100, 100]);
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

tape('test x,y,z accesor', function(test){
    var cubes3D = d3._3d().shape('CUBE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });

    test.equal(typeof cubes3D.x(), 'function');
    test.equal(typeof cubes3D.y(), 'function');
    test.equal(typeof cubes3D.z(), 'function');
    cubes3D.x(1);
    cubes3D.y(1);
    cubes3D.z(1);
    test.deepEqual(cubes3D.x(), 1);
    test.deepEqual(cubes3D.y(), 1);
    test.deepEqual(cubes3D.z(), 1);

	test.end();
});

tape('test ascending sorting', function(test){

	test.deepEqual(d3._3d().sort({centroid: { z: 1 } }, {centroid: { z:10 } }), -1);
	test.deepEqual(d3._3d().sort({centroid: { z:10 } }, {centroid: { z: 1 } }),  1);
	test.deepEqual(d3._3d().sort({centroid: { z: 1 } }, {centroid: { z: 1 } }),  0);
	test.deepEqual(d3._3d().sort({centroid: { z: 1 } }, {centroid: { z:'1'} }),  0);
	test.deepEqual(isNaN(d3._3d().sort({centroid: { z: function(){ return false ;} } }, {centroid: { z:false} })),  true);

	test.end();

});
