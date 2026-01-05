export interface HasCentroid {
    centroid: {
        z: number;
    };
}

export function sort<T extends HasCentroid>(a: T, b: T): number {
    const pa = a.centroid.z;
    const pb = b.centroid.z;

    if (pa < pb) {
        return -1;
    }

    if (pa > pb) {
        return 1;
    }

    return 0;
}
