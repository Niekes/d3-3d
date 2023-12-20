export const drawTriangle = (triangle) => {
    return `M${triangle[0].projected.x},${triangle[0].projected.y}L${triangle[1].projected.x},${triangle[1].projected.y}L${triangle[2].projected.x},${triangle[2].projected.y}Z`;
};
