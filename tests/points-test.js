import { test } from 'tape';
import * as d3 from '../index.js';
import { points3D } from '../index.js';

test("points don't have draw function", function (t) {
    var _3d = d3._3d();
    t.equal(_3d.draw(), undefined);
    t.end();
});

test('access point coords via array', function (t) {
    var _3d = d3._3d();
    var data = [
        [1, 2, 3],
        [4, 5, 6]
    ];
    t.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.end();
});

test('access point coords via function', function (t) {
    var data = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
    ];
    var _3d = d3
        ._3d()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    t.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.end();
});

test('rotate zero point along x axis by 180°', function (t) {
    var data = [{ x: 0, y: 0, z: 0 }];
    var _3d = d3
        ._3d()
        .rotateX(Math.PI)
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    t.deepEqual(_3d(data)[0].rotated, { x: 0, y: 0, z: 0 });
    t.end();
});

test('rotate point 1|1|1 along x axis by 180°', function (t) {
    var data = [{ x: 1, y: 1, z: 1 }];
    var _3d = d3
        ._3d()
        .rotateX(Math.PI)
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    t.deepEqual(_3d(data)[0].rotated, { x: 1, y: -1.0000000000000002, z: -0.9999999999999999 });
    t.end();
});

test('project point 1|1|1 on to screen', function (t) {
    var data = [[1, 1, 1]];
    var _3d = d3._3d().scale(100);
    t.deepEqual(_3d(data)[0].projected, { x: 100, y: 100 });
    t.end();
});

/**
 *  v1.0.0
 **/
test('triangles3D is exported correctly', (t) => {
    t.equal(typeof points3D, 'function');
    t.end();
});

test('points3D has expected defaults', (t) => {
    const points = points3D();

    t.deepEqual(points.origin(), [0, 0]);
    t.equal(points.scale(), 1);
    t.equal(points.rotateX(), 0);
    t.equal(points.rotateY(), 0);
    t.equal(points.rotateZ(), 0);
    t.deepEqual(points.rotateCenter(), [0, 0, 0]);
    t.equal(points.draw, undefined);
    t.equal(typeof points.sort, 'function');
    t.equal(typeof points.x, 'function');
    t.equal(typeof points.y, 'function');
    t.equal(typeof points.z, 'function');
    t.end();
});

test('access point coords via array', (t) => {
    const data = [
        [1, 2, 3],
        [4, 5, 6]
    ];

    const points = points3D();

    t.deepEqual(points(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(points(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.end();
});

test('access point coords via array', function (t) {
    const data = [
        [1, 2, 3],
        [4, 5, 6]
    ];

    const points = points3D();

    t.deepEqual(points(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(points(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.end();
});

test('access point coords via function', (t) => {
    const data = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
    ];

    const points = points3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    t.deepEqual(points(data)[0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(points(data)[1].rotated, { x: 4, y: 5, z: 6 });
    t.end();
});

test('rotate zero point along x axis by 180°', (t) => {
    const data = [{ x: 0, y: 0, z: 0 }];

    const points = points3D()
        .rotateX(Math.PI)
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    t.deepEqual(points(data)[0].rotated, { x: 0, y: 0, z: 0 });
    t.end();
});

test('rotate point 1|1|1 along x axis by 180°', (t) => {
    const data = [{ x: 1, y: 1, z: 1 }];
    const points = points3D()
        .rotateX(Math.PI)
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    t.deepEqual(points(data)[0].rotated, { x: 1, y: -1.0000000000000002, z: -0.9999999999999999 });
    t.end();
});

test('project point 1|1|1 on to screen', (t) => {
    const data = [[1, 1, 1]];
    const points = points3D().scale(100);

    t.deepEqual(points(data)[0].projected, { x: 100, y: 100 });
    t.end();
});
