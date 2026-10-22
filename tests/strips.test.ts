import { describe, test, expect } from 'vite-plus/test';
import { lineStrips3D, sort, strips } from '../index';

describe('strips', () => {
    test('cuts a line into its segments with a size of 2', () => {
        expect(strips(['a', 'b', 'c', 'd'], 2)).toEqual([
            ['a', 'b'],
            ['b', 'c'],
            ['c', 'd']
        ]);
    });

    test('lets the strips share their end points', () => {
        expect(strips(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([
            ['a', 'b', 'c'],
            ['c', 'd', 'e']
        ]);
    });

    test('shortens the last strip when the points run out', () => {
        expect(strips(['a', 'b', 'c', 'd'], 3)).toEqual([
            ['a', 'b', 'c'],
            ['c', 'd']
        ]);
    });

    test('returns no strip for less than two points', () => {
        expect(strips([], 3)).toEqual([]);
        expect(strips(['a'], 3)).toEqual([]);
    });

    test('lets every strip of a line sort on its own depth', () => {
        // A line from the back to the front: one strip would sit in the middle.
        const line = [-2, -1, 0, 1, 2].map((z) => ({ x: 0, y: 0, z }));
        const depths = lineStrips3D()
            .data(strips(line, 3))
            .sort(sort)
            .map((strip) => strip.centroid.z);

        expect(depths).toEqual([-1, 1]);
    });
});
