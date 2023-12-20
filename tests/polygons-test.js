import { test } from 'tape';
import { polygons3D } from '../index.js';

test.only('polygons3D draws correctly', function (t) {
    t.plan(1);

    const data = [
        [3, 5, 2],
        [2, 45, 2],
        [1, 1, 2],
        [0, 9, 3],
        [-1, 3, 2],
        [-2, 8, 4],
        [-3, 0, 2]
    ];

    const polygons = polygons3D().scale(30).origin([220, 340]);

    t.equal(
        polygons.draw(polygons([data])[0]),
        'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490Z'
    );
    t.end();
});
