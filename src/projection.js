export function project(d, options){
    return {
        x: options.origin[0] + options.scale *  d.x,
        y: options.origin[1] + options.scale * -d.y
    };

    // if(projection === projections.persp){
    //     return {
    //         x: origin[0] + scale *  d.x / (d.z + distance),
    //         y: origin[1] + scale * -d.y / (d.z + distance)
    //     };
    // }
}
