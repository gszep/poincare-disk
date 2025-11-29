import { Complex } from '../math/Complex.js';

export class Renderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.center = new Complex(width / 2, height / 2);
        this.radius = Math.min(width, height) * 0.45;
    }

    // Convert Poincare disk point to screen coordinates
    toScreen(z) {
        return new Complex(
            this.center.re + z.re * this.radius,
            this.center.im - z.im * this.radius // Flip Y for canvas
        );
    }

    // Convert screen coordinates to Poincare disk point
    fromScreen(x, y) {
        return new Complex(
            (x - this.center.re) / this.radius,
            -(y - this.center.im) / this.radius // Flip Y back
        );
    }

    drawPolygon(vertices, color) {
        if (vertices.length === 0) return;

        this.ctx.beginPath();
        const start = this.toScreen(vertices[0]);
        this.ctx.moveTo(start.re, start.im);

        for (let i = 0; i < vertices.length; i++) {
            const u = vertices[i];
            const v = vertices[(i + 1) % vertices.length];
            this.drawGeodesic(u, v);
        }

        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawGeodesic(u, v) {
        // Draw arc from u to v
        // Formula for center and radius of the circle orthogonal to unit disk passing through u and v.
        // Let u, v be complex numbers.
        // If u and v are collinear with origin, it's a straight line.

        const threshold = 1e-6;
        const det = u.re * v.im - u.im * v.re;

        // Check if collinear with origin (approx)
        // Actually, we need to check if they lie on a diameter.
        // But general geodesic is a circle.

        // Circle through u, v, and orthogonal to unit circle.
        // Inversion of u in unit circle is u' = 1/conj(u).
        // The circle passes through u, v, u'.

        // If u is close to origin, 1/conj(u) is huge.
        // Let's use the formula:
        // Center C is intersection of perpendicular bisector of uv and perpendicular bisector of u u'.
        // Actually, simpler:
        // The circle center C satisfies |C-u|^2 = |C|^2 - 1 (orthogonality condition? No, R^2 = |C|^2 - 1)
        // And |C-u| = R.

        // Let's use a geometric construction helper or formula.
        // D = 2(u1 v2 - u2 v1)
        // ... this is complicated to implement from scratch without a library.

        // Alternative: Bezier approximation or simple subdivision.
        // Subdivision is robust.
        this.subdivideGeodesic(u, v, 0);
    }

    subdivideGeodesic(u, v, depth) {
        const d = u.sub(v).abs();
        if (depth > 5 || d < 0.01) { // Screen space distance check would be better but this is in unit disk
            const screenV = this.toScreen(v);
            this.ctx.lineTo(screenV.re, screenV.im);
            return;
        }

        // Midpoint in hyperbolic metric
        // m = (u + v) / (1 + u*conj(v)) ? No, that's for adding vectors.
        // Midpoint M satisfies d(u, M) = d(M, v) = d(u, v)/2.
        // We can map u to origin, find midpoint of (0, v'), then map back.

        // Map u to origin: T(z) = (z - u) / (1 - conj(u)z)
        // v' = T(v)
        // Midpoint of 0 and v' is just v' * (tanh(dist/2) / tanh(dist)) ...
        // Actually, midpoint of segment 0 to z in Poincare disk is z / (1 + sqrt(1 - |z|^2)).
        // Wait, simpler: Euclidean midpoint of 0 and v' is NOT hyperbolic midpoint.
        // Hyperbolic midpoint of 0 and r is r / (1 + sqrt(1-r^2)).

        const t_num = v.sub(u);
        const t_den = new Complex(1, 0).sub(u.conj().mul(v));
        const v_prime = t_num.div(t_den);

        const r = v_prime.abs();
        const mid_r = r / (1 + Math.sqrt(1 - r * r));
        const mid_prime = v_prime.mul(mid_r / r);

        // Map back: T^-1(z) = (z + u) / (1 + conj(u)z)
        const num = mid_prime.add(u);
        const den = new Complex(1, 0).add(u.conj().mul(mid_prime));
        const mid = num.div(den);

        this.subdivideGeodesic(u, mid, depth + 1);
        this.subdivideGeodesic(mid, v, depth + 1);
    }
}
