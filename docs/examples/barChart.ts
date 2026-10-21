import {
    color,
    drag,
    interpolateNumber,
    randomUniform,
    scaleOrdinal,
    schemeDark2,
    select
} from 'd3';
import { cubes3D, sort } from '../../index';
import type { Cube, CubeFace, Cubes3DInstance, Point3D } from '../../index';

/*
 * A bar chart: cubes3D turns the eight vertices of each bar into six named
 * faces, the drag rotates the scene, the `sort` utility orders the bars and
 * their faces by the depth of their centre and the label of every bar tweens
 * from its old height to the new one.
 */

const ORIGIN = { x: 480, y: 300 };
const START_ANGLE = Math.PI / 6;
const DRAG_FACTOR = Math.PI / 230;
const SCALE = 20;
const FIELD = 10;
const INTRO_DURATION = 1000;

/** One vertex of a bar: a point that carries the id and the height of its bar. */
type BarVertex = Point3D & { id: string; height: number };

/** One bar after the projection: the transformed cube plus its own label. */
type BarCube = Cube<BarVertex> & { id: string; height: number; centroid: Point3D };

/** The datum of a label: the height to show and the centre of the top face. */
type BarLabel = { height: number; centroid: Point3D };

/** The eight vertices of one bar, from its footprint and its depth. */
function makeBar(id: string, height: number, x: number, z: number): BarVertex[] {
    const v = (vx: number, vy: number, vz: number): BarVertex => ({
        x: vx,
        y: vy,
        z: vz,
        id,
        height
    });
    return [
        v(x - 1, height, z + 1), // front top left
        v(x - 1, 0, z + 1), // front bottom left
        v(x + 1, 0, z + 1), // front bottom right
        v(x + 1, height, z + 1), // front top right
        v(x - 1, height, z - 1), // back top left
        v(x - 1, 0, z - 1), // back bottom left
        v(x + 1, 0, z - 1), // back bottom right
        v(x + 1, height, z - 1) // back top right
    ];
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountBarChart(host: HTMLElement): () => void {
    const cubes: Cubes3DInstance<BarVertex> = cubes3D<BarVertex>()
        .scale(SCALE)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE);

    const colorScale = scaleOrdinal<string>(schemeDark2);

    let bars: BarVertex[][] = [];

    // The drag: the pointer distance becomes a rotation, and the distance of
    // a finished drag is kept for the next one.
    let startX = 0;
    let startY = 0;
    let keptX = 0;
    let keptY = 0;

    host.innerHTML = `
        <svg class="bar-svg" viewBox="0 0 960 500" role="img"
          aria-label="A 3D bar chart of fifteen bars. Drag the figure to rotate it.">
        </svg>
        <button class="bar-button" type="button">update</button>`;

    const svg = select(host).select<SVGSVGElement>('svg');
    const group = svg.append('g');
    const button = select(host).select<HTMLButtonElement>('button');

    /**
     * Projects the bars and re-attaches their labels. The transform returns
     * fresh arrays, but every transformed vertex keeps the properties of
     * its input, so the id and the height are still on the first vertex.
     */
    function project(): BarCube[] {
        return cubes.data(bars).map((cube) => {
            const first = cube[0];
            return Object.assign(cube, {
                id: first.id,
                height: first.height,
                centroid: cube.centroid as Point3D
            });
        });
    }

    /** Joins the bars, their faces and their labels, and repaints them back to front. */
    function draw(projected: BarCube[], duration: number): void {
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

        const labelX = (d: BarLabel) => ORIGIN.x + SCALE * d.centroid.x;
        const labelY = (d: BarLabel) => ORIGIN.y + SCALE * d.centroid.y;

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
                const height = randomUniform(-7, -2)();
                bars.push(makeBar(`bar-${count}`, height, x, z));
                count += 1;
            }
        }
        draw(project(), INTRO_DURATION);
    }

    svg.call(
        drag<SVGSVGElement, unknown>()
            .on('start', (event) => {
                startX = event.x;
                startY = event.y;
            })
            .on('drag', (event) => {
                const yaw = (event.x - startX + keptX) * DRAG_FACTOR;
                const pitch = (event.y - startY + keptY) * DRAG_FACTOR;
                cubes.rotateY(yaw + START_ANGLE).rotateX(-pitch - START_ANGLE);
                draw(project(), 0);
            })
            .on('end', (event) => {
                keptX += event.x - startX;
                keptY += event.y - startY;
            })
    );

    button.on('click', () => sample());

    sample();

    return () => {
        host.innerHTML = '';
    };
}
