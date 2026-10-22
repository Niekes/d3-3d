import type { Selection } from 'd3';
import type { Axes3DInstance, AxesSpec, AxisEdge, AxisWall } from '../../index';

/**
 * Draws the box of a chart: the walls that face away from the camera, with
 * their gridlines, and the axes on its outline.
 */
export function drawChartBox(
    walls: Selection<SVGGElement, unknown, null, undefined>,
    axes: Selection<SVGGElement, unknown, null, undefined>,
    box: Axes3DInstance,
    spec: AxesSpec,
    label: (axis: keyof AxesSpec, value: number) => string,
    title: (axis: keyof AxesSpec) => string
): void {
    walls
        .selectAll<SVGPathElement, AxisWall>('path')
        .data(box.data(spec).filter((wall) => !wall.ccw))
        .join('path')
        .attr('d', box.draw);

    drawAxisEdges(axes, box.axes(spec), label, title, () => 'currentColor');
}

/**
 * Draws the axes that axes3D puts on the outline of the box. The ticks and
 * the labels are pushed away from the box along the normal of their edge,
 * so the labels of two axes that meet in a corner part ways.
 */
export function drawAxisEdges(
    parent: Selection<SVGGElement, unknown, null, undefined>,
    edges: AxisEdge[],
    label: (axis: keyof AxesSpec, value: number) => string,
    title: (axis: keyof AxesSpec) => string,
    color: (axis: keyof AxesSpec) => string
): void {
    const ticksOf = edges.flatMap((edge) => edge.map((tick) => ({ tick, edge })));
    const first = (edge: AxisEdge) => edge[0].projected;
    const last = (edge: AxisEdge) => edge[edge.length - 1].projected;

    parent
        .selectAll<SVGLineElement, AxisEdge>('line.axis-line')
        .data(edges)
        .join('line')
        .attr('class', 'axis-line')
        .attr('stroke', (d) => color(d.axis))
        .attr('x1', (d) => first(d).x)
        .attr('y1', (d) => first(d).y)
        .attr('x2', (d) => last(d).x)
        .attr('y2', (d) => last(d).y);

    parent
        .selectAll<SVGLineElement, (typeof ticksOf)[number]>('line.tick-mark')
        .data(ticksOf)
        .join('line')
        .attr('class', 'tick-mark')
        .attr('x1', (d) => d.tick.projected.x)
        .attr('y1', (d) => d.tick.projected.y)
        .attr('x2', (d) => d.tick.projected.x + d.edge.normal.x * 6)
        .attr('y2', (d) => d.tick.projected.y + d.edge.normal.y * 6);

    parent
        .selectAll<SVGTextElement, (typeof ticksOf)[number]>('text.tick-label')
        .data(ticksOf)
        .join('text')
        .attr('class', 'tick-label')
        .attr('text-anchor', (d) =>
            d.edge.normal.x > 0.3 ? 'start' : d.edge.normal.x < -0.3 ? 'end' : 'middle'
        )
        .attr('x', (d) => d.tick.projected.x + d.edge.normal.x * 10)
        .attr('y', (d) => d.tick.projected.y + d.edge.normal.y * 10)
        .text((d) => label(d.edge.axis, d.tick[d.edge.axis]));

    parent
        .selectAll<SVGTextElement, AxisEdge>('text.axis-title')
        .data(edges)
        .join('text')
        .attr('class', 'axis-title')
        .attr('fill', (d) => color(d.axis))
        .attr('x', (d) => (first(d).x + last(d).x) / 2 + d.normal.x * 38)
        .attr('y', (d) => (first(d).y + last(d).y) / 2 + d.normal.y * 38)
        .text((d) => title(d.axis));
}
