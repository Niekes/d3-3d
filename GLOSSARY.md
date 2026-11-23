# d3-3d

A library that projects 3D shapes onto a 2D screen for d3. These are the words for the solids a chart builds out of points.

## Language

**Box**:
A solid with eight corners in the order `cubes3D` expects: front top left, front bottom left, front bottom right, front top right, then the same four at the back. Its front is the side at +z.
_Avoid_: Cuboid, block

**Sector**:
A slice of a ring between two angles, standing upright on a point and rising to a height, built from steps.
_Avoid_: Arc, slice, pie piece

**Step**:
One of the equal parts of a sector, a box bent around the ring's axis: its front is the outer wall, its back the inner wall.
_Avoid_: Segment (except as the name of the count of steps)

**Wedge**:
A sector whose inner radius is 0, so the inner wall of every step has no area.
_Avoid_: Pie slice
