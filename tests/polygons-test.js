import { test } from 'tape';
import { polygons3D } from '../index.js';

test('polygons3D draws correctly', function (t) {
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

    const polygons = polygons3D().scale(30).origin({ x: 220, y: 340 });

    t.equal(
        polygons.draw(polygons([data])[0]),
        'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490Z'
    );
    t.end();
});

test('polygons3D has expected defaults', (t) => {
    t.plan(11);

    const polygons = polygons3D();
    t.deepEqual(polygons.origin(), { x: 0, y: 0 });
    t.equal(polygons.scale(), 1);
    t.equal(polygons.rotateX(), 0);
    t.equal(polygons.rotateY(), 0);
    t.equal(polygons.rotateZ(), 0);
    t.deepEqual(polygons.rotationCenter(), { x: 0, y: 0, z: 0 });
    t.equal(typeof polygons.draw, 'function');
    t.equal(typeof polygons.sort, 'function');
    t.equal(typeof polygons.x, 'function');
    t.equal(typeof polygons.y, 'function');
    t.equal(typeof polygons.z, 'function');
    t.end();
});
