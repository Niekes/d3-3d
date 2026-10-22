import { AxisSpec } from './types';

/**
 * A continuous scale with ticks, such as d3's `scaleLinear`.
 */
export interface TickScale {
    domain(): number[];
    ticks(count?: number): number[];
}

/**
 * One axis of `axes3D` from a scale: the domain of the scale and about
 * `count` of its ticks.
 *
 * Call `.nice()` on the scale first, so the box ends on a tick.
 */
export function axisSpec(scale: TickScale, count?: number): AxisSpec {
    return { domain: scale.domain(), ticks: scale.ticks(count) };
}
