import { test } from 'tape';
import * as d3 from '../index.js';
import { cubes3D } from '../index.js';

test('cube naming is correct', function (t) {
    const cubes = d3
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

    const data = [
        [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 1, z: 1 },
            { x: 1, y: 1, z: 1 },
            { x: 1, y: 0, z: 1 }
        ]
    ];

    t.equal(cubes(data)[0].faces[0].face, 'front');
    t.equal(cubes(data)[0].faces[1].face, 'back');
    t.equal(cubes(data)[0].faces[2].face, 'left');
    t.equal(cubes(data)[0].faces[3].face, 'right');
    t.equal(cubes(data)[0].faces[4].face, 'top');
    t.equal(cubes(data)[0].faces[5].face, 'bottom');
    t.end();
});

/**
 *  v1.0.0
 **/
test('cube naming is correct', (t) => {
    t.plan(6);

    const cubes = cubes3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    const data = [
        [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 1, z: 1 },
            { x: 1, y: 1, z: 1 },
            { x: 1, y: 0, z: 1 }
        ]
    ];

    t.equal(cubes(data)[0].faces[0].face, 'front');
    t.equal(cubes(data)[0].faces[1].face, 'back');
    t.equal(cubes(data)[0].faces[2].face, 'left');
    t.equal(cubes(data)[0].faces[3].face, 'right');
    t.equal(cubes(data)[0].faces[4].face, 'top');
    t.equal(cubes(data)[0].faces[5].face, 'bottom');
    t.end();
});
