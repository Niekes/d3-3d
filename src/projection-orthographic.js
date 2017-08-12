export function orthographic(d, options){
    return {
        x: options.origin[0] + options.scale * d.x,
        y: options.origin[1] + options.scale * d.y
    };
}
