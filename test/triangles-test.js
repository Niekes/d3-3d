const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('triangle draw', (test) => {
    const triangles = d3._3d().shape('TRIANGLE').x(d => d.x).y(d => d.y)
        .z(d => d.z);
    const data = [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }],
    ];
    test.equal(triangles.draw(triangles(data)[0]), 'M0,0L0,1L1,0Z');
    test.end();
});

tape('access triangle coords via array', (test) => {
    const triangles = d3._3d();
    const data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    test.deepEqual(triangles(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(triangles(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.deepEqual(triangles(data)[2].rotated, { x: 7, y: 8, z: 9 });
    test.end();
});

tape('access triangle coords via function', (test) => {
    const data = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { x: 7, y: 8, z: 9 }];
    const triangles = d3._3d().x(d => d.x).y(d => d.y).z(d => d.z);
    test.deepEqual(triangles(data)[0].rotated, { x: 1, y: 2, z: 3 });
    test.deepEqual(triangles(data)[1].rotated, { x: 4, y: 5, z: 6 });
    test.deepEqual(triangles(data)[2].rotated, { x: 7, y: 8, z: 9 });
    test.end();
});

tape('triangles are a closed path', (test) => {
    const triangles = d3._3d().shape('TRIANGLE');
    const data = [[[0, 0, 0], [0, 1, 0], [1, 0, 0]]];
    const path = triangles.draw(triangles(data)[0]);
    const lastChar = path[path.length - 1];
    test.equal(lastChar, 'Z');
    test.end();
});

tape('triangles are getting drawn counter-clockwise', (test) => {
    const triangles = d3._3d().shape('TRIANGLE').x(d => d.x).y(d => d.y)
        .z(d => d.z);
    const data1 = [
        [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
        [{ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }],
        [{ x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }],
        [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }],
        [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
        [{ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
    ];

    test.equal(triangles(data1)[0].ccw, true);
    test.equal(triangles(data1)[1].ccw, true);
    test.equal(triangles(data1)[2].ccw, true);
    test.equal(triangles(data1)[3].ccw, false);
    test.equal(triangles(data1)[4].ccw, false);
    test.equal(triangles(data1)[5].ccw, false);
    test.end();
});

tape('triangles\' centroid calculation is correct', (test) => {
    const triangles = d3._3d().shape('TRIANGLE').x(d => d.x).y(d => d.y)
        .z(d => d.z);
    const data = [
        [{ x: 5, y: 0, z: 0 }, { x: 6, y: 4, z: 0 }, { x: 4, y: 5, z: 0 }],
        [{ x: 2, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }, { x: 1, y: 1, z: 0 }],
        [{ x: 1, y: 0, z: 0 }, { x: 1, y: 2, z: 0 }, { x: 2, y: 1, z: 0 }],
        [{ x: 1, y: 0, z: 1 }, { x: 1, y: 2, z: 1 }, { x: 2, y: 1, z: 1 }],
        [{ x: 1, y: 0, z: 2 }, { x: 1, y: 2, z: 2 }, { x: 2, y: 1, z: 2 }],
    ];
    test.deepEqual(triangles(data)[0].centroid, { x: 5, y: 3, z: 0 });
    test.deepEqual(triangles(data)[1].centroid, { x: 1.6666666666666667, y: 1.3333333333333333, z: 0 });
    test.deepEqual(triangles(data)[2].centroid, { x: 1.3333333333333333, y: 1, z: 0 });
    test.end();
});
