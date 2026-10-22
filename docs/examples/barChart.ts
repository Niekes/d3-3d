import { color, interpolateNumber, randomUniform, scaleOrdinal, schemeDark2, select } from 'd3';
import { axes3D, box, camera3D, cubes3D, orthographic, sort } from '../../index';
import type { AxesSpec, Cube, CubeFace, Cubes3DInstance, Point3D } from '../../index';
import { drawChartBox } from './axisEdges';
import { dragRotate, turnCamera } from './rotatingFigure';

/*
 * A bar chart: cubes3D turns the eight vertices of each bar into six named
 * faces, the drag turns the camera both renderers share, the `sort` utility
 * orders the bars by the depth of their footprint and their faces by the
 * depth of their centre, and the label of every bar tweens from its old
 * height to the new one. axes3D draws the box around the bars: the back
 * walls with their gridlines and an axis along the outline.
 */

const ORIGIN = { x: 480, y: 300 };
const START_ANGLE = Math.PI / 6;
const SCALE = 20;
const FIELD = 10;
const INTRO_DURATION = 1000;
const MAX_HEIGHT = 8;
const AXIS_TITLES = { x: 'x', y: 'height', z: 'z' };

// The box: one tick per bar along x and z, and the heights grow upwards,
// which is towards a negative y on the screen.
const SPEC: AxesSpec = {
    x: { domain: [-FIELD - 1, FIELD + 1], ticks: [-10, -5, 0, 5, 10] },
    y: { domain: [0, -MAX_HEIGHT], ticks: [0, -2, -4, -6, -8] },
    z: { domain: [-FIELD / 2 - 1, FIELD / 2 + 1], ticks: [-5, 0, 5] }
};

/** One vertex of a bar: a point that carries the id and the height of its bar. */
type BarVertex = Point3D & { id: string; height: number };

/** One bar after the projection, with the centroid of its footprint to sort by. */
type BarCube = Cube<BarVertex> & { id: string; height: number };

/** The datum of a label: the height to show and the centre of the top face. */
type BarLabel = { height: number; centroid: Point3D };

