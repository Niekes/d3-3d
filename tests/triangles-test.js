import { test } from 'tape';
import * as d3 from '../index.js';
import { triangles3D } from '../index.js';

test('triangle draw', function (t) {
    var triangles = d3
        ._3d()
        .shape('TRIANGLE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    var data = [
        [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 }
        ]
    ];
    t.equal(triangles.draw(triangles(data)[0]), 'M0,0L0,1L1,0Z');
    t.end();
});

test('access triangle coords via array', function (t) {
    var triangles = d3._3d().shape('TRIANGLE');
    var data = [
        [
            [0, 0, 0],
            [0, 1, 0],
            [1, 0, 0]
        ]
    ];

    t.deepEqual(triangles(data)[0][0].rotated, { x: 0, y: 0, z: 0 });
    t.deepEqual(triangles(data)[0][1].rotated, { x: 0, y: 1, z: 0 });
    t.deepEqual(triangles(data)[0][2].rotated, { x: 1, y: 0, z: 0 });
    t.end();
});

test('access triangle coords via function', function (t) {
    var data = [
        [
            { x: 1, y: 2, z: 3 },
            { x: 4, y: 5, z: 6 },
            { x: 7, y: 8, z: 9 }
        ]
    ];
    var triangles = d3
        ._3d()
        .shape('TRIANGLE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    t.deepEqual(triangles(data)[0][0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(triangles(data)[0][1].rotated, { x: 4, y: 5, z: 6 });
    t.deepEqual(triangles(data)[0][2].rotated, { x: 7, y: 8, z: 9 });
    t.end();
});

test('triangles are a closed path', function (t) {
    var triangles = d3._3d().shape('TRIANGLE');
    var data = [
        [
            [0, 0, 0],
            [0, 1, 0],
            [1, 0, 0]
        ]
    ];
    var path = triangles.draw(triangles(data)[0]);
    var lastChar = path[path.length - 1];
    t.equal(lastChar, 'Z');
    t.end();
});

test('triangles are getting drawn counter-clockwise', function (t) {
    var triangles = d3
        ._3d()
        .shape('TRIANGLE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    var data1 = [
        [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }
        ],
        [
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 }
        ],
        [
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: -1, y: 0, z: 0 }
        ],
        [
            { x: -1, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }
        ],
        [
            { x: 0, y: 1, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 }
        ]
    ];

    t.equal(triangles(data1)[0].ccw, true);
    t.equal(triangles(data1)[1].ccw, true);
    t.equal(triangles(data1)[2].ccw, true);
    t.equal(triangles(data1)[3].ccw, false);
    t.equal(triangles(data1)[4].ccw, false);
    t.equal(triangles(data1)[5].ccw, false);
    t.end();
});

test("triangles' centroid calculation is correct", function (t) {
    var triangles = d3
        ._3d()
        .shape('TRIANGLE')
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .z(function (d) {
            return d.z;
        });
    var data = [
        [
            { x: 5, y: 0, z: 0 },
            { x: 6, y: 4, z: 0 },
            { x: 4, y: 5, z: 0 }
        ],
        [
            { x: 2, y: 1, z: 0 },
            { x: 2, y: 2, z: 0 },
            { x: 1, y: 1, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 2, z: 0 },
            { x: 2, y: 1, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 1 },
            { x: 1, y: 2, z: 1 },
            { x: 2, y: 1, z: 1 }
        ],
        [
            { x: 1, y: 0, z: 2 },
            { x: 1, y: 2, z: 2 },
            { x: 2, y: 1, z: 2 }
        ]
    ];
    t.deepEqual(triangles(data)[0].centroid, { x: 5, y: 3, z: 0 });
    t.deepEqual(triangles(data)[1].centroid, {
        x: 1.6666666666666667,
        y: 1.3333333333333333,
        z: 0
    });
    t.deepEqual(triangles(data)[2].centroid, { x: 1.3333333333333333, y: 1, z: 0 });
    t.end();
});

/**
 *  v1.0.0
 **/
test('triangles3D is exported correctly', (t) => {
    t.equal(typeof triangles3D, 'function');
    t.end();
});

