const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('linestrip draws correctly', (test) => {
    const data = [
        [3, 5, 2],
        [2, 45, 2],
        [1, 1, 2],
        [0, 9, 3],
        [-1, 3, 2],
        [-2, 8, 4],
        [-3, 0, 2],
    ];

    const ls3D = d3._3d()
        .scale(30)
        .origin([220, 340])
        .shape('LINE_STRIP');

    test.equal(ls3D.draw(ls3D([data])[0]), 'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490');
    test.end();
});

tape('centroid calculation for linesstrip', (test) => {
    const data = [
        [3, 5, 2],
        [2, 45, 2],
        [1, 1, 2],
        [0, 9, 3],
        [-1, 3, 2],
        [-2, 8, 4],
        [-3, 0, 2],
    ];

    const data2 = [
        [3, 5, 2],
        [2, 45, 2],
        [1, 1, 2],
        [0, 9, 3],
        [-1, 3, 2],
        [-2, 8, 4],
    ];

    const ls3D = d3._3d()
        .scale(30)
        .origin([220, 340])
        .shape('LINE_STRIP');

    test.deepEqual(ls3D([data])[0].centroid, { x: 0, y: 9, z: 3 });
    test.deepEqual(ls3D([data2])[0].centroid, { x: 0.5, y: 5, z: 2.5 });

    test.end();
});
