import { describe, test, expect } from 'vite-plus/test';
import { axes3D, axisSpec } from '../index';
import type { TickScale } from '../index';

// A stand-in for a niced d3 scaleLinear over 0 to 10.
const scale: TickScale = {
    domain: () => [0, 10],
    ticks: (count = 10) => Array.from({ length: count + 1 }, (_, i) => (i * 10) / count)
};

describe('axisSpec', () => {
    test('takes the domain and the ticks of a scale', () => {
        expect(axisSpec(scale, 2)).toEqual({ domain: [0, 10], ticks: [0, 5, 10] });
    });

    test('leaves the number of ticks to the scale', () => {
        expect(axisSpec(scale).ticks).toHaveLength(11);
    });

    test('describes an axis that axes3D draws', () => {
        const spec = { x: axisSpec(scale, 2), y: axisSpec(scale, 2), z: axisSpec(scale, 2) };
        const edges = axes3D().rotateY(0.5).rotateX(-0.4).axes(spec);

        expect(edges.map((edge) => edge.length)).toEqual([3, 3, 3]);
    });
});
