import { Complex } from './Complex.js';

export class Hyperbolic {
    // Möbius transformation: f(z) = (az + b) / (cz + d)
    // Represented as matrix [a, b; c, d] (complex numbers)

    static identity() {
        return [
            new Complex(1, 0), new Complex(0, 0),
            new Complex(0, 0), new Complex(1, 0)
        ];
    }

    static transform(z, m) {
        // (az + b) / (cz + d)
        const num = m[0].mul(z).add(m[1]);
        const den = m[2].mul(z).add(m[3]);
        return num.div(den);
    }

    static compose(m1, m2) {
        // Matrix multiplication
        // [a1 b1] [a2 b2] = [a1a2+b1c2 a1b2+b1d2]
        // [c1 d1] [c2 d2]   [c1a2+d1c2 c1b2+d1d2]
        return [
            m1[0].mul(m2[0]).add(m1[1].mul(m2[2])),
            m1[0].mul(m2[1]).add(m1[1].mul(m2[3])),
            m1[2].mul(m2[0]).add(m1[3].mul(m2[2])),
            m1[2].mul(m2[1]).add(m1[3].mul(m2[3]))
        ];
    }

    // Translation that moves origin to p
    // f(z) = (z + p) / (1 + conj(p)z)
    // Matrix: [1, p; conj(p), 1]
    // Note: This maps 0 -> p.
    static translation(p) {
        return [
            new Complex(1, 0), p,
            p.conj(), new Complex(1, 0)
        ];
    }

    // Rotation by theta
    // f(z) = e^(i*theta) * z
    // Matrix: [e^(i*theta/2), 0; 0, e^(-i*theta/2)]
    static rotation(theta) {
        const halfTheta = theta / 2;
        const rot = new Complex(Math.cos(halfTheta), Math.sin(halfTheta));
        const invRot = new Complex(Math.cos(-halfTheta), Math.sin(-halfTheta));
        return [
            rot, new Complex(0, 0),
            new Complex(0, 0), invRot
        ];
    }

    static inverse(m) {
        // Inverse of [a b; c d] is [d -b; -c a] / (ad - bc)
        // For SU(1,1) matrices, det is 1.
        return [
            m[3], new Complex(-m[1].re, -m[1].im),
            new Complex(-m[2].re, -m[2].im), m[0]
        ];
    }
}
