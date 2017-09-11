# d3-3d
**d3-3d** is meant for 3d visualizations. **d3-3d** allows the projection of 3d data onto the screen in the webbrowser. It is specially designed to work with **[d3.js](https://d3js.org/)**.

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

* [d3._3d](#_3d) - create a new 3d function object.
* [*_3d*.shape](#shape) - set the shape.
* [*_3d*.x](#x) - set the x accessor.
* [*_3d*.y](#y) - set the y accessor.
* [*_3d*.z](#z) - set the z accessor.
* [*_3d*.scale](#scale) - set the z accessor.
* [*_3d*.rotateX](#rotateX) - set the angle for the x rotation.
* [*_3d*.rotateY](#rotateY) - set the angle for the y rotation.
* [*_3d*.rotateZ](#rotateZ) - set the angle for the z rotation.
* [*_3d*.sort](#sort) - sort the 3d elements by the centroid.
* [*_3d*.draw](#draw) - draw the 3d elements.

### Overview
**d3-3d** uses the [browser's coordinate system](https://www.w3.org/TR/css-transforms-1/#transform-rendering). It will calculate the centroid for all elements and the orientation for your polygons. Due to the fact that SVG isn't very 3d compatible **d3-3d** adds 3d transformations to SVG.

With **d3-3d** you can easily visualize your 3d data.
```js
var data3D = [ [[0,-1,0],[-1,1,0],[1,1,0]] ];

var triangles3D = d3._3d()
    .scale(100)
    .origin([480, 250])
    .shape('TRIANGLE');

var projectedData = triangles3D(data3D);

init(projectedData);

function init(data){

    var triangles = svg.selectAll('path').data(data);

    // add your logic here...

}
```
<a name="_3d" href="#_3d">#</a> d3.<b>_3d</b>() [<>](https://github.com/Niekes/d3-3d/blob/master/src/3d.js#L58 "Source")

Constructs a new function object with the default settings.


<!-- The function will take care for you how the elements get drawn. For instance, if you choose `'TRIANGLE'` **d3-3d** aspects that you want to draw a triangle with three points and each point has three coordinates. The [*_3d*.draw](#draw) method will draw a triangle with these three points. If you want to draw a plane, you have to pass in four points and so on. -->

### Shapes
Depending on the shape you choose, the function object you get back will be constructed differently.
* POINT no draw method
* LINE no draw method
* LINE_STRIP
* TRIANGLE
* PLANE
* GRID Special because you have
* SURFACE
* CUBE

<a name="shape" href="#shape">#</a> _3d.<b>shape</b>(shape) [<>](https://github.com/Niekes/d3-3d/blob/master/src/3d.js#L81 "Source")

_Default:_ `'POINT'`

Sets the shape to *shape*. If *shape* is not specified the current shape will be returned.
```js
var triangles3D = d3._3d().shape('TRIANGLE');
```

<a name="x" href="#x">#</a> _3d.<b>x</b>([x]) [<>](https://github.com/Niekes/d3-3d/blob/master/src/point.js#L1 "Source")

If *x* is specified, sets the x accessor to the specified function or number and returns the **d3-3d** function object. If x is not specified, returns the current x accessor, which defaults to:

```js
function x(p) {
    return p[0];
}
```
This function will be invoked for each point in the input data array.

<a name="y" href="#y">#</a> _3d.<b>y</b>([y]) [<>](https://github.com/Niekes/d3-3d/blob/master/src/point.js#L5 "Source")

If *y* is specified, sets the y accessor to the specified function or number and returns the **d3-3d** function object. If y is not specified, returns the current y accessor, which defaults to:

```js
function y(p) {
    return p[1];
}
```
This function will be invoked for each point in the input data array.

<a name="z" href="#z">#</a> _3d.<b>z</b>([z]) [<>](https://github.com/Niekes/d3-3d/blob/master/src/point.js#L9 "Source")

If *z* is specified, sets the z accessor to the specified function or number and returns the **d3-3d** function object. If z is not specified, returns the current z accessor, which defaults to:

```js
function z(p) {
    return p[2];
}
```
This function will be invoked for each point in the input data array.

