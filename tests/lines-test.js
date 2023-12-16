import { test } from 'tape';
import * as d3 from '../index.js';

test("lines don't have a draw function", function (t) {
    var _3d = d3._3d().shape('LINE');
    t.equal(_3d.draw(), undefined);
    t.end();
});

test('centroid calculation for lines', function (t) {
    var _3d = d3
        ._3d()
        .shape('LINE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    var data = [
        [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 0, z: 0 }
        ],
        [
            { x: 1, y: 2, z: 3 },
            { x: 3, y: 2, z: 1 }
        ],
        [
            { x: 10, y: 9.5, z: 8.6 },
            { x: 34.3, y: 11.2, z: 27.4 }
        ]
    ];
    var line0 = _3d(data)[0];
    var line1 = _3d(data)[1];
    var line2 = _3d(data)[2];
    t.deepEqual(line0.centroid, { x: 0, y: 0, z: 0 });
    t.deepEqual(line1.centroid, { x: 2, y: 2, z: 2 });
    t.deepEqual(line2.centroid, { x: 22.15, y: 10.35, z: 18 });
    t.end();
});
