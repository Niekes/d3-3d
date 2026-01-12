import { describe, test, expect } from 'vitest';
import { sort } from '../src/sort';

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
});
