import projections from './projections.js';

export function project(d, projection, origin, scale, distance){
    // @todo already pass corret projection fn
    if(projection === projections.ortho){
        return {
            x: origin[0] + scale *  d.x,
            y: origin[1] + scale * -d.y
        };
    }

    if(projection === projections.persp){
        return {
            x: origin[0] + scale * d.x / (d.z + distance),
            y: origin[1] + scale * d.y / (d.z + distance)
        };
    }
}
