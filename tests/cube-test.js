var tape = require('tape');
var d3   = require('../');

tape('cube naming is correct', function(test){

    var cubes = d3._3d().shape('CUBE').x(function(d){ return d.x; }).y(function(d){ return d.y; }).z(function(d){ return d.z; });

    var data = [
        [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 0},
            {x: 1, y: 1, z: 0},
            {x: 1, y: 0, z: 0},
            {x: 0, y: 0, z: 1},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 1, z: 1},
            {x: 1, y: 0, z: 1},
        ]
    ];

    test.equal(cubes(data)[0].faces[0].face, 'front');
    test.equal(cubes(data)[0].faces[1].face, 'back');
    test.equal(cubes(data)[0].faces[2].face, 'left');
    test.equal(cubes(data)[0].faces[3].face, 'right');
    test.equal(cubes(data)[0].faces[4].face, 'top');
    test.equal(cubes(data)[0].faces[5].face, 'bottom');
    test.end();
});
