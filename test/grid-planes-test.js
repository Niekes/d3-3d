const tape = require('tape');
const d3 = require('../');

/* eslint-disable no-underscore-dangle */
tape('test if the number of planes per row are calculated correct when it\'s a quadratic grid', (test) => {
    const j = 10; const
        points = [];

    for (let z = -j; z < j; z += 1) {
        for (let x = -j; x < j; x += 1) {
            points.push({ x, y: 1, z });
        }
    }

    const grid3d = d3._3d().shape('GRID', j * 2).x(d => d.x).y(d => d.y)
        .z(d => d.z)(points);
    const row = Math.sqrt(points.length) - 1;
    test.equal(grid3d.length, row * row);
    test.end();
});

tape('test if the number of planes per row are calculated correct when it\'s not a quadratic grid', (test) => {
    const points = []; const
        pointsPerRow = 5;

    for (let z = 0; z < 3; z += 1) {
        for (let x = 0; x < 5; x += 1) {
            points.push({ x, y: 1, z });
        }
    }
    const grid3d = d3._3d().shape('GRID', pointsPerRow).x(d => d.x).y(d => d.y)
        .z(d => d.z)(points);

    test.equal(8, grid3d.length);

    test.end();
});
