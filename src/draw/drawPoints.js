export function drawPoints(d){
	return 'M' + d.projected.x + ',' + d.projected.y + 'm' + (-d.radius) + ',0a' + d.radius + ',' + d.radius + ',0,1,1,' + (d.radius*2) + ',0a' + d.radius + ',' + d.radius + ',0,1,1,-' + (d.radius*2) + ',0';
}
