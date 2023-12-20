/**
 * Comparator function to sort objects based on their centroid z-values.
 *
 * This function compares the z-values of the centroid property of two objects (a and b).
 * It returns a negative number if a should come before b, a positive number if a should come after b,
 * and 0 if a and b are considered equal in terms of sorting.
 *
 * @param {Object} a - The first object to compare.
 * @param {Object} b - The second object to compare.
 * @returns {number} - A negative, zero, or positive number indicating the sorting order.
 *
 * @example
 * // Sorting an array of objects based on centroid z-values
 * const sortedArray = unsortedArray.sort(sort);
 */
export function sort(a, b) {
    // Extract z-values from objects
    const pa = a.centroid.z;
    const pb = b.centroid.z;

    // Compare z-values for sorting
    return pa < pb ? -1 : pa > pb ? 1 : pa >= pb ? 0 : NaN;
}
