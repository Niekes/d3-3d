import shape from 'd3-shape';

export function drawLines(d){
	return shape.line()([
		[ d[0].projected.x, d[0].projected.y ],
		[ d[1].projected.x, d[1].projected.y ],
	]);
}
