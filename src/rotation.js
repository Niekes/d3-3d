export function rotateRxRyRz(d, a, b, g){
	var cosa = Math.cos(a), sina = Math.sin(a);
	var cosb = Math.cos(b), sinb = Math.sin(b);
	var cosc = Math.cos(g), sinc = Math.sin(g);

	var a1 = cosa * cosb, a2 = cosa * sinb * sinc - sina * cosc, a3 = cosa * sinb * cosc + sina * sinc;
	var b1 = sina * cosb, b2 = sina * sinb * sinc + cosa * cosc, b3 = sina * sinb * cosc - cosa * sinc;
	var c1 = -sinb, c2 = cosb * sinc, c3 = cosb * cosc;

	return {
		x: a1 * d.x + a2 * -d.y + a3 * d.z,
		y: b1 * d.x + b2 * -d.y + b3 * d.z,
		z: c1 * d.x + c2 * -d.y + c3 * d.z
	};
}
