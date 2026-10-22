# Migrating from v0.x

v1.0 replaced calling a shape as a function with an explicit `.data()`
method, for better TypeScript support and clarity.

```diff
- const triangles = triangles3D().scale(100);
- const result = triangles(data);
+ const triangles = triangles3D().scale(100);
+ const result = triangles.data(data);

  svg.selectAll('path')
    .data(result)
    .join('path')
    .attr('d', triangles.draw);
```

1. ❌ Calling a shape directly, `triangles(data)`, no longer works.
2. ✅ Call `.data(data)` instead.
3. ✅ Shapes are generic over their datum, see [Your own data](./getting-started#your-own-data).
4. ✅ The computed properties, `centroid` and `ccw`, are included automatically.
