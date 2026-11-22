export interface HasCentroid {
    centroid: {
        z: number;
    };
}

export function sort<T extends HasCentroid>(a: T, b: T): number {
    // An empty shape has a NaN centroid; NaN compares equal to everything and breaks the order.
    const pa = Number.isNaN(a.centroid.z) ? -Infinity : a.centroid.z;
    const pb = Number.isNaN(b.centroid.z) ? -Infinity : b.centroid.z;

    if (pa < pb) {
        return -1;
    }

    if (pa > pb) {
        return 1;
    }

    return 0;
}
