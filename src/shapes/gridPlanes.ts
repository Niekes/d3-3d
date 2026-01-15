import { TransformedPoint, Point3D } from '../types';
import { drawPlane } from '../draw/drawPlane';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';

export type GridPlane<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
    plane: string;
};

interface GridPlanes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    rows(): number;
    rows(rows: number): this;

    data(data: Datum[]): GridPlane<Datum>[];
    draw(gridPlanes: TransformedPoint<Datum>[]): string;
}

class GridPlanes3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements GridPlanes3DInstance<Datum>
{
    private _rows: number = 1;

    rows(): number;
    rows(rows: number): this;
    rows(rows?: number): this | number {
        return rows ? ((this._rows = rows), this) : this._rows;
    }

    data(data: Datum[]): GridPlane<Datum>[] {
        const numPts = this._rows;
        const transformedPoints = transform(data, {
            origin: this.origin(),
            rotateCenter: this.rotationCenter(),
            rotateX: this.rotateX(),
            rotateY: this.rotateY(),
            rotateZ: this.rotateZ(),
            scale: this.scale(),
            x: this.x(),
            y: this.y(),
            z: this.z()
        });

        const numRows = transformedPoints.length / numPts;
        const faces: GridPlane<Datum>[] = [];
        let counter = 0;

        for (let row = numRows - 1; row > 0; row -= 1) {
            for (let col = numPts - 1; col > 0; col -= 1) {
                const p1 = col + row * numPts;
                const p4 = p1 - 1;
                const p2 = p4 - numPts + 1;
                const p3 = p2 - 1;

                const face = [
                    transformedPoints[p1],
                    transformedPoints[p2],
                    transformedPoints[p3],
                    transformedPoints[p4]
                ] as GridPlane<Datum>;

                face.plane = `plane-${counter}`;
                face.ccw = ccw(face);
                face.centroid = centroid(face);

                faces.push(face);
                counter += 1;
            }
        }

        return faces;
    }

    draw(gridPlanes: TransformedPoint<Datum>[]): string {
        return drawPlane(gridPlanes);
    }
}

export function gridPlanes3D<Datum = Point3D>(): GridPlanes3DInstance<Datum> {
    return new GridPlanes3DRenderer<Datum>();
}
