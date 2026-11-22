import { describe, test, expect } from 'vite-plus/test';
import { sort } from '../index';

describe('sort', () => {
    test('works properly', () => {
        expect(sort({ centroid: { z: 1 } }, { centroid: { z: 10 } })).toBe(-1);
        expect(sort({ centroid: { z: 10 } }, { centroid: { z: 1 } })).toBe(1);
        expect(sort({ centroid: { z: 1 } }, { centroid: { z: 1 } })).toBe(0);
        expect(sort({ centroid: { z: 1 } }, { centroid: { z: '1' as any } })).toBe(0);

        const result = sort(
            {
                centroid: {
                    z: 0
                }
            },
            { centroid: { z: 0 } }
        );

        expect(result).toBe(0);
    });

    test('puts an empty shape, whose centroid is NaN, at the back', () => {
        const shapes = [3, Number.NaN, 1, 2].map((z) => ({ centroid: { z } }));
        const depths = (list: typeof shapes) => list.map((shape) => shape.centroid.z);

        expect(depths([...shapes].sort(sort))).toEqual([Number.NaN, 1, 2, 3]);
        expect(depths([...shapes].reverse().sort(sort))).toEqual([Number.NaN, 1, 2, 3]);
    });
});
