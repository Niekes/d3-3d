var tape = require('tape');
var d3   = require('../');

tape('test if the number of planes per row are calculated correct', function(test){

    var j = 10, points = [];

    for(var z = -j; z < j; z++){
        for(var x = -j; x < j; x++){
            points.push({x: x, y: 1, z: z});
        }
    }

    var grid3d = d3._3d().shape('GRID').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; })(points);
    var row    = Math.sqrt(points.length) - 1;
    test.equal(grid3d.length, row*row);
    test.end();
});
