import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Create a grid helper
const size = 10;
const divisions = 10;
const gridHelper = new THREE.GridHelper(size, divisions);
// scene.add(gridHelper);

// Create axes helper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Add some sample points to the scatter plot
const points = [
    new THREE.Vector3(2, 3, 1),
    new THREE.Vector3(-3, -1, 4),
    new THREE.Vector3(1, -2, -2),
    new THREE.Vector3(4, 2, -3),
    new THREE.Vector3(-2, 3, -1)
];

let pointsIncludedOnPolygon = [];

const geometry = new THREE.BufferGeometry().setFromPoints(points);
const colors = new Float32Array(points.length * 3);
const color = new THREE.Color();

for (let i = 0; i < points.length; i++) {
    color.setRGB(1, 0, 0); // Initial color red
    color.toArray(colors, i * 3);
}

geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// const material = new THREE.PointsMaterial({ color: 0xff0000, size: 0.2  });
const material = new THREE.PointsMaterial({ vertexColors: true, size: 0.2 });

const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

// const geometry = new THREE.BoxGeometry( 1, 1, 1 );
// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// const cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.minDistance = 0;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;

camera.position.z = 5;

// Lasso tool
const lassoCanvas = document.getElementById('lassoCanvas');
const lassoCtx = lassoCanvas.getContext('2d');
lassoCanvas.width = window.innerWidth;
lassoCanvas.height = window.innerHeight;
let isDrawing = false;
let lassoPoints = [];

// Mode control
let mode = 'orbit'; // Default mode

document.getElementById('orbitControlBtn').addEventListener('click', () => {
    mode = 'orbit';
    controls.enabled = true;
    lassoCanvas.style.pointerEvents = 'none'; // Disable lasso events
});

document.getElementById('lassoToolBtn').addEventListener('click', () => {
    mode = 'lasso';
    controls.enabled = false;
    lassoCanvas.style.pointerEvents = 'auto'; // Enable lasso events
});

lassoCanvas.addEventListener('mousedown', (e) => {
    if (mode !== 'lasso') return;
    isDrawing = true;
    lassoPoints = [{ x: e.clientX, y: e.clientY }];
    lassoCtx.clearRect(0, 0, lassoCanvas.width, lassoCanvas.height);
});

lassoCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    lassoPoints.push({ x: e.clientX, y: e.clientY });
    lassoCtx.clearRect(0, 0, lassoCanvas.width, lassoCanvas.height);
    lassoCtx.beginPath();
    lassoCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
        lassoCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    lassoCtx.strokeStyle = '#000';
    lassoCtx.stroke();
    lassoCtx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    lassoCtx.fill();
});

lassoCanvas.addEventListener('mouseup', () => {
    if (mode !== 'lasso') return;
    isDrawing = false;
    detectPointsInLasso();
    lassoCtx.clearRect(0, 0, lassoCanvas.width, lassoCanvas.height); // Clear lasso area
});

function isPointInPolygon(point, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) != (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

        if (intersect) isInside = !isInside;
    }
    return isInside;
}

function handleLassoSelectedPoints() {
    const drawer = document.getElementById('drawer');
    drawer.innerHTML = null;
    debugger
    if (pointsIncludedOnPolygon.length > 0) {
        pointsIncludedOnPolygon.forEach((selectedPoint, index) => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <p>Selected point #${index + 1}</p>
                <p>Coords x: ${selectedPoint.x} y: ${selectedPoint.y} z: ${selectedPoint.z}</p>
            `;

            // Append the card to the container
            drawer.appendChild(card);
        })
        drawer.style.display = 'flex';
        return;
    }
    drawer.style.display = 'none';
}

function detectPointsInLasso() {
    const lassoPolygon = lassoPoints.map(p => new THREE.Vector2(p.x, p.y));
    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);
    pointsIncludedOnPolygon = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const screenPos = toScreenPosition(point, camera);
        const colorIndex = i * 3;

        if (isPointInPolygon(screenPos, lassoPolygon)) {
            console.log('Point inside lasso:', point);
            colors[colorIndex] = 0; // Red
            colors[colorIndex + 1] = 0; // Green
            colors[colorIndex + 2] = 1; // Blue
            pointsIncludedOnPolygon.push(point);
        } else {
            colors[colorIndex] = 1; // Red
            colors[colorIndex + 1] = 0; // Green
            colors[colorIndex + 2] = 0; // Blue
        }
    }
    handleLassoSelectedPoints();
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;
}

function toScreenPosition(obj, camera) {
    const vector = new THREE.Vector3();
    const widthHalf = 0.5 * renderer.getContext().canvas.width;
    const heightHalf = 0.5 * renderer.getContext().canvas.height;

    vector.copy(obj);
    vector.project(camera);

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    return { x: vector.x, y: vector.y };
}

function animate() {
    // Update controls
    controls.update();
    renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    lassoCanvas.width = window.innerWidth;
    lassoCanvas.height = window.innerHeight;
});
