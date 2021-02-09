const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('points don\'t have draw function', (test) => {
    const _3d = d3._3d();
    test.equal(_3d.draw(), undefined);
    test.end();
});

tape('access point coords via array', (test) => {
    const _3d = d3._3d();
    const data = [[1, 2, 3], [4, 5, 6]];
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.end();
});

tape('access point coords via function', (test) => {
    const data = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }];
    const _3d = d3._3d().x(d => d.x).y(d => d.y).z(d => d.z);
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(_3d(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.end();
});

tape('rotate zero point along x axis by 180°', (test) => {
    const data = [{ x: 0, y: 0, z: 0 }];
    const _3d = d3._3d().rotateX(Math.PI).x(d => d.x).y(d => d.y)
        .z(d => d.z);
    test.deepEqual(_3d(data)[0].rotated, { x: 0, y: 0, z: 0 });
    test.end();
});

tape('rotate point 1|1|1 along x axis by 180°', (test) => {
    const data = [{ x: 1, y: 1, z: 1 }];
    const _3d = d3._3d().rotateX(Math.PI).x(d => d.x).y(d => d.y)
        .z(d => d.z);
    test.deepEqual(_3d(data)[0].rotated, { x: 1, y: -1.0000000000000002, z: -0.9999999999999999 });
    test.end();
});

tape('project point 1|1|1 on to screen', (test) => {
    const data = [[1, 1, 1]];
    const _3d = d3._3d().scale(100);
    test.deepEqual(_3d(data)[0].projected, { x: 100, y: 100 });
    test.end();
});
