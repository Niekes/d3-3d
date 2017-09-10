# d3-3d
**d3-3d** is meant for 3d visualizations. **d3-3d** allows the projection of 3d data onto the screen in the webbrowser. It is specially designed to work with **[d3.js](https://d3js.org/)**. It adds 3d transformations to SVG.

<table>
    <tr>
        <td> <a target="_blank" href="https://bl.ocks.org/niekes/e920c03edd7950578b8a6cded8b5a1a5"> <img src="assets/surfaceplot.gif"> </a> </td>
        <td> <a target="_blank" href="https://bl.ocks.org/niekes/1c15016ae5b5f11508f92852057136b5"> <img src="assets/3d-scatterplot.gif"> </a> </td>
        <td> <a target="_blank" href="https://bl.ocks.org/niekes/613d43d39372f99ae2dcea14f0f90617"> <img src="assets/3d-barchart.gif"> </a> </td>
    </tr>
</table>

See more <a href="https://bl.ocks.org/niekes" target="_blank">examples</a>
## Installing

If you use npm, `npm install d3-3d`. You can also download the [latest release](https://github.com/Niekes/d3-3d/releases). Otherwise use [unpkg](https://unpkg.com/d3-3d/) to get the latest release. For example:

```html
<script src="https://unpkg.com/d3-3d/build/d3-3d.js"></script>
```

For a specific version:
```html
<script src="https://unpkg.com/d3-3d@version/build/d3-3d.js"></script>
```

For the minified version:

```html
<script src="https://unpkg.com/d3-3d@version/build/d3-3d.min.js"></script>
```

## API Reference

* [d3._3d]() - create a new 3d function object.
* [*_3d*.shape](#shape) - set the shape.
* [*_3d*.x]() - set the x accessor.
* [*_3d*.y]() - set the y accessor.
* [*_3d*.z]() - set the z accessor.
* [*_3d*.scale]() - set the z accessor.
* [*_3d*.rotateX]() - set the angle for the x rotation.
* [*_3d*.rotateY]() - set the angle for the y rotation.
* [*_3d*.rotateZ]() - set the angle for the z rotation.
* [*_3d*.sort]() - sort the 3d elements by the centroid.
* [*_3d*.draw]() - draw the 3d elements.

### Overview
**d3-3d** uses the [browser's coordinate system](https://www.w3.org/TR/css-transforms-1/#transform-rendering). It will calculate the centroid and the orientation of your polygons for you. Due to the fact that SVG isn't very 3d compatible **d3-3d** has also a special draw method.

### Shapes
* POINT
* LINE
* LINE_STRIP
* TRIANGLE
* PLANE
* GRID
* SURFACE
* CUBE

<a name="shape" href="#shape">#</a> _3d.<b>shape</b>(shape) [<>](https://github.com/Niekes/d3-3d/blob/master/src/3d.js#L81 "Source")

Sets the shape to *shape*. If *shape* is not specified the current shape will be returned.
```js
var triangles3D = d3._3d().shape('TRIANGLE');
```
