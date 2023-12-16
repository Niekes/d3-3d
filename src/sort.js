export function sort(a, b) {
    const pa = a.centroid.z;
    const pb = b.centroid.z;

    return pa < pb ? -1 : pa > pb ? 1 : pa >= pb ? 0 : NaN;
}
