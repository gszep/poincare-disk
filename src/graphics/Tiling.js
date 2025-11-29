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
        // Formula for circumradius R of {p,q} tiling:
        // cosh(R) = cot(pi/p) * cot(pi/q)

        const cotPiP = 1.0 / Math.tan(Math.PI / this.p);
        const cotPiQ = 1.0 / Math.tan(Math.PI / this.q);
        const coshR = cotPiP * cotPiQ;
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

        // Generators: Rotations by 180 degrees (pi) around the midpoint of each edge.
        // This maps the polygon to its neighbor across that edge.

        const generators = [];
        for (let i = 0; i < this.p; i++) {
            const u = fundamental[i];
            const v = fundamental[(i + 1) % this.p];

            // Midpoint M of edge uv.
            // Since u and v are on a circle centered at origin (euclideanR),
            // the geodesic connecting them is NOT a straight line, but the midpoint 
            // in hyperbolic metric lies on the bisector of angle uOv.
            // The angle of M is (theta_u + theta_v) / 2.
            // We need the hyperbolic distance to M.
            // Right triangle O M V (O=center, M=midpoint, V=vertex).
            // Angle OMV = pi/2. Angle MOV = pi/p. Hypotenuse OV = R.
            // We want OM = a.
            // tanh(a) = tanh(R) * cos(pi/p) ? No.
            // cosh(R) = cosh(a) * cosh(MV).
            // Also sin(pi/p) = sinh(MV) / sinh(R).
            // tan(pi/p) = tanh(MV) / sinh(a).
            // Let's use the dual law again or just standard right triangle formulas.
            // cosh(a) = cosh(R) / cosh(MV) ? No.
            // cosh(c) = cot(A)cot(B).
            // Here for triangle OMV:
            // Angle at V is pi/q.
            // cosh(OM) = cos(pi/q) / sin(pi/p) ? No, that was R.
            // Wait, in triangle OMV:
            // Angle O = pi/p. Angle V = pi/q. Angle M = pi/2.
            // Side OV = R. Side OM = h. Side MV = w.
            // cos(V) = cosh(h) * sin(O) ? No.
            // cosh(h) = cos(pi/q) / sin(pi/p) is WRONG.
            // cos(pi/q) = cosh(h) * sin(pi/p) -> cosh(h) = cos(pi/q) / sin(pi/p).
            // WAIT.
            // cos(A) = cosh(a) sin(B).
            // cos(pi/q) = cosh(OM) * sin(pi/p) ? No.
            // Let's check the formula for R again.
            // cosh(R) = cot(pi/p) cot(pi/q).
            // cosh(OM) = cos(pi/q) / sin(pi/p).
            // Let's check if cosh(R) > cosh(OM).
            // cot(p)cot(q) vs cos(q)/sin(p).
            // cos(p)/sin(p) * cos(q)/sin(q) vs cos(q)/sin(p).
            // cos(p)/sin(q) vs 1.
            // If p=7, q=3. pi/7, pi/3.
            // cos(pi/7) ~= 0.9. sin(pi/3) ~= 0.866.
            // So cosh(R) is roughly 1.
            // cosh(OM) = 0.5 / 0.43 = 1.16.
            // cosh(R) = 2.07 * 0.57 = 1.19.
            // So R > OM. Correct.

            const cosPiQ = Math.cos(Math.PI / this.q);
            const sinPiP = Math.sin(Math.PI / this.p);
            const coshOM = cosPiQ / sinPiP;
            const distOM = Math.acosh(coshOM);
            const euclideanOM = Math.tanh(distOM / 2);

            const thetaU = (2 * Math.PI * i) / this.p;
            const thetaV = (2 * Math.PI * ((i + 1) % this.p)) / this.p;
            const thetaM = (thetaU + thetaV) / 2; // Careful with wrap around?
            // Actually just i + 0.5
            const theta = (2 * Math.PI * (i + 0.5)) / this.p;

            const M = new Complex(
                euclideanOM * Math.cos(theta),
                euclideanOM * Math.sin(theta)
            );

            // Generator is rotation by 180 (pi) around M.
            // To rotate around M by pi:
            // T_M^-1 * Rot(pi) * T_M
            // T_M = translation(-M) ? No, translation(M) maps 0 to M.
            // So we want to map M to 0, rotate, map 0 to M.
            // T_inv = translation(-M) maps M to 0.
            // Rot = rotation(pi) = [-i, 0; 0, i] (since e^i*pi/2 = i) -> actually e^i*pi = -1.
            // Rotation by pi matrix: [i, 0; 0, -i] (angle pi, half angle pi/2).
            // T = translation(M).

            const T_M_inv = Hyperbolic.translation(new Complex(-M.re, -M.im));
            const Rot = Hyperbolic.rotation(Math.PI);
            const T_M = Hyperbolic.translation(M);

            const op = Hyperbolic.compose(T_M, Hyperbolic.compose(Rot, T_M_inv));
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
