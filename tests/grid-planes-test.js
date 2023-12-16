import { test } from 'tape';
import * as d3 from '../index.js';

test("test if the number of planes per row are calculated correct when it's a quadratic grid", function (t) {
    var j = 10,
        points = [];

    for (var z = -j; z < j; z++) {
        for (var x = -j; x < j; x++) {
            points.push({ x: x, y: 1, z: z });
        }
    }

    const grid3d = d3
        ._3d()
        .shape('GRID', j * 2)
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        })(points);

    const row = Math.sqrt(points.length) - 1;

    t.equal(grid3d.length, row * row);
    t.end();
});

test("test if the number of planes per row are calculated correct when it's not a quadratic grid", function (t) {
    var points = [],
        pointsPerRow = 5;

    for (var z = 0; z < 3; z++) {
        for (var x = 0; x < 5; x++) {
            points.push({ x: x, y: 1, z: z });
        }
    }
    var grid3d = d3
        ._3d()
        .shape('GRID', pointsPerRow)
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        })(points);

    t.equal(8, grid3d.length);

    t.end();
});
