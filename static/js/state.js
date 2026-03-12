// ── Graph State ─────────────────────────────────────────────────────
var graphNodes = new Map();   // uid -> node obj
var graphLinks = [];          // {source, target, predicate}
var linkSet = new Set();
var selectedNode = null;
var hoveredNode = null;
var glowDepth = 5;
var viewMode = '3d'; // '2d' or '3d'
var useShapes = true;
var scaleByConns = true;
var focusMode = false;
var focusedNode = null;
var focusRanks = null;
var globalMouseX = 0, globalMouseY = 0;
window.addEventListener('mousemove', function(e) { globalMouseX = e.clientX; globalMouseY = e.clientY; });

// ── Colors ──────────────────────────────────────────────────────────
var PALETTE = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'];
var typeColorMap = {};
var colorIdx = 0;
function typeColor(t) {
  if (!typeColorMap[t]) typeColorMap[t] = PALETTE[colorIdx++ % PALETTE.length];
  return typeColorMap[t];
}

function hexToRgb(hex) { return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]; }

function adjustBrightness(hex, factor) {
  var c = hexToRgb(hex);
  return '#' + [c[0]*factor, c[1]*factor, c[2]*factor].map(function(v) { return Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2,'0'); }).join('');
}

function desaturate(hex, amount) {
  var c = hexToRgb(hex), gray = 0.3*c[0] + 0.59*c[1] + 0.11*c[2];
  return '#' + [c[0]+(gray-c[0])*amount, c[1]+(gray-c[1])*amount, c[2]+(gray-c[2])*amount].map(function(v) { return Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2,'0'); }).join('');
}

function nodeRadius(n) {
  if (!scaleByConns) return 4;
  var conns = graphLinks.filter(function(l) { var s = l.source.uid||l.source, t = l.target.uid||l.target; return s === n.uid || t === n.uid; }).length;
  return Math.max(2, Math.min(8, 2 + Math.log2(conns + 1) * 1.5));
}

// ── Helpers ─────────────────────────────────────────────────────────
function setStatus(msg) { document.getElementById('status').textContent = msg; }
function escHtml(s) { var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
