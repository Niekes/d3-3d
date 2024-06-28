import type { SvgProperties } from 'csstype';

/**
 * A generic type for a 3D generator function, capable of transforming data into 3D shapes.
 */
export type Shape3DGenerator<Shape3D> = {
    /**
     * Generates 3D shapes based on specified parameters and transformations.
     *
     * @param data The data representing the 3D shapes.
     * @returns An array of 3D shapes generated with the specified parameters and transformations.
     *
     */
    (data: Shape3D[]): Shape3D[];

    /**
     * Sets or retrieves the origin for rendering the 3D shapes.
     *
     * @param o The origin point for rendering the 3D shapes.
     * @returns If no argument is provided, returns the current origin. Otherwise, sets the origin and returns the function.
     */
    origin(o?: Point2D): typeof o extends undefined ? Point2D : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the scale factor for the 3D shapes.
     *
     * @param s The scale factor for the 3D shapes.
     * @returns If no argument is provided, returns the current scale factor. Otherwise, sets the scale factor and returns the function.
     */
    scale(s?: number): typeof s extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the rotation angle around the x-axis.
     *
     * @param ax The rotation angle around the x-axis.
     * @returns If no argument is provided, returns the current rotation angle around the x-axis. Otherwise, sets the rotation angle and returns the function.
     */
    rotateX(ax?: number): typeof ax extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the rotation angle around the y-axis.
     *
     * @param ay The rotation angle around the y-axis.
     * @returns If no argument is provided, returns the current rotation angle around the y-axis. Otherwise, sets the rotation angle and returns the function.
     */
    rotateY(ay?: number): typeof ay extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the rotation angle around the z-axis.
     *
     * @param az The rotation angle around the z-axis.
     * @returns If no argument is provided, returns the current rotation angle around the z-axis. Otherwise, sets the rotation angle and returns the function.
     */
    rotateZ(az?: number): typeof az extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the rotation center for the 3D shapes.
     *
     * @param rc The rotation center for the 3D shapes.
     * @returns If no argument is provided, returns the current rotation center. Otherwise, sets the rotation center and returns the function.
     */
    rotationCenter(
        rc?: number[]
    ): typeof rc extends undefined ? number[] : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the x-coordinate for the 3D shapes.
     *
     * @param px The x-coordinate for the 3D shapes.
     * @returns If no argument is provided, returns the current x-coordinate. Otherwise, sets the x-coordinate and returns the function.
     */
    x(
        px?: number | ((p: Point3D) => number)
    ): typeof px extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the y-coordinate for the 3D shapes.
     *
     * @param py The y-coordinate for the 3D shapes.
     * @returns If no argument is provided, returns the current y-coordinate. Otherwise, sets the y-coordinate and returns the function.
     */
    y(
        py?: number | ((p: Point3D) => number)
    ): typeof py extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Sets or retrieves the z-coordinate for the 3D shapes.
     *
     * @param pz The z-coordinate for the 3D shapes.
     * @returns If no argument is provided, returns the current z-coordinate. Otherwise, sets the z-coordinate and returns the function.
     */
    z(
        pz?: number | ((p: Point3D) => number)
    ): typeof pz extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * !IMPORT! ONLY FOR gridplanes
     * Sets or retrieves the rows for 3d gridplanes.
     *
     * @param pz The z-coordinate for the 3D shapes.
     * @returns If no argument is provided, returns the current rows. Otherwise, sets the rows and returns the function.
     */
    rows(pz?: number): typeof pz extends undefined ? number : Shape3DGenerator<Shape3D>;

    /**
     * Comparator function to sort objects based on their centroid z-values.
     *
     * This function compares the z-values of the centroid property of two objects (a and b).
     * It returns a negative number if a should come before b, a positive number if a should come after b,
     * and 0 if a and b are considered equal in terms of sorting.
     *
     * @param a The first object to compare.
     * @param b The second object to compare.
     * @returns A negative, zero, or positive number indicating the sorting order.
     *
     * @example
     * // Sorting an array of objects based on centroid z-values
     * const sortedArray = unsortedArray.sort(sort);
     */
    sort(a: Shape3D, b: Shape3D): number;

    /**
     * A function that draws 3D shapes.
     */
    draw(shapes: Shape3D[]): void;
};

type Point2D = {
    x: number;
    y: number;
};

/**
 * A point in 3D space represented by the <circle> element.
 * Each point has three coordinates which can be accessed via the x, y, and z accessors.
 */
