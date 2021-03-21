const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('planes\' centroid calculation is correct', (test) => {
    const _3d = d3._3d()
        .shape('PLANE')
        .x(d => d.x)
        .y(d => d.y)
        .z(d => d.z);

    const data = [
        [{ x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 1 }, { x: -1, y: -1, z: 1 }],
    ];
    test.deepEqual(_3d(data)[0].centroid, { x: 0, y: 0, z: 0.5 });
    test.end();
});

tape('draw function of \'planes\' draws correctly', (test) => {
    const _3d = d3._3d().shape('PLANE');
    const data = [
        [[5, 0, 2], [6, 4, 1], [4, 5, 8], [1, 5, 9]],
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M5,0L6,4L4,5L1,5Z');
    test.end();
});

tape('planes are drawn counter-clockwise', (test) => {
    const _3d = d3._3d().shape('PLANE');
    const data = [
        [[-1, 0, 0], [1, 0, 0], [1, 1, 0], [-1, 1, 0]],
    ];
    test.deepEqual(_3d(data)[0].ccw, false);
    test.end();
});