/** The eight vertices of one bar, from its footprint and its height, negative upwards. */
function makeBar(id: string, height: number, x: number, z: number): BarVertex[] {
    return box({ x, y: 0, z, width: 2, height: -height, depth: 2 }).map((corner) => ({
        ...corner,
        id,
        height
    }));
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountBarChart(host: HTMLElement): () => void {
    // The bars and the box hang on one camera, so turning it turns both.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const start = { yaw: START_ANGLE, tilt: START_ANGLE };
    turnCamera(camera, 0, 0, start);
    const cubes: Cubes3DInstance<BarVertex> = cubes3D<BarVertex>().camera(camera);
    const chartBox = axes3D().camera(camera);

    const colorScale = scaleOrdinal<string>(schemeDark2);

    let bars: BarVertex[][] = [];

    host.innerHTML = `
        <svg class="bar-svg" viewBox="0 0 960 500" role="img"
          aria-label="A 3D bar chart of fifteen bars. Drag the figure to rotate it.">
        </svg>
        <button class="bar-button" type="button">update</button>`;

    const svg = select(host).select<SVGSVGElement>('svg');
    const wallGroup = svg.append('g').attr('class', 'bar-walls');
    const axisGroup = svg.append('g').attr('class', 'bar-axes');
    const group = svg.append('g');
    const button = select(host).select<HTMLButtonElement>('button');

    /**
     * Projects the bars and re-attaches their labels. The transform returns
     * fresh arrays, but every transformed vertex keeps the properties of
     * its input, so the id and the height are still on the first vertex.
     *
     * The bars stand on one floor, so they sort by their footprint: the
     * centre of a tall bar sits high up, and seen from above it would paint
     * over a short bar in front of it.
     */
    function project(): BarCube[] {
        return cubes.data(bars).map((cube) => {
            const first = cube[0];
            return Object.assign(cube, {
                id: first.id,
                height: first.height,
                centroid: cube.faces.find((face) => face.face === 'bottom')!.centroid
            });
        });
    }

    /** Draws the walls that face away from the camera and the axes on the outline. */
    function drawBox(): void {
        drawChartBox(
            wallGroup,
            axisGroup,
            chartBox,
            SPEC,
            (axis, value) => String(axis === 'y' ? -value : value),
            (axis) => AXIS_TITLES[axis]
        );
    }

    /** Joins the bars, their faces and their labels, and repaints them back to front. */
    function draw(projected: BarCube[], duration: number): void {
        drawBox();

        const cubeGroups = group
            .selectAll<SVGGElement, BarCube>('g.cube')
            .data(projected, (d) => d.id);

        const entered = cubeGroups
            .enter()
            .append('g')
            .attr('class', 'cube')
            .attr('fill', (d) => colorScale(d.id))
            .attr('stroke', (d) => color(colorScale(d.id))!.darker(2).toString())
            .merge(cubeGroups)
            .sort(sort);

        cubeGroups.exit().remove();

        /* --------- FACES --------- */

        const faces = entered.selectAll<SVGPathElement, CubeFace<BarVertex>>('path.face').data(
            (d) => d.faces ?? [],
            (d) => d.face
        );

        faces
            .enter()
            .append('path')
            .attr('class', 'face')
            .attr('fill-opacity', 0.95)
            .classed('d3-3d', true)
            .merge(faces)
            .transition()
            .duration(duration)
            .attr('d', cubes.draw);

        faces.exit().remove();

        /* --------- LABELS --------- */

        const view = { origin: camera.origin(), scale: camera.scale() };
        const labelX = (d: BarLabel) => orthographic(d.centroid, view).x;
        const labelY = (d: BarLabel) => orthographic(d.centroid, view).y;

        const labels = entered.selectAll<SVGTextElement, BarLabel>('text.text').data((d) => {
            const top = (d.faces ?? []).filter((face) => face.face === 'top')[0];
            return [{ height: d.height, centroid: top.centroid }];
        });

        labels
            .enter()
            .append('text')
            .attr('class', 'text')
            .attr('dy', '-0.7em')
            .attr('text-anchor', 'middle')
            .attr('font-family', 'system-ui, sans-serif')
            .attr('font-weight', 'bolder')
            .attr('x', labelX)
            .attr('y', labelY)
            // Inline styles beat the fill and the stroke the label would
            // otherwise inherit from its bar: the variable follows the theme,
            // the fallback covers a page without the styles.
            .style('fill', 'var(--bc-stroke, #1b1e21)')
            .style('stroke', 'none')
            .classed('d3-3d', true)
            .merge(labels)
            .transition()
            .duration(duration)
            .attr('x', labelX)
            .attr('y', labelY)
            .tween('text', function (this: SVGTextElement, d) {
                const that = select(this);
                const interpolate = interpolateNumber(Number(that.text()), Math.abs(d.height));
                return (t) => {
                    that.text(interpolate(t).toFixed(1));
                };
            });

        labels.exit().remove();

        /* --------- ORDER --------- */

        // The bars are ordered by the depth of their centre, and inside a
        // bar the faces and the label by the depth of theirs.
        entered.selectAll<SVGElement, { centroid: Point3D }>('.d3-3d').sort(sort);
    }

    /** Samples a fresh set of depths and fades the bars to it. */
    function sample(): void {
        bars = [];
        let count = 0;
        for (let z = -FIELD / 2; z <= FIELD / 2; z += 5) {
            for (let x = -FIELD; x <= FIELD; x += 5) {
                const height = randomUniform(-MAX_HEIGHT + 1, -2)();
                bars.push(makeBar(`bar-${count}`, height, x, z));
                count += 1;
            }
        }
        draw(project(), INTRO_DURATION);
    }

    svg.call(
        dragRotate((yaw, pitch) => {
            turnCamera(camera, yaw, pitch, start);
            draw(project(), 0);
        })
    );

    button.on('click', () => sample());

    sample();

    return () => {
        host.innerHTML = '';
    };
}
