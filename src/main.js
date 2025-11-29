import { Renderer } from './graphics/Renderer.js';
import { Tiling } from './graphics/Tiling.js';
import { Complex } from './math/Complex.js';
import { Hyperbolic } from './math/Hyperbolic.js';
import './style.css';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let viewTransform = Hyperbolic.identity();
let isDragging = false;
let lastMousePos = null;
let dragButton = null; // 0 for left, 2 for right

const renderer = new Renderer(ctx, window.innerWidth, window.innerHeight);
const tiling = new Tiling(7, 3);
// Generate tiles once for now. 
// In a real app, we might want to generate dynamically based on view.
const tiles = tiling.generateTiling(3);

let zoomLevel = 1.0;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    renderer.width = width;
    renderer.height = height;
    renderer.center = new Complex(width / 2, height / 2);
    renderer.radius = Math.min(width, height) * 0.45 * zoomLevel;
    render();
}

function render() {
    // Clear screen
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, width, height);

    // Draw Poincare disk boundary
    const radius = renderer.radius;
    const center = renderer.center;

    ctx.beginPath();
    ctx.arc(center.re, center.im, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Render tiling
    // Apply viewTransform to all tiles
    for (const tile of tiles) {
        const transformedTile = tile.map(v => Hyperbolic.transform(v, viewTransform));
        renderer.drawPolygon(transformedTile, 'rgba(100, 200, 255, 0.2)');
    }

    // Render data points
    ctx.fillStyle = '#ffc444ff';
    for (const point of dataPoints) {
        const transformedPoint = Hyperbolic.transform(point, viewTransform);
        // Only draw if inside the disk (approx)
        if (transformedPoint.absSq() < 1.0) {
            const screenPos = renderer.toScreen(transformedPoint);
            ctx.beginPath();
            // Use a fixed small size for markers, maybe slightly scaled by zoom but not linearly
            // If zoom is 50, 3*50 = 150px is too big.
            // Let's use fixed screen size.
            ctx.arc(screenPos.re, screenPos.im, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    dragButton = e.button;
    lastMousePos = renderer.fromScreen(e.clientX, e.clientY);
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    lastMousePos = null;
});

window.addEventListener('mousemove', e => {
    if (!isDragging || !lastMousePos) return;

    const currentMousePos = renderer.fromScreen(e.clientX, e.clientY);

    // Check if mouse is outside the disk
    if (currentMousePos.abs() >= 1.0 || lastMousePos.abs() >= 1.0) {
        lastMousePos = currentMousePos;
        return;
    }

    if (dragButton === 0) {
        // Translation
        // We want T such that T(last) = current
        // T = T_current * T_last^-1
        // T_a(z) = (z + a) / (1 + conj(a)z) maps 0 to a.
        // Wait, the standard translation T_a maps 0 to a.
        // So we want to map last to 0, then 0 to current.

        // Move last to origin: T1(z) = (z - last) / (1 - conj(last)z)
        // Move origin to current: T2(z) = (z + current) / (1 + conj(current)z)

        const T1 = Hyperbolic.translation(new Complex(-lastMousePos.re, -lastMousePos.im));
        const T2 = Hyperbolic.translation(currentMousePos);
        const T = Hyperbolic.compose(T2, T1);

        // Update view: newView = T * oldView
        viewTransform = Hyperbolic.compose(T, viewTransform);

    } else if (dragButton === 2) {
        // Rotation
        const ang1 = lastMousePos.arg();
        const ang2 = currentMousePos.arg();
        const delta = ang2 - ang1;

        const R = Hyperbolic.rotation(delta);
        viewTransform = Hyperbolic.compose(R, viewTransform);
    }

    // We update lastMousePos to currentMousePos?
    // If we update viewTransform, the point under mouse *should* be currentMousePos.
    // But for the next frame, we want to drag from the new position?
    // Actually, if we update viewTransform, the world moves.
    // The mouse is at currentMousePos (screen).
    // The point in the world that WAS at lastMousePos is NOW at currentMousePos.
    // So for the next step, we are dragging from currentMousePos.
    // Yes.

    lastMousePos = currentMousePos;
    render();
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.001 * zoomLevel;
    zoomLevel -= e.deltaY * zoomSpeed;
    zoomLevel = Math.max(0.1, Math.min(zoomLevel, 50.0));

    // Update radius
    renderer.radius = Math.min(width, height) * 0.45 * zoomLevel;
    render();
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// Load data
let dataPoints = [];
fetch('/src/data/example.csv')
    .then(response => response.text())
    .then(text => {
        const lines = text.trim().split('\n');
        dataPoints = lines.map(line => {
            const [x, y] = line.split(',').map(Number);
            return new Complex(x, y);
        });
        render();
    });

window.addEventListener('resize', resize);
resize();
