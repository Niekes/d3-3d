import projections 	from './projections.js';
import {points} 	from './primitiveTypes/points.js';
import {lines} 		from './primitiveTypes/lines.js';

export default function() {

	var ortho 			= projections.ortho, // Orthographic projection
		persp 			= projections.persp, // Weak perspective projection
		projection 		= ortho,
		origin 			= [0, 0],
		scale 			= 1,
		distance 		= 1,
		alpha 			= 0, // Z
		beta  			= 0, // Y
		gamma 			= 0, // X
		primitiveType	= 'POINTS',
		primitiveTypes 	= {
			POINTS 			: points,
			LINES 			: lines,
			// LINES_LOOP 		: linesLoop,
			// LINES_STRIP 	: linesStrip,
			// TRIANGLES 		: triangles,
			// TRIANGLES_STRIP : trianglesStrip,
			// TRIANGLES_FAN	: trianglesFan
		};

	function _3d(data){
		return primitiveTypes[primitiveType](data, projection, alpha, beta, gamma, origin, scale, distance);
	}

	_3d.projection = function(_){
		return arguments.length ? (projection = _, _3d) : projection;
	};

	_3d.origin = function(_){
		return arguments.length ? (origin = _, _3d) : origin;
	};

	_3d.scale = function(_){
		return arguments.length ? (scale = _, _3d) : scale;
	};

	_3d.distance = function(_){
		return arguments.length ? (distance = _, _3d) : distance;
	};

	_3d.rotateZ = function(_){
		return arguments.length ? (alpha = _, _3d) : alpha;
	};

	_3d.rotateY = function(_){
		return arguments.length ? (beta = _, _3d) : beta;
	};

	_3d.rotateX = function(_){
		return arguments.length ? (gamma = _, _3d) : gamma;
	};

	_3d.primitiveType = function(_){
		return arguments.length ? (primitiveType = _, _3d) : primitiveType;
	};

	return _3d;
}
