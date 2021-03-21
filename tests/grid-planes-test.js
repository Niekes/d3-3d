var tape = require('tape');
var d3   = require('../');

tape('test if the number of planes per row are calculated correct when it\'s a quadratic grid', function(test){

    var j = 10, points = [];

    for(var z = -j; z < j; z++){
        for(var x = -j; x < j; x++){
            points.push({x: x, y: 1, z: z});
        }
    }

    var grid3d = d3._3d().shape('GRID', j*2).x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; })(points);
    var row    = Math.sqrt(points.length) - 1;
    test.equal(grid3d.length, row*row);
    test.end();
});

tape('test if the number of planes per row are calculated correct when it\'s not a quadratic grid', function(test){

    var points = [], pointsPerRow = 5;

    for (var z = 0; z < 3; z++) {
        for (var x = 0; x < 5; x++) {
            points.push({x: x, y: 1, z: z});
        }
    }
    var grid3d = d3._3d().shape('GRID', pointsPerRow).x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; })(points);

    test.equal(8, grid3d.length);

    test.end();
});