export type Point3D = {
    x: number;
    y: number;
    z: number;
} & SvgProperties;

/**
 * A line in 3D space represented by the <line> element, defined by a start and an endpoint.
 */
export type Line3D = {
    start: Point3D;
    end: Point3D;
} & SvgProperties;

/**
 * A line strip in 3D space, constructed from an array of points, represented by the <path> element.
 * Every point will be connected to the next point in the input data array.
 */
export type LineStrips3D = Point3D[];

/**
 * A triangle in 3D space, defined by three points in counter-clockwise order, represented by the <path> element.
 */
export type Triangle3D = [Point3D, Point3D, Point3D];

/**
 * A plane in 3D space, defined by four points in counter-clockwise order, represented by the <path> element.
 */
export type Plane3D = [Point3D, Point3D, Point3D, Point3D];

/**
 * A grid plane (multiple planes) in 3D space, constructed from an array of points, represented by x planes.
 * Note: A grid must always have the same number of points per row.
 */
export type GridPlane3D = Point3D[];

/**
 * A polygon in 3D space, defined by x points in counter-clockwise order, represented by the <path> element.
 */
export type Polygon3D = Point3D[];

/**
 * A cube in 3D space, defined by 8 vertices, represented by 4 planes.
 */
export type Cube3D = Point3D[];

/**
 * Creates a new 3D generator for drawing a shape specified by the shape method.
 */
export function _3d<Shape3D>(): Shape3DGenerator<Shape3D> & {
    /**
     * Sets or retrieves the shape for the 3D generator.
     *
     * @param s The shape for the 3D generator.
     * @returns If no argument is provided, returns the current shape. Otherwise, sets the shape and returns the function.
     */
    shape(
        s?: ShapeKind,
        row?: number
    ): typeof s extends undefined ? ShapeKind : Shape3DGenerator<Shape3D>;
};

type ShapeKind =
    | 'CUBE'
    | 'GRID'
    | 'LINE'
    | 'LINE_STRIP'
    | 'PLANE'
    | 'POINT'
    | 'SURFACE'
    | 'TRIANGLE';

/**
 * Creates a new 3D generator for drawing points.
 * A point is represented by the <circle> element. It does not have a draw function because it can be represented as a <circle>.
 * The input data array has to be an array of points where each point has three coordinates which can be accessed via the x, y, and z accessors.
 */
export function points3D(): Shape3DGenerator<Point3D>;

/**
 * Creates a new 3D generator for drawing lines.
 * A line is represented by the <line> element. It does not have a draw function because it can be represented as a <line>.
 * The input data array has to be an array of lines where each line is defined by a start- and an endpoint.
 */
export function lines3D(): Shape3DGenerator<Line3D>;

/**
 * Creates a new 3D generator for drawing line strips.
 * A continuous line is represented by the <path> element. The input data array has to be an array of points.
 * Every point will be connected to the next point in the input data array.
 */
export function lineStrips3D(): Shape3DGenerator<LineStrips3D>;

/**
 * Creates a new 3D generator for drawing triangles.
 * A triangle is represented by the <path> element. The input data array has to be an array of triangles where each triangle is defined by three points in counter-clockwise order.
 */
export function triangles3D(): Shape3DGenerator<Triangle3D>;

/**
 * Creates a new 3D generator for drawing planes.
 * A plane is represented by the <path> element. The input data array has to be an array of planes where each plane is defined by four points in counter-clockwise order.
 */
export function planes3D(): Shape3DGenerator<Plane3D>;

/**
 * Creates a new 3D generator for drawing grid planes.
 * A grid is represented by x planes. The input data array has to be an array of points. d3-3d will construct planes out of the passed data.
 * NOTE: A grid has to have always the same number of points per row. Otherwise, the code will break.
 */
export function gridPlanes3D(): Shape3DGenerator<GridPlane3D>;

/**
 * Creates a new 3D generator for drawing polygons.
 * A polygon is represented by the <path> element. The input data array has to be an array of polygons where each polygon is defined by x points in counter-clockwise order.
 */
export function polygons3D(): Shape3DGenerator<Polygon3D>;

/**
 * Creates a new 3D generator for drawing cubes.
 * A cube is represented by 4 planes. The input data array has to be an array of cubes where each cube is defined by 8 vertices.
 * To get the orientation and centroid calculation right, you should pass in the data like so:
 */
export function cubes3D(): Shape3DGenerator<Cube3D>;
