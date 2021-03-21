const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('lines don\'t have a draw function', (test) => {
    const _3d = d3._3d().shape('LINE');
    test.equal(_3d.draw(), undefined);
    test.end();
});

tape('centroid calculation for lines', (test) => {
    const _3d = d3._3d()
        .shape('LINE')
        .x(d => d.x)
        .y(d => d.y)
        .z(d => d.z);

    const data = [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
        [{ x: 1, y: 2, z: 3 }, { x: 3, y: 2, z: 1 }],
        [{ x: 10, y: 9.5, z: 8.6 }, { x: 34.3, y: 11.2, z: 27.4 }],
    ];
    const line0 = _3d(data)[0];
    const line1 = _3d(data)[1];
    const line2 = _3d(data)[2];
    test.deepEqual(line0.centroid, { x: 0, y: 0, z: 0 });
    test.deepEqual(line1.centroid, { x: 2, y: 2, z: 2 });
    test.deepEqual(line2.centroid, { x: 22.15, y: 10.35, z: 18 });
    test.end();
});
