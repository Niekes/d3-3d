export function project(d, origin, scale){
    return {
        x: origin[0] + scale * d.x,
        y: origin[1] + scale * d.y
    };
}
