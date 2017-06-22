var tape = require('tape');
var d3   = require('../');

tape('draw function of \'triangle_strip\' draws correctly', function(test){
    var _3d = d3._3d().primitiveType('TRIANGLE_STRIP');
    var data = [
        [[0,1,0],[0,0,0],[1,1,0],[1.5,0,0]],
        [[0,10,0],[0,0,0],[10,10,0],[15,0,0]],
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M1.5,0L1,-1L0,0ZM1,-1L0,0L0,-1Z');
    test.deepEqual(_3d.draw(_3d(data)[1]), 'M15,0L10,-10L0,0ZM10,-10L0,0L0,-10Z');
    test.end();
});

