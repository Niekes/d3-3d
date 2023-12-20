import { test } from 'tape';
import { generator3D } from '../src/generator.js';

test('generator3D is a function and has the correct properties', (t) => {
    t.plan(12);

    t.equal(typeof generator3D === 'function', true);
    t.equal(typeof generator3D().scale === 'function', true);
    t.equal(typeof generator3D().origin === 'function', true);
    t.equal(typeof generator3D().rotateX === 'function', true);
    t.equal(typeof generator3D().rotateY === 'function', true);
    t.equal(typeof generator3D().rotateZ === 'function', true);
    t.equal(typeof generator3D().rotationCenter === 'function', true);
    t.equal(typeof generator3D().x === 'function', true);
    t.equal(typeof generator3D().y === 'function', true);
    t.equal(typeof generator3D().z === 'function', true);
    t.equal(typeof generator3D().sort === 'function', true);
    t.equal(generator3D().draw, undefined);

    t.end();
});
