var tape = require('tape');
var d3   = require('../');

tape('points don\'t have draw function', function(test){
    var _3d = d3._3d();
    test.equal(_3d.draw(), undefined);
    test.end();
});
