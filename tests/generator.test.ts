import { describe, test, expect } from 'vitest';
import { generator3D } from '../src/generator';

describe('generator3D', () => {
    test('is a function', () => {
        expect(generator3D).toBeTypeOf('function');
    });

    test('has the correct properties', () => {
        const gen = generator3D((data) => data);

        expect(gen.scale).toBeTypeOf('function');
        expect(gen.origin).toBeTypeOf('function');
        expect(gen.rotateX).toBeTypeOf('function');
        expect(gen.rotateY).toBeTypeOf('function');
        expect(gen.rotateZ).toBeTypeOf('function');
        expect(gen.rotationCenter).toBeTypeOf('function');
        expect(gen.x).toBeTypeOf('function');
        expect(gen.y).toBeTypeOf('function');
        expect(gen.z).toBeTypeOf('function');
        expect(gen.sort).toBeTypeOf('function');
        expect(gen.draw).toBeUndefined();
    });
});
