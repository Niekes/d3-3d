import { test } from 'tape';
import * as d3 from '../index.js';
import { triangles3D, points3D } from '../index.js';

test('d3-3d has expected defaults', function (t) {
    const _3d = d3._3d();
    t.deepEqual(_3d.origin(), [0, 0]);
    t.equal(_3d.scale(), 1);
    t.equal(_3d.rotateX(), 0);
    t.equal(_3d.rotateY(), 0);
    t.equal(_3d.rotateZ(), 0);
    t.equal(_3d.shape(), 'POINT');
    t.deepEqual(_3d.rotateCenter(), [0, 0, 0]);
    t.end();
});

test('set origin', function (t) {
    const _3d = d3._3d().origin([100, 100]);
    t.deepEqual(_3d.origin(), [100, 100]);
    t.end();
});

test('set rotateCenter', function (t) {
    const _3d = d3._3d().rotateCenter([100, 100, 100]);
    t.deepEqual(_3d.rotateCenter(), [100, 100, 100]);
    t.end();
});

test('set scale', function (t) {
    const _3d1 = d3._3d();
    const _3d2 = d3._3d().scale(2);
    const _3d3 = d3._3d().scale(3);
    const _3d4 = d3._3d().scale(4);
    t.equal(_3d1.scale(), 1);
    t.equal(_3d2.scale(), 2);
    t.equal(_3d3.scale(), 3);
    t.equal(_3d4.scale(), 4);
    t.end();
});

test('allow method chaining', function (t) {
    const _3d = d3._3d().origin([200, 200]).scale(100);
    t.deepEqual(_3d.origin(), [200, 200]);
    t.equal(_3d.scale(), 100);
    t.end();
});

test('set angles', function (t) {
    const _3d = d3
        ._3d()
        .rotateX(Math.PI)
        .rotateY(Math.PI / 2)
        .rotateZ((3 / 2) * Math.PI);
    t.equal(_3d.rotateX(), Math.PI);
    t.equal(_3d.rotateY(), Math.PI / 2);
    t.equal(_3d.rotateZ(), (3 / 2) * Math.PI);
    t.end();
});

test('test x,y,z accesor', function (t) {
    const cubes3D = d3
        ._3d()
        .shape('CUBE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });

    t.equal(typeof cubes3D.x(), 'function');
    t.equal(typeof cubes3D.y(), 'function');
    t.equal(typeof cubes3D.z(), 'function');

    cubes3D.x(1);
    cubes3D.y(1);
    cubes3D.z(1);

    t.deepEqual(cubes3D.x(), 1);
    t.deepEqual(cubes3D.y(), 1);
    t.deepEqual(cubes3D.z(), 1);

    t.end();
});

test('test ascending sorting', function (t) {
    t.deepEqual(d3._3d().sort({ centroid: { z: 1 } }, { centroid: { z: 10 } }), -1);
    t.deepEqual(d3._3d().sort({ centroid: { z: 10 } }, { centroid: { z: 1 } }), 1);
    t.deepEqual(d3._3d().sort({ centroid: { z: 1 } }, { centroid: { z: 1 } }), 0);
    t.deepEqual(d3._3d().sort({ centroid: { z: 1 } }, { centroid: { z: '1' } }), 0);
    t.deepEqual(
        isNaN(
            d3._3d().sort(
                {
                    centroid: {
                        z: function () {
                            return false;
                        }
                    }
                },
                { centroid: { z: false } }
            )
        ),
        true
    );

    t.end();
});

/**
 * v1.0.0
 *
 */
test('d3-3d has expected defaults', (t) => {
    const triangles = triangles3D();
    const points = points3D();

    t.deepEqual(triangles.origin(), [0, 0]);
    t.equal(triangles.scale(), 1);
    t.equal(triangles.rotateX(), 0);
    t.equal(triangles.rotateY(), 0);
    t.equal(triangles.rotateZ(), 0);
    t.deepEqual(triangles.rotateCenter(), [0, 0, 0]);

    t.deepEqual(points.origin(), [0, 0]);
    t.equal(points.scale(), 1);
    t.equal(points.rotateX(), 0);
    t.equal(points.rotateY(), 0);
    t.equal(points.rotateZ(), 0);
    t.deepEqual(points.rotateCenter(), [0, 0, 0]);
    t.end();
});
