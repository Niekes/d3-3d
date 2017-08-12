export function perspective(d, options){
    return {
        x: options.origin[0] + options.scale * d.x / (d.z + options.perspective),
        y: options.origin[1] + options.scale * d.y / (d.z + options.perspective)
    };
}
