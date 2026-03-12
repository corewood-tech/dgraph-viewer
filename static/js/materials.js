// ── Three.js Scene Objects ───────────────────────────────────────────
var scene, camera, renderer, raycaster, mouse;
var nodeGroup, linkMesh;
var gizmoScene, gizmoCamera, gizmoRenderer;
var draggedNode = null, dragPlane, dragOffset;
var activeNode = null;
var nodeMeshes = new Map();
var linkLabelSprites = [];
var nodeLabels = new Map();
var linkPositionAttr, linkColorAttr;

// Platonic solids + sphere, assigned per type
var GEOMETRIES = [
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.OctahedronGeometry(1, 0),
  new THREE.DodecahedronGeometry(1, 0),
  new THREE.TetrahedronGeometry(1, 0),
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.SphereGeometry(1, 16, 12),
  new THREE.IcosahedronGeometry(1, 1),
  new THREE.OctahedronGeometry(1, 1),
];

var typeGeoMap = {};
var geoIdx = 0;
function typeGeometry(t) {
  if (!typeGeoMap[t]) typeGeoMap[t] = GEOMETRIES[geoIdx++ % GEOMETRIES.length];
  return typeGeoMap[t];
}

var materialCache = new Map();

function getMaterial(hex, emissiveHex) {
  var key = hex + '|' + (emissiveHex || '');
  if (!materialCache.has(key)) {
    var opts = {color: hex, fog: true, roughness: 0.45, metalness: 0.3, flatShading: true};
    if (emissiveHex) { opts.emissive = emissiveHex; opts.emissiveIntensity = 0.3; }
    materialCache.set(key, new THREE.MeshStandardMaterial(opts));
  }
  return materialCache.get(key);
}

// ── Simulation ──────────────────────────────────────────────────────
var simulation;
