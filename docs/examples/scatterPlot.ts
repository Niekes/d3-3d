import { drag, randomUniform, scaleOrdinal, schemeCategory10, select } from 'd3';
import { gridPlanes3D, lineStrips3D, points3D, sort } from '../../index';
import type {
    GridPlane,
    GridPlanes3DInstance,
    HasCentroid,
    LineStrip,
    LineStrips3DInstance,
    Point,
    Point3D,
    Points3DInstance,
    TransformedPoint
} from '../../index';

/*
 * A 3D scatter plot: gridPlanes3D draws the checkered floor, points3D the
 * samples scattered over it and lineStrips3D the y axis with its tick
 * labels. The drag rotates the whole scene, and the `sort` utility paints
 * every element back to front.
 */

const ORIGIN = { x: 480, y: 250 };
const FIELD = 10;
const POINTS_PER_ROW = FIELD * 2;
const SCALE = 20;
const DEPTH = 10;
const START_ANGLE = Math.PI / 4;
const DRAG_FACTOR = Math.PI / 230;
const INTRO_DURATION = 750;

/** A sample of the scatter plot: a position in the field with a stable id. */
type ScatterPoint = Point3D & { id: string };

/** One tick of the y axis: a transformed axis point with the centroid the sort reads. */
type AxisTick = TransformedPoint<Point3D> & { centroid: Point3D };

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountScatterPlot(host: HTMLElement): () => void {
    const grid3d: GridPlanes3DInstance<Point3D> = gridPlanes3D<Point3D>()
        .scale(SCALE)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE)
        .rows(POINTS_PER_ROW);

    const points3d: Points3DInstance<ScatterPoint> = points3D<ScatterPoint>()
        .scale(SCALE)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE);

    const axis3d: LineStrips3DInstance<Point3D> = lineStrips3D<Point3D>()
        .scale(SCALE)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE);

    const colorScale = scaleOrdinal(schemeCategory10);

    // The scene: the floor, the samples and the y axis.
    const grid: Point3D[] = [];
    const scatter: ScatterPoint[] = [];
    const axis: Point3D[] = [];

    // The drag: the pointer distance becomes a rotation, and the distance of
    // a finished drag is kept for the next one.
    let startX = 0;
    let startY = 0;
    let keptX = 0;
    let keptY = 0;

    const yaw = (x: number) => (x - startX + keptX) * DRAG_FACTOR;
    const pitch = (y: number) => (y - startY + keptY) * DRAG_FACTOR;

    host.innerHTML = `
        <svg class="scatter-svg" viewBox="0 0 960 500" role="img"
          aria-label="A 3D scatter plot over a checkered floor. Drag the figure to rotate it.">
        </svg>
        <button class="scatter-button" type="button">update</button>`;

    const svg = select(host).select<SVGSVGElement>('svg');
    const group = svg.append('g');
    const button = select(host).select<HTMLButtonElement>('button');

    /** Turns every renderer by the angles of the scene. */
    function rotate(y: number, x: number): void {
        grid3d.rotateY(y).rotateX(x);
        points3d.rotateY(y).rotateX(x);
        axis3d.rotateY(y).rotateX(x);
    }

    /** Joins the floor, the points, the axis and its ticks, and repaints them back to front. */
    function draw(
        planes: GridPlane<Point3D>[],
        points: Point<ScatterPoint>[],
        axisStrips: LineStrip<Point3D>[],
        duration: number
    ): void {
        /* ---- floor ---- */

        const gridJoin = group
            .selectAll<SVGPathElement, GridPlane<Point3D>>('path.grid')
            .data(planes, (d) => d.plane);

        gridJoin
            .enter()
            .append('path')
            .attr('class', 'd3-3d grid')
            .merge(gridJoin)
            .attr('class', (d) => 'd3-3d grid ' + (d.ccw ? 'grid-front' : 'grid-back'))
            .attr('d', grid3d.draw);

        gridJoin.exit().remove();

        /* ---- points ---- */

        const pointsJoin = group
            .selectAll<SVGCircleElement, Point<ScatterPoint>>('circle')
            .data(points, (d) => d.id);

        pointsJoin
            .enter()
            .append('circle')
            .attr('class', 'd3-3d point')
            .attr('opacity', 0)
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .merge(pointsJoin)
            .transition()
            .duration(duration)
            .attr('r', 3)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.5)
            .attr('fill', (d) => colorScale(d.id))
            .attr('opacity', 1)
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y);

        pointsJoin.exit().remove();

        /* ---- y axis ---- */

        const axisJoin = group
            .selectAll<SVGPathElement, LineStrip<Point3D>>('path.yScale')
            .data(axisStrips);

        axisJoin
            .enter()
            .append('path')
            .attr('class', 'd3-3d yScale')
            .merge(axisJoin)
            .attr('d', (strip) => axis3d.draw(strip));

        axisJoin.exit().remove();

        /* ---- y axis ticks ---- */

        const ticks: AxisTick[] = axisStrips[0]
            .filter((d) => d.y <= 0)
            .map((d) => ({ ...d, centroid: d.rotated }));

        const tickJoin = group.selectAll<SVGTextElement, AxisTick>('text.yText').data(ticks);

        tickJoin
            .enter()
            .append('text')
            .attr('class', 'd3-3d yText')
            .merge(tickJoin)
            .attr('x', (d) => d.projected.x)
            .attr('y', (d) => d.projected.y)
            .text((d) => d.y);

        tickJoin.exit().remove();

        group.selectAll<SVGElement, HasCentroid>('.d3-3d').sort(sort);
    }

    /** Transforms the scene with the current rotation and draws it. */
    function drawScene(duration: number): void {
        draw(grid3d.data(grid), points3d.data(scatter), axis3d.data([axis]), duration);
    }

    /** Builds the floor and the axis once, both stay for the life of the figure. */
    function initScene(): void {
        let cnt = 0;
        for (let z = -FIELD; z < FIELD; z += 1) {
            for (let x = -FIELD; x < FIELD; x += 1) {
                grid.push({ x, y: 1, z });
                scatter.push({
                    x,
                    y: randomUniform(-DEPTH, 0)(),
                    z,
                    id: 'point-' + cnt++
                });
            }
        }

        for (let y = 1; y >= -DEPTH; y -= 1) {
            axis.push({ x: -FIELD, y, z: -FIELD });
        }
    }

    /** Samples new heights for the points, the ids stay the same. */
    function resample(): void {
        for (const point of scatter) {
            point.y = randomUniform(-DEPTH, 0)();
        }
    }

    svg.call(
        drag<SVGSVGElement, unknown>()
            .on('start', (event) => {
                startX = event.x;
                startY = event.y;
            })
            .on('drag', (event) => {
                rotate(yaw(event.x) + START_ANGLE, -pitch(event.y) - START_ANGLE);
                drawScene(0);
            })
            .on('end', (event) => {
                keptX += event.x - startX;
                keptY += event.y - startY;
            })
    );

    button.on('click', () => {
        resample();
        drawScene(INTRO_DURATION);
    });

    initScene();
    drawScene(INTRO_DURATION);

    return () => {
        host.innerHTML = '';
    };
}
