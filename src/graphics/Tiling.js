import { Complex } from '../math/Complex.js';
import { Hyperbolic } from '../math/Hyperbolic.js';

export class Tiling {
    constructor(p, q) {
        this.p = p;
        this.q = q;
        this.polygons = [];
    }

    generateFundamentalRegion() {
        // Calculate distance from center to vertex of the central p-gon
        // Formula for radius of circumcircle of {p,q} tiling:
        // R = sqrt( (cos(pi/q + pi/p) + cos(pi/q - pi/p)) / (cos(pi/q + pi/p) - cos(pi/q - pi/p)) ) ?
        // Actually, let's use the formula related to triangles.
        // Center O, Vertex V, Midpoint of edge M.
        // Angle VOM = pi/p
        // Angle OVM = pi/q
        // Angle OMV = pi/2
        // In hyperbolic geometry: cosh(c) = cot(A)cot(B) where c is hypotenuse.
        // No, standard formula:
        // cosh(r) = cos(pi/q) / sin(pi/p)
        // r is distance from center to vertex.
        // Then tanh(r/2) is the Euclidean distance in Poincare disk.

        const cosPiQ = Math.cos(Math.PI / this.q);
        const sinPiP = Math.sin(Math.PI / this.p);
        const coshR = cosPiQ / sinPiP;
        const r = Math.acosh(coshR);
        const euclideanR = Math.tanh(r / 2);

        const vertices = [];
        for (let i = 0; i < this.p; i++) {
            const theta = (2 * Math.PI * i) / this.p;
            vertices.push(new Complex(
                euclideanR * Math.cos(theta),
                euclideanR * Math.sin(theta)
            ));
        }
        return vertices;
    }

    generateTiling(depth) {
        const fundamental = this.generateFundamentalRegion();
        const tiles = [];
        const visited = new Set();
        const queue = [{ transform: Hyperbolic.identity(), depth: 0 }];

        // Stringify matrix for visited set
        const key = (m) => m.map(c => c.re.toFixed(3) + ',' + c.im.toFixed(3)).join('|');

        visited.add(key(Hyperbolic.identity()));

        // Generators: rotations around each vertex of the fundamental polygon
        // The fundamental polygon has vertices V0, V1, ... Vp-1.
        // Rotation around Vi by 2pi/q maps the polygon to a neighbor.
        // Actually, we need to be careful.
        // Let's just use the edge reflections or vertex rotations.
        // Rotation around vertex V:
        // Move V to origin, rotate by 2pi/q, move back.

        const generators = [];
        for (let i = 0; i < this.p; i++) {
            const v = fundamental[i];
            // T_v = translation(-v)
            // R = rotation(2pi/q)
            // T_inv = translation(v)
            // Op = T_inv * R * T_v

            const T_v = Hyperbolic.translation(new Complex(-v.re, -v.im));
            const R = Hyperbolic.rotation(2 * Math.PI / this.q);
            const T_inv = Hyperbolic.translation(v);

            const op = Hyperbolic.compose(T_inv, Hyperbolic.compose(R, T_v));
            generators.push(op);
        }

        while (queue.length > 0) {
            const { transform, depth: d } = queue.shift();

            // Apply transform to fundamental polygon
            const transformedVertices = fundamental.map(v => Hyperbolic.transform(v, transform));
            tiles.push(transformedVertices);

            if (d < depth) {
                for (const gen of generators) {
                    const nextTransform = Hyperbolic.compose(transform, gen);
                    const k = key(nextTransform);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push({ transform: nextTransform, depth: d + 1 });
                    }
                }
            }
        }
        return tiles;
    }
}
