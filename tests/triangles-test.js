import { test } from 'tape';
import * as d3 from '../index.js';

test('triangle draw', function(t){
	var triangles = d3._3d().shape('TRIANGLE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
	var data = [
		[{x: 0, y: 0, z: 0},{x: 0, y: 1, z: 0},{x: 1, y: 0, z: 0}]
	];
	t.equal(triangles.draw(triangles(data)[0]), 'M0,0L0,1L1,0Z');
	t.end();
});

test('access triangle coords via array', function(t){
    var triangles = d3._3d();
    var data = [[1,2,3],[4,5,6],[7,8,9]];
    t.deepEqual(triangles(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(triangles(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.deepEqual(triangles(data)[2].rotated, { x: 7, y: 8, z: 9 });
    t.end();
});

test('access triangle coords via function', function(t){
    var data = [{x: 1, y: 2, z: 3}, {x: 4, y: 5, z: 6}, {x: 7, y: 8, z: 9}];
    var triangles = d3._3d().x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    t.deepEqual(triangles(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(triangles(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.deepEqual(triangles(data)[2].rotated, { x: 7, y: 8, z: 9 });
    t.end();
});

test('triangles are a closed path', function(t){
    var triangles = d3._3d().shape('TRIANGLE');
    var data = [[[0,0,0],[0,1,0],[1,0,0]]];
    var path = triangles.draw(triangles(data)[0]);
    var lastChar = path[path.length - 1];
    t.equal(lastChar, 'Z');
    t.end();
});

test('triangles are getting drawn counter-clockwise', function(t){
    var triangles = d3._3d().shape('TRIANGLE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    var data1 = [
        [{x:  1, y:  0, z:  0}, {x: -1, y:  0, z:  0}, {x:  0, y:  1, z:  0}],
        [{x:  0, y:  1, z:  0}, {x:  1, y:  0, z:  0}, {x: -1, y:  0, z:  0}],
        [{x: -1, y:  0, z:  0}, {x:  0, y:  1, z:  0}, {x:  1, y:  0, z:  0}],
        [{x:  1, y:  0, z:  0}, {x:  0, y:  1, z:  0}, {x: -1, y:  0, z:  0}],
        [{x: -1, y:  0, z:  0}, {x:  1, y:  0, z:  0}, {x:  0, y:  1, z:  0}],
        [{x:  0, y:  1, z:  0}, {x: -1, y:  0, z:  0}, {x:  1, y:  0, z:  0}],
    ];

    t.equal(triangles(data1)[0].ccw, true);
    t.equal(triangles(data1)[1].ccw, true);
    t.equal(triangles(data1)[2].ccw, true);
    t.equal(triangles(data1)[3].ccw, false);
    t.equal(triangles(data1)[4].ccw, false);
    t.equal(triangles(data1)[5].ccw, false);
    t.end();
});

test('triangles\' centroid calculation is correct', function(t){
    var triangles = d3._3d().shape('TRIANGLE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });
    var data = [
        [{x: 5, y: 0, z: 0},{x: 6, y: 4, z: 0},{x: 4, y: 5, z: 0}],
        [{x: 2, y: 1, z: 0},{x: 2, y: 2, z: 0},{x: 1, y: 1, z: 0}],
        [{x: 1, y: 0, z: 0},{x: 1, y: 2, z: 0},{x: 2, y: 1, z: 0}],
        [{x: 1, y: 0, z: 1},{x: 1, y: 2, z: 1},{x: 2, y: 1, z: 1}],
        [{x: 1, y: 0, z: 2},{x: 1, y: 2, z: 2},{x: 2, y: 1, z: 2}],
    ];
    t.deepEqual(triangles(data)[0].centroid, { x: 5, y: 3, z: 0 });
    t.deepEqual(triangles(data)[1].centroid, { x: 1.6666666666666667, y: 1.3333333333333333, z: 0 });
    t.deepEqual(triangles(data)[2].centroid, { x: 1.3333333333333333, y: 1, z: 0 });
    t.end();
});




