/**
 * Cuts a polyline into strips of `size` points that share their end points,
 * the last one shorter if the points run out.
 *
 * `sort` orders a line strip by the depth of its middle, so a long line that
 * passes in front of a shape and behind it again is painted wrong as a
 * whole. Cut into strips, every piece sorts on its own depth. A `size` of 2
 * cuts the line into its segments.
 */
export function strips<T>(points: ReadonlyArray<T>, size: number): T[][] {
    const step = Math.max(1, size - 1);
    const result: T[][] = [];
    for (let from = 0; from < points.length - 1; from += step) {
        result.push(points.slice(from, from + step + 1));
    }
    return result;
}
