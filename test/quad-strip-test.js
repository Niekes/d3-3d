var tape = require('tape');
var d3   = require('../');

tape('draw function of \'quad_strip\' draws correctly', function(test){
    var _3d = d3._3d().primitiveType('QUAD_STRIP');
    var data = [
        [[-1,1,0],[-1,-1,0],[1,1,0],[1,-1,0],[2,1,0],[2,-1,0],[3,1,0],[3,-1,0]],
    ];
    test.deepEqual(_3d.draw(_3d(data)[0]), 'M3,1L3,-1M2,1L3,1M2,-1L3,-1M2,1L2,-1M1,1L2,1M1,-1L2,-1M1,1L1,-1M-1,1L1,1M-1,-1L1,-1M-1,-1L-1,1');
    test.end();
});
