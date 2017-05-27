import projections 		from './projections.js';
import {rotateRxRyRz} 	from './rotation.js';
import {POINTS}		 	from './primitiveTypes.js';

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
			POINTS: function(data){
				for (var i = data.length - 1; i >= 0; i--) {
					var p  		= data[i];
					p.rotated 	= rotateRxRyRz({x : p.x, y : p.y, z : p.z}, alpha, beta, gamma);
					p.projected = project(p.rotated);
				}
				return data;
			},
			LINES: function(){},
			LINES_LOOP: function(){},
			LINES_STRIP: function(){},
			TRIANGLES: function(){},
			TRIANGLES_STRIP: function(){},
			TRIANGLES_FAN: function(){}
		};

	function _3d(data){
		return primitiveTypes[primitiveType](data);
	}

	function project(d){
		if(projection === projections.ortho){
			return {
				x: origin[0] + scale * d.x,
				y: origin[1] + scale * d.y
			};
		}

		if(projection === projections.persp){
			return {
				x: origin[0] + scale * d.x / (d.z + distance),
				y: origin[1] + scale * d.y / (d.z + distance)
			};
		}
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
