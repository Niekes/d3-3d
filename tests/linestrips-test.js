import { test } from 'tape';
import * as d3 from '../index.js';
import { lineStrips3D } from '../index.js';

test('linestrip draws correctly', function (t) {
    var data = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 },
        { x: -3, y: 0, z: 2 }
    ];

    var ls3D = d3._3d().scale(30).origin({ x: 220, y: 340 }).shape('LINE_STRIP');

    t.equal(
        ls3D.draw(ls3D([data])[0]),
        'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490'
    );
    t.end();
});

test('centroid calculation for linesstrip', function (t) {
    const data1 = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 },
        { x: -3, y: 0, z: 2 }
    ];

    const data2 = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 }
    ];

    var ls3D = d3._3d().scale(30).origin({ x: 220, y: 340 }).shape('LINE_STRIP');

    t.deepEqual(ls3D([data1])[0].centroid, { x: 0, y: 9, z: 3 });
    t.deepEqual(ls3D([data2])[0].centroid, { x: 0.5, y: 5, z: 2.5 });

    t.end();
});

/**
 *  v1.0.0
 **/
test('linestrip draws correctly', (t) => {
    t.plan(1);

    const data = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 },
        { x: -3, y: 0, z: 2 }
    ];

    const lineStrip = lineStrips3D().scale(30).origin({ x: 220, y: 340 });

    t.equal(
        lineStrip.draw(lineStrip([data])[0]),
        'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490'
    );
    t.end();
});

test('centroid calculation for linesstrip', (t) => {
    t.plan(2);

    const data1 = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 },
        { x: -3, y: 0, z: 2 }
    ];

    const data2 = [
        { x: 3, y: 5, z: 2 },
        { x: 2, y: 45, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: 0, y: 9, z: 3 },
        { x: -1, y: 3, z: 2 },
        { x: -2, y: 8, z: 4 }
    ];

    const lineStrip = lineStrips3D().scale(30).origin({ x: 220, y: 340 });

    t.deepEqual(lineStrip([data1])[0].centroid, { x: 0, y: 9, z: 3 });
    t.deepEqual(lineStrip([data2])[0].centroid, { x: 0.5, y: 5, z: 2.5 });

    t.end();
});
