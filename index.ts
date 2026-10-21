/**
 * @author Stefan Nieke (Niekes)
 * @description http://niekes.com
 */

// Shape factories - one per shape module under src/shapes.
export { axes3D } from './src/shapes/axes';
export { cubes3D } from './src/shapes/cubes';
export { gridPlanes3D } from './src/shapes/gridPlanes';
export { iso3D } from './src/shapes/iso';
export { lines3D } from './src/shapes/lines';
export { lineStrips3D } from './src/shapes/lineStrips';
export { planes3D } from './src/shapes/planes';
export { points3D } from './src/shapes/points';
export { polygons3D } from './src/shapes/polygons';
export { triangles3D } from './src/shapes/triangles';

// Utilities.
export { sort } from './src/sort';
export { ccw } from './src/counter-clockwise';
export { centroid } from './src/centroid';
export { transform } from './src/transform';
export { orthographic } from './src/projection-orthographic';

// Shared types.
export * from './src/types';
export type { HasCentroid } from './src/sort';
export type { OrthographicOptions } from './src/projection-orthographic';

// The shape contract that every shape instance implements.
export type { ShapeInstance } from './src/shapes/shape';

// Shape result types - one per shape module under src/shapes.
export type { AxisEdge, AxisWall } from './src/shapes/axes';
export type { Cube, CubeFace, CubeFaceName } from './src/shapes/cubes';
export type { GridPlane } from './src/shapes/gridPlanes';
export type { IsoBox, IsoPlane } from './src/shapes/iso';
export type { Line } from './src/shapes/lines';
export type { LineStrip } from './src/shapes/lineStrips';
export type { Plane } from './src/shapes/planes';
export type { Point } from './src/shapes/points';
export type { Polygon } from './src/shapes/polygons';
export type { Triangle } from './src/shapes/triangles';

// Shape instance types - one per shape module under src/shapes.
export type { Axes3DInstance } from './src/shapes/axes';
export type { Cubes3DInstance } from './src/shapes/cubes';
export type { GridPlanes3DInstance } from './src/shapes/gridPlanes';
export type { Iso3DInstance } from './src/shapes/iso';
export type { Lines3DInstance } from './src/shapes/lines';
export type { LineStrips3DInstance } from './src/shapes/lineStrips';
export type { Planes3DInstance } from './src/shapes/planes';
export type { Points3DInstance } from './src/shapes/points';
export type { Polygons3DInstance } from './src/shapes/polygons';
export type { Triangles3DInstance } from './src/shapes/triangles';