test('triangles3D has expected defaults', (t) => {
    const triangles = triangles3D();

    t.deepEqual(triangles.origin(), [0, 0]);
    t.equal(triangles.scale(), 1);
    t.equal(triangles.rotateX(), 0);
    t.equal(triangles.rotateY(), 0);
    t.equal(triangles.rotateZ(), 0);
    t.deepEqual(triangles.rotateCenter(), [0, 0, 0]);
    t.equal(typeof triangles.draw, 'function');
    t.equal(typeof triangles.sort, 'function');
    t.equal(typeof triangles.x, 'function');
    t.equal(typeof triangles.y, 'function');
    t.equal(typeof triangles.z, 'function');
    t.end();
});

test('triangle draw', (t) => {
    const data = [
        [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 }
        ]
    ];

    const triangles = triangles3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    t.equal(triangles.draw(triangles(data)[0]), 'M0,0L0,1L1,0Z');
    t.end();
});

test('access triangle coords via array', (t) => {
    const triangles = triangles3D();
    const data = [
        [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ]
    ];

    t.deepEqual(triangles(data)[0][0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(triangles(data)[0][1].rotated, { x: 4, y: 5, z: 6 });
    t.deepEqual(triangles(data)[0][2].rotated, { x: 7, y: 8, z: 9 });
    t.end();
});

test('access triangle coords via function', (t) => {
    const data = [
        [
            { x: 1, y: 2, z: 3 },
            { x: 4, y: 5, z: 6 },
            { x: 7, y: 8, z: 9 }
        ]
    ];

    const triangles = triangles3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    t.deepEqual(triangles(data)[0][0].rotated, { x: 1, y: 2, z: 3 });
    t.deepEqual(triangles(data)[0][1].rotated, { x: 4, y: 5, z: 6 });
    t.deepEqual(triangles(data)[0][2].rotated, { x: 7, y: 8, z: 9 });
    t.end();
});

test('triangles are a closed path', function (t) {
    const triangles = triangles3D();

    const data = [
        [
            [0, 0, 0],
            [0, 1, 0],
            [1, 0, 0]
        ]
    ];

    const path = triangles.draw(triangles(data)[0]);
    const lastChar = path[path.length - 1];

    t.equal(lastChar, 'Z');
    t.end();
});

test('triangles are getting drawn counter-clockwise', (t) => {
    const triangles = triangles3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    const data1 = [
        [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }
        ],
        [
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 }
        ],
        [
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: -1, y: 0, z: 0 }
        ],
        [
            { x: -1, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }
        ],
        [
            { x: 0, y: 1, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 }
        ]
    ];

    t.equal(triangles(data1)[0].ccw, true);
    t.equal(triangles(data1)[1].ccw, true);
    t.equal(triangles(data1)[2].ccw, true);
    t.equal(triangles(data1)[3].ccw, false);
    t.equal(triangles(data1)[4].ccw, false);
    t.equal(triangles(data1)[5].ccw, false);
    t.end();
});

test("triangles' centroid calculation is correct", (t) => {
    const triangles = triangles3D()
        .x((d) => d.x)
        .y((d) => d.y)
        .z((d) => d.z);

    const data = [
        [
            { x: 5, y: 0, z: 0 },
            { x: 6, y: 4, z: 0 },
            { x: 4, y: 5, z: 0 }
        ],
        [
            { x: 2, y: 1, z: 0 },
            { x: 2, y: 2, z: 0 },
            { x: 1, y: 1, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 2, z: 0 },
            { x: 2, y: 1, z: 0 }
        ],
        [
            { x: 1, y: 0, z: 1 },
            { x: 1, y: 2, z: 1 },
            { x: 2, y: 1, z: 1 }
        ],
        [
            { x: 1, y: 0, z: 2 },
            { x: 1, y: 2, z: 2 },
            { x: 2, y: 1, z: 2 }
        ]
    ];

    t.deepEqual(triangles(data)[0].centroid, { x: 5, y: 3, z: 0 });
    t.deepEqual(triangles(data)[1].centroid, {
        x: 1.6666666666666667,
        y: 1.3333333333333333,
        z: 0
    });
    t.deepEqual(triangles(data)[2].centroid, { x: 1.3333333333333333, y: 1, z: 0 });
    t.end();
});

test('set scale', (t) => {
    const triangles1 = triangles3D();
    const triangles2 = triangles3D().scale(2);
    const triangles3 = triangles3D().scale(3);
    const triangles4 = triangles3D().scale(4);

    t.equal(triangles1.scale(), 1);
    t.equal(triangles2.scale(), 2);
    t.equal(triangles3.scale(), 3);
    t.equal(triangles4.scale(), 4);
    t.end();
});
