import { test } from 'tape';
import { sort } from '../src/sort.js';

test('Sort function works properly', (t) => {
    t.deepEqual(sort({ centroid: { z: 1 } }, { centroid: { z: 10 } }), -1);
    t.deepEqual(sort({ centroid: { z: 10 } }, { centroid: { z: 1 } }), 1);
    t.deepEqual(sort({ centroid: { z: 1 } }, { centroid: { z: 1 } }), 0);
    t.deepEqual(sort({ centroid: { z: 1 } }, { centroid: { z: '1' } }), 0);
    t.deepEqual(
        isNaN(
            sort(
                {
                    centroid: {
                        z: function () {
                            return false;
                        }
                    }
                },
                { centroid: { z: false } }
            )
        ),
        true
    );

    t.end();
});
