export function drawTriangle(d){
	return 'M' + d[0].projected.x + ',' + d[0].projected.y + 'L' + d[1].projected.x + ',' + d[1].projected.y + 'L' + d[2].projected.x + ',' + d[2].projected.y + 'Z';
}
