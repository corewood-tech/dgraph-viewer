package main

const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dgraph Viewer</title>
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'SF Mono', 'Fira Code', monospace; background: #0d1117; color: #c9d1d9; overflow: hidden; }
#app { display: flex; height: 100vh; }
#sidebar {
  width: 360px; min-width: 300px; background: #161b22; border-right: 1px solid #30363d;
  display: flex; flex-direction: column; z-index: 10;
}
#sidebar-header { padding: 16px; border-bottom: 1px solid #30363d; }
#sidebar-header h1 { font-size: 14px; color: #58a6ff; margin-bottom: 8px; }
#query-area { display: flex; flex-direction: column; gap: 8px; }
#dgraph-addr {
  width: 100%; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d;
  border-radius: 6px; padding: 8px 10px; font-family: inherit; font-size: 12px;
}
#dgraph-addr:focus { outline: none; border-color: #58a6ff; }
.addr-row { display: flex; gap: 6px; align-items: center; }
.addr-row label { font-size: 11px; color: #484f58; white-space: nowrap; }
.addr-row input { flex: 1; }
#query-input {
  width: 100%; height: 120px; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d;
  border-radius: 6px; padding: 10px; font-family: inherit; font-size: 12px; resize: vertical;
}
#query-input:focus { outline: none; border-color: #58a6ff; }
#query-input::placeholder { color: #484f58; }
.btn-row { display: flex; gap: 6px; }
.btn {
  flex: 1; padding: 8px 12px; border: 1px solid #30363d; border-radius: 6px;
  background: #21262d; color: #c9d1d9; font-family: inherit; font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.btn:hover { background: #30363d; border-color: #58a6ff; }
.btn-primary { background: #238636; border-color: #238636; color: #fff; }
.btn-primary:hover { background: #2ea043; }
#status { padding: 8px 16px; font-size: 11px; color: #484f58; border-bottom: 1px solid #30363d; }
.toggle-row { display: flex; align-items: center; gap: 8px; justify-content: center; }
.toggle-label { font-size: 12px; color: #484f58; font-weight: 600; transition: color 0.2s; }
.toggle-label.active { color: #58a6ff; }
.toggle-switch {
  width: 40px; height: 22px; background: #30363d; border-radius: 11px; cursor: pointer;
  position: relative; transition: background 0.2s;
}
.toggle-knob {
  width: 18px; height: 18px; background: #c9d1d9; border-radius: 50%;
  position: absolute; top: 2px; transition: left 0.2s;
}
.toggle-knob.active-3d { left: 20px; }
.toggle-knob.active-2d { left: 2px; }
#node-info { flex: 1; overflow-y: auto; padding: 16px; font-size: 12px; }
#node-info h3 { color: #58a6ff; margin-bottom: 8px; font-size: 13px; }
.prop-row { display: flex; padding: 4px 0; border-bottom: 1px solid #1c2128; }
.prop-key { color: #7ee787; min-width: 100px; margin-right: 8px; }
.prop-val { color: #c9d1d9; word-break: break-all; }
.edge-link { color: #58a6ff; cursor: pointer; text-decoration: underline; }
.edge-link:hover { color: #79c0ff; }
#graph-container { flex: 1; position: relative; overflow: hidden; }
#graph-container canvas { display: block; }
#legend {
  position: absolute; bottom: 16px; right: 16px; background: #161b22ee;
  border: 1px solid #30363d; border-radius: 6px; padding: 12px; font-size: 11px;
  max-height: 200px; overflow-y: auto; z-index: 5;
}
#legend div { display: flex; align-items: center; gap: 6px; margin: 2px 0; }
#legend .swatch { width: 10px; height: 10px; border-radius: 50%; }
#controls-hint {
  position: absolute; bottom: 16px; left: 16px; background: #161b22cc;
  border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; font-size: 10px;
  color: #484f58; z-index: 5; line-height: 1.6;
}
#orientation-gizmo {
  position: absolute; top: 12px; right: 12px; width: 120px; height: 120px;
  z-index: 5; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, #161b2288 0%, transparent 70%);
}
/* 2D SVG styles */
#graph-container svg { width: 100%; height: 100%; display: block; }
.node .node-shape { cursor: pointer; stroke: none; }
.node text { font-size: 10px; fill: #8b949e; pointer-events: none; user-select: none; opacity: 0; }
.link { stroke-opacity: 0.4; fill: none; stroke-width: 1.5px; }
.link-label { font-size: 8px; fill: #484f58; pointer-events: none; user-select: none; }
.node.glow-0 .node-shape { filter: drop-shadow(0 0 8px rgba(88,166,255,0.9)) brightness(1.6); }
.node.glow-0 text { opacity: 1; fill: #fff; }
.node.glow-1 .node-shape { filter: drop-shadow(0 0 6px rgba(88,166,255,0.7)) brightness(1.4); }
.node.glow-1 text { opacity: 0.9; }
.node.glow-2 .node-shape { filter: drop-shadow(0 0 4px rgba(88,166,255,0.5)) brightness(1.25); }
.node.glow-2 text { opacity: 0.7; }
.node.glow-3 .node-shape { filter: drop-shadow(0 0 2px rgba(88,166,255,0.3)) brightness(1.1); }
.node.glow-3 text { opacity: 0.5; }
.node.glow-4 .node-shape { filter: brightness(1.0); }
.node.glow-4 text { opacity: 0.35; }
.node.dimmed .node-shape { opacity: 0.12; }
.node.dimmed text { opacity: 0.08; }
.link.dimmed { stroke-opacity: 0.03; stroke-width: 0.5px !important; }
.link.glow { filter: drop-shadow(0 0 4px rgba(88,166,255,0.7)); stroke-opacity: 0.9; }
.node.active .node-shape {
  filter: drop-shadow(0 0 10px rgba(88,166,255,0.95)) drop-shadow(0 0 20px rgba(88,166,255,0.5)) brightness(1.8);
  animation: throb2d 0.8s ease-in-out infinite alternate;
}
.node.active text { opacity: 1 !important; fill: #fff; }
@keyframes throb2d {
  0% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(88,166,255,0.9)) brightness(1.6); }
  100% { transform: scale(1.25); filter: drop-shadow(0 0 16px rgba(88,166,255,1)) brightness(2.0); }
}
</style>
</head>
<body>
<div id="app">
  <div id="sidebar">
    <div id="sidebar-header">
      <h1>DGRAPH VIEWER</h1>
      <div id="query-area">
        <div class="addr-row">
          <label>Dgraph</label>
          <input id="dgraph-addr" type="text" value="" placeholder="http://localhost:28080" />
        </div>
        <textarea id="query-input" placeholder="Enter DQL query... e.g.&#10;{&#10;  all(func: has(dgraph.type), first: 50) {&#10;    uid&#10;    expand(_all_) {&#10;      uid&#10;      expand(_all_)&#10;    }&#10;  }&#10;}" spellcheck="false"></textarea>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="runQuery()">Run Query</button>
          <button class="btn" onclick="runAll()">All</button>
          <button class="btn" onclick="clearGraph()">Clear</button>
          <button class="btn" onclick="resetView()">Reset</button>
          <button class="btn" onclick="loadSchema()">Schema</button>
        </div>
        <div class="addr-row">
          <label>Depth</label>
          <input id="glow-depth" type="number" min="1" max="20" value="5" style="width:50px; background:#0d1117; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; padding:6px 8px; font-family:inherit; font-size:12px; text-align:center;" />
        </div>
        <div class="toggle-row">
          <span class="toggle-label" id="toggle-label-2d">2D</span>
          <div class="toggle-switch" id="mode-toggle" onclick="switchMode()">
            <div class="toggle-knob active-3d"></div>
          </div>
          <span class="toggle-label active" id="toggle-label-3d">3D</span>
        </div>
      </div>
    </div>
    <div id="status">Ready</div>
    <div id="node-info">
      <p style="color:#484f58">Click a node to inspect. Double-click to expand edges.</p>
    </div>
  </div>
  <div id="graph-container">
    <div id="legend"></div>
    <div id="orientation-gizmo"></div>
    <div id="controls-hint">
      Left-drag: orbit &middot; Right-drag: zoom &middot; Scroll: zoom<br>
      Middle-drag: tilt &middot; Ctrl+left-drag: free-look<br>
      Shift+drag node: move &middot; Click: select &middot; Dbl-click: expand
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════════════════
     Force3D: d3-octree + d3-force-3d bundled as IIFE
     Adapted from https://github.com/vasturiano/d3-octree
     and https://github.com/vasturiano/d3-force-3d (MIT license)
     ════════════════════════════════════════════════════════════════════ -->
<script>
(function(global, d3) {
"use strict";

// ── Octree ──────────────────────────────────────────────────────────
function Octant(node, x0, y0, z0, x1, y1, z1) {
  this.node = node; this.x0 = x0; this.y0 = y0; this.z0 = z0;
  this.x1 = x1; this.y1 = y1; this.z1 = z1;
}

function defaultX(d) { return d[0]; }
function defaultY(d) { return d[1]; }
function defaultZ(d) { return d[2]; }

function Octree(x, y, z, x0, y0, z0, x1, y1, z1) {
  this._x = x; this._y = y; this._z = z;
  this._x0 = x0; this._y0 = y0; this._z0 = z0;
  this._x1 = x1; this._y1 = y1; this._z1 = z1;
  this._root = undefined;
}

function octree(nodes, x, y, z) {
  var tree = new Octree(
    x == null ? defaultX : x,
    y == null ? defaultY : y,
    z == null ? defaultZ : z,
    NaN, NaN, NaN, NaN, NaN, NaN
  );
  return nodes == null ? tree : tree.addAll(nodes);
}

function leafCopy(leaf) {
  var copy = {data: leaf.data}, next = copy;
  while (leaf = leaf.next) next = next.next = {data: leaf.data};
  return copy;
}

var tp = octree.prototype = Octree.prototype;

tp.copy = function() {
  var copy = new Octree(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1),
      node = this._root, nodes, child;
  if (!node) return copy;
  if (!node.length) return copy._root = leafCopy(node), copy;
  nodes = [{source: node, target: copy._root = new Array(8)}];
  while (node = nodes.pop()) {
    for (var i = 0; i < 8; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(8)});
        else node.target[i] = leafCopy(child);
      }
    }
  }
  return copy;
};

tp.add = function(d) {
  var x = +this._x.call(null, d), y = +this._y.call(null, d), z = +this._z.call(null, d);
  return octreeAdd(this.cover(x, y, z), x, y, z, d);
};

function octreeAdd(tree, x, y, z, d) {
  if (isNaN(x) || isNaN(y) || isNaN(z)) return tree;
  var parent, node = tree._root, leaf = {data: d},
      x0 = tree._x0, y0 = tree._y0, z0 = tree._z0,
      x1 = tree._x1, y1 = tree._y1, z1 = tree._z1,
      xm, ym, zm, xp, yp, zp, right, bottom, deep, i, j;
  if (!node) return tree._root = leaf, tree;
  while (node.length) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
    if (parent = node, !(node = node[i = deep << 2 | bottom << 1 | right])) return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  zp = +tree._z.call(null, node.data);
  if (x === xp && y === yp && z === zp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(8) : tree._root = new Array(8);
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
  } while ((i = deep << 2 | bottom << 1 | right) === (j = (zp >= zm) << 2 | (yp >= ym) << 1 | (xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}

tp.addAll = function(data) {
  if (!Array.isArray(data)) data = Array.from(data);
  var n = data.length, xz = new Float64Array(n), yz = new Float64Array(n), zz = new Float64Array(n);
  var x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (var i = 0, d, x, y, z; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) continue;
    xz[i] = x; yz[i] = y; zz[i] = z;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (x0 > x1 || y0 > y1 || z0 > z1) return this;
  this.cover(x0, y0, z0).cover(x1, y1, z1);
  for (var i = 0; i < n; ++i) octreeAdd(this, xz[i], yz[i], zz[i], data[i]);
  return this;
};

tp.cover = function(x, y, z) {
  if (isNaN(x = +x) || isNaN(y = +y) || isNaN(z = +z)) return this;
  var x0 = this._x0, y0 = this._y0, z0 = this._z0, x1 = this._x1, y1 = this._y1, z1 = this._z1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1; y1 = (y0 = Math.floor(y)) + 1; z1 = (z0 = Math.floor(z)) + 1;
  } else {
    var t = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x || x >= x1 || y0 > y || y >= y1 || z0 > z || z >= z1) {
      i = (z < z0) << 2 | (y < y0) << 1 | (x < x0);
      parent = new Array(8); parent[i] = node; node = parent; t *= 2;
      switch (i) {
        case 0: x1=x0+t; y1=y0+t; z1=z0+t; break; case 1: x0=x1-t; y1=y0+t; z1=z0+t; break;
        case 2: x1=x0+t; y0=y1-t; z1=z0+t; break; case 3: x0=x1-t; y0=y1-t; z1=z0+t; break;
        case 4: x1=x0+t; y1=y0+t; z0=z1-t; break; case 5: x0=x1-t; y1=y0+t; z0=z1-t; break;
        case 6: x1=x0+t; y0=y1-t; z0=z1-t; break; case 7: x0=x1-t; y0=y1-t; z0=z1-t; break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  this._x0=x0; this._y0=y0; this._z0=z0; this._x1=x1; this._y1=y1; this._z1=z1;
  return this;
};

tp.data = function() { var data = []; this.visit(function(node) { if (!node.length) do data.push(node.data); while (node = node.next) }); return data; };
tp.extent = function(_) { return arguments.length ? this.cover(+_[0][0],+_[0][1],+_[0][2]).cover(+_[1][0],+_[1][1],+_[1][2]) : isNaN(this._x0) ? undefined : [[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]; };
tp.root = function() { return this._root; };
tp.size = function() { var s = 0; this.visit(function(n) { if (!n.length) do ++s; while (n = n.next) }); return s; };

tp.visit = function(callback) {
  var octs = [], q, node = this._root, child, x0, y0, z0, x1, y1, z1;
  if (node) octs.push(new Octant(node, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1) && node.length) {
      var xm = (x0+x1)/2, ym = (y0+y1)/2, zm = (z0+z1)/2;
      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
    }
  }
  return this;
};

tp.visitAfter = function(callback) {
  var octs = [], next = [], q;
  if (this._root) octs.push(new Octant(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0=q.x0, y0=q.y0, z0=q.z0, x1=q.x1, y1=q.y1, z1=q.z1, xm=(x0+x1)/2, ym=(y0+y1)/2, zm=(z0+z1)/2;
      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
    }
    next.push(q);
  }
  while (q = next.pop()) callback(q.node, q.x0, q.y0, q.z0, q.x1, q.y1, q.z1);
  return this;
};

tp.find = function(x, y, z, radius) {
  var data, x0 = this._x0, y0 = this._y0, z0 = this._z0, x3 = this._x1, y3 = this._y1, z3 = this._z1,
      x1, y1, z1, x2, y2, z2, octs = [], node = this._root, q, i;
  if (node) octs.push(new Octant(node, x0, y0, z0, x3, y3, z3));
  if (radius == null) radius = Infinity;
  else { x0 = x-radius; y0 = y-radius; z0 = z-radius; x3 = x+radius; y3 = y+radius; z3 = z+radius; radius *= radius; }
  while (q = octs.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (z1 = q.z0) > z3 || (x2 = q.x1) < x0 || (y2 = q.y1) < y0 || (z2 = q.z1) < z0) continue;
    if (node.length) {
      var xm = (x1+x2)/2, ym = (y1+y2)/2, zm = (z1+z2)/2;
      octs.push(new Octant(node[7],xm,ym,zm,x2,y2,z2), new Octant(node[6],x1,ym,zm,xm,y2,z2),
        new Octant(node[5],xm,y1,zm,x2,ym,z2), new Octant(node[4],x1,y1,zm,xm,ym,z2),
        new Octant(node[3],xm,ym,z1,x2,y2,zm), new Octant(node[2],x1,ym,z1,xm,y2,zm),
        new Octant(node[1],xm,y1,z1,x2,ym,zm), new Octant(node[0],x1,y1,z1,xm,ym,zm));
      if (i = (z >= zm) << 2 | (y >= ym) << 1 | (x >= xm)) {
        q = octs[octs.length-1]; octs[octs.length-1] = octs[octs.length-1-i]; octs[octs.length-1-i] = q;
      }
    } else {
      var dx = x - +this._x.call(null, node.data), dy = y - +this._y.call(null, node.data), dz = z - +this._z.call(null, node.data), d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < radius) { var dd = Math.sqrt(radius = d2); x0=x-dd; y0=y-dd; z0=z-dd; x3=x+dd; y3=y+dd; z3=z+dd; data = node.data; }
    }
  }
  return data;
};

tp.remove = function(d) {
  var x = +this._x.call(null, d), y = +this._y.call(null, d), z = +this._z.call(null, d);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return this;
  var parent, node = this._root, retainer, previous, next,
      x0 = this._x0, y0 = this._y0, z0 = this._z0, x1 = this._x1, y1 = this._y1, z1 = this._z1,
      xm, ym, zm, right, bottom, deep, i, j;
  if (!node) return this;
  if (node.length) while (true) {
    if (right = x >= (xm = (x0+x1)/2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0+y1)/2)) y0 = ym; else y1 = ym;
    if (deep = z >= (zm = (z0+z1)/2)) z0 = zm; else z1 = zm;
    if (!(parent = node, node = node[i = deep << 2 | bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[(i+1)&7] || parent[(i+2)&7] || parent[(i+3)&7] || parent[(i+4)&7] || parent[(i+5)&7] || parent[(i+6)&7] || parent[(i+7)&7]) retainer = parent, j = i;
  }
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  if (previous) return (next ? previous.next = next : delete previous.next), this;
  if (!parent) return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0]||parent[1]||parent[2]||parent[3]||parent[4]||parent[5]||parent[6]||parent[7])
      && node === (parent[7]||parent[6]||parent[5]||parent[4]||parent[3]||parent[2]||parent[1]||parent[0])
      && !node.length) {
    if (retainer) retainer[j] = node; else this._root = node;
  }
  return this;
};

tp.removeAll = function(data) { for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]); return this; };

tp.x = function(_) { return arguments.length ? (this._x = _, this) : this._x; };
tp.y = function(_) { return arguments.length ? (this._y = _, this) : this._y; };
tp.z = function(_) { return arguments.length ? (this._z = _, this) : this._z; };

// ── Force3D helpers ─────────────────────────────────────────────────
function constant(x) { return function() { return x; }; }
function jiggle(random) { return (random() - 0.5) * 1e-6; }
function lcg() { var s = 1; return function() { return (s = (1664525 * s + 1013904223) % 4294967296) / 4294967296; }; }
function nodeX(d) { return d.x; }
function nodeY(d) { return d.y; }
function nodeZ(d) { return d.z; }

var nDim = 3; // always 3D

// ── forceCenter ─────────────────────────────────────────────────────
function forceCenter(x, y, z) {
  var nodes, strength = 1;
  if (x == null) x = 0; if (y == null) y = 0; if (z == null) z = 0;
  function force() {
    var i, n = nodes.length, node, sx = 0, sy = 0, sz = 0;
    for (i = 0; i < n; ++i) { node = nodes[i]; sx += node.x||0; sy += node.y||0; sz += node.z||0; }
    for (sx = (sx/n - x)*strength, sy = (sy/n - y)*strength, sz = (sz/n - z)*strength, i = 0; i < n; ++i) {
      node = nodes[i]; if (sx) node.x -= sx; if (sy) node.y -= sy; if (sz) node.z -= sz;
    }
  }
  force.initialize = function(_) { nodes = _; };
  force.x = function(_) { return arguments.length ? (x = +_, force) : x; };
  force.y = function(_) { return arguments.length ? (y = +_, force) : y; };
  force.z = function(_) { return arguments.length ? (z = +_, force) : z; };
  force.strength = function(_) { return arguments.length ? (strength = +_, force) : strength; };
  return force;
}

// ── forceCollide ────────────────────────────────────────────────────
function forceCollide(radius) {
  var nodes, radii, random, strength = 1, iterations = 1;
  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);
  function force() {
    var i, n = nodes.length, tree, node, xi, yi, zi, ri, ri2;
    for (var k = 0; k < iterations; ++k) {
      tree = octree(nodes, function(d){return d.x+d.vx}, function(d){return d.y+d.vy}, function(d){return d.z+d.vz}).visitAfter(prepare);
      for (i = 0; i < n; ++i) {
        node = nodes[i]; ri = radii[node.index]; ri2 = ri * ri;
        xi = node.x + node.vx; yi = node.y + node.vy; zi = node.z + node.vz;
        tree.visit(apply);
      }
    }
    function apply(treeNode, x0, y0, z0, x1, y1, z1) {
      var data = treeNode.data, rj = treeNode.r, r = ri + rj;
      if (data) {
        if (data.index > node.index) {
          var x = xi - data.x - data.vx, y = yi - data.y - data.vy, z = zi - data.z - data.vz,
              l = x*x + y*y + z*z;
          if (l < r * r) {
            if (x === 0) x = jiggle(random), l += x*x;
            if (y === 0) y = jiggle(random), l += y*y;
            if (z === 0) z = jiggle(random), l += z*z;
            l = (r - (l = Math.sqrt(l))) / l * strength;
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
            node.vy += (y *= l) * r;
            node.vz += (z *= l) * r;
            data.vx -= x * (r = 1 - r);
            data.vy -= y * r;
            data.vz -= z * r;
          }
        }
        return;
      }
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r || z0 > zi + r || z1 < zi - r;
    }
  }
  function prepare(treeNode) {
    if (treeNode.data) return treeNode.r = radii[treeNode.data.index];
    for (var i = treeNode.r = 0; i < 8; ++i) if (treeNode[i] && treeNode[i].r > treeNode.r) treeNode.r = treeNode[i].r;
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length; radii = new Array(n);
    for (i = 0; i < n; ++i) radii[nodes[i].index] = +radius(nodes[i], i, nodes);
  }
  force.initialize = function(_nodes, _random) { nodes = _nodes; random = (typeof _random === 'function' ? _random : Math.random); initialize(); };
  force.iterations = function(_) { return arguments.length ? (iterations = +_, force) : iterations; };
  force.strength = function(_) { return arguments.length ? (strength = +_, force) : strength; };
  force.radius = function(_) { return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius; };
  return force;
}

// ── forceLink ───────────────────────────────────────────────────────
function forceLink(links) {
  var id = function(d) { return d.index; }, strength = defaultLinkStrength, strengths, distance = constant(30),
      distances, nodes, count, bias, random, iterations = 1;
  if (links == null) links = [];
  function defaultLinkStrength(link) { return 1 / Math.min(count[link.source.index], count[link.target.index]); }
  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x, y, z, l, b; i < n; ++i) {
        link = links[i]; source = link.source; target = link.target;
        x = target.x + target.vx - source.x - source.vx || jiggle(random);
        y = target.y + target.vy - source.y - source.vy || jiggle(random);
        z = target.z + target.vz - source.z - source.vz || jiggle(random);
        l = Math.sqrt(x*x + y*y + z*z);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x *= l; y *= l; z *= l;
        target.vx -= x * (b = bias[i]); target.vy -= y * b; target.vz -= z * b;
        source.vx += x * (b = 1-b); source.vy += y * b; source.vz += z * b;
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, m = links.length,
        nodeById = new Map(nodes.map(function(d, i) { return [id(d, i, nodes), d]; })), link;
    for (i = 0, count = new Array(n); i < m; ++i) {
      link = links[i]; link.index = i;
      if (typeof link.source !== "object") link.source = nodeById.get(link.source);
      if (typeof link.target !== "object") link.target = nodeById.get(link.target);
      count[link.source.index] = (count[link.source.index]||0) + 1;
      count[link.target.index] = (count[link.target.index]||0) + 1;
    }
    for (i = 0, bias = new Array(m); i < m; ++i) {
      link = links[i]; bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }
    strengths = new Array(m); initializeStrength();
    distances = new Array(m); initializeDistance();
  }
  function initializeStrength() { if (!nodes) return; for (var i = 0, n = links.length; i < n; ++i) strengths[i] = +strength(links[i], i, links); }
  function initializeDistance() { if (!nodes) return; for (var i = 0, n = links.length; i < n; ++i) distances[i] = +distance(links[i], i, links); }
  force.initialize = function(_nodes, _random) { nodes = _nodes; random = (typeof _random === 'function' ? _random : Math.random); initialize(); };
  force.links = function(_) { return arguments.length ? (links = _, initialize(), force) : links; };
  force.id = function(_) { return arguments.length ? (id = _, force) : id; };
  force.iterations = function(_) { return arguments.length ? (iterations = +_, force) : iterations; };
  force.strength = function(_) { return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength; };
  force.distance = function(_) { return arguments.length ? (distance = typeof _ === "function" ? _ : constant(+_), initializeDistance(), force) : distance; };
  return force;
}

// ── forceManyBody ───────────────────────────────────────────────────
function forceManyBody() {
  var nodes, node, random, alpha, strength = constant(-30), strengths,
      distanceMin2 = 1, distanceMax2 = Infinity, theta2 = 0.81;
  function force(_) {
    var i, n = nodes.length,
        tree = octree(nodes, nodeX, nodeY, nodeZ).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }
  function initialize() {
    if (!nodes) return; var i, n = nodes.length, nd;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) nd = nodes[i], strengths[nd.index] = +strength(nd, i, nodes);
  }
  function accumulate(treeNode) {
    var str = 0, q, c, weight = 0, x, y, z, i, numChildren = treeNode.length;
    if (numChildren) {
      for (x = y = z = i = 0; i < numChildren; ++i) {
        if ((q = treeNode[i]) && (c = Math.abs(q.value))) {
          str += q.value; weight += c; x += c*(q.x||0); y += c*(q.y||0); z += c*(q.z||0);
        }
      }
      str *= Math.sqrt(4 / numChildren);
      treeNode.x = x / weight; treeNode.y = y / weight; treeNode.z = z / weight;
    } else {
      q = treeNode; q.x = q.data.x; q.y = q.data.y; q.z = q.data.z;
      do str += strengths[q.data.index]; while (q = q.next);
    }
    treeNode.value = str;
  }
  function apply(treeNode, x1, y1, z1, x2, y2, z2) {
    if (!treeNode.value) return true;
    var x = treeNode.x - node.x, y = treeNode.y - node.y, z = treeNode.z - node.z,
        w = x2 - x1, l = x*x + y*y + z*z;
    if (w*w / theta2 < l) {
      if (l < distanceMax2) {
        if (x === 0) x = jiggle(random), l += x*x;
        if (y === 0) y = jiggle(random), l += y*y;
        if (z === 0) z = jiggle(random), l += z*z;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x * treeNode.value * alpha / l;
        node.vy += y * treeNode.value * alpha / l;
        node.vz += z * treeNode.value * alpha / l;
      }
      return true;
    }
    if (treeNode.length || l >= distanceMax2) return;
    if (treeNode.data !== node || treeNode.next) {
      if (x === 0) x = jiggle(random), l += x*x;
      if (y === 0) y = jiggle(random), l += y*y;
      if (z === 0) z = jiggle(random), l += z*z;
      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
    }
    do if (treeNode.data !== node) {
      w = strengths[treeNode.data.index] * alpha / l;
      node.vx += x * w; node.vy += y * w; node.vz += z * w;
    } while (treeNode = treeNode.next);
  }
  force.initialize = function(_nodes, _random) { nodes = _nodes; random = (typeof _random === 'function' ? _random : Math.random); initialize(); };
  force.strength = function(_) { return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength; };
  force.distanceMin = function(_) { return arguments.length ? (distanceMin2 = _*_, force) : Math.sqrt(distanceMin2); };
  force.distanceMax = function(_) { return arguments.length ? (distanceMax2 = _*_, force) : Math.sqrt(distanceMax2); };
  force.theta = function(_) { return arguments.length ? (theta2 = _*_, force) : Math.sqrt(theta2); };
  return force;
}

// ── forceX / forceY / forceZ ────────────────────────────────────────
function forceAxis(prop) {
  return function(target) {
    var str = constant(0.1), nodes, strengths, targets;
    if (typeof target !== "function") target = constant(target == null ? 0 : +target);
    function force(alpha) {
      for (var i = 0, n = nodes.length, node; i < n; ++i) {
        node = nodes[i]; node['v'+prop] += (targets[i] - node[prop]) * strengths[i] * alpha;
      }
    }
    function initialize() {
      if (!nodes) return; var i, n = nodes.length;
      strengths = new Array(n); targets = new Array(n);
      for (i = 0; i < n; ++i) {
        strengths[i] = isNaN(targets[i] = +target(nodes[i], i, nodes)) ? 0 : +str(nodes[i], i, nodes);
      }
    }
    force.initialize = function(_) { nodes = _; initialize(); };
    force.strength = function(_) { return arguments.length ? (str = typeof _ === "function" ? _ : constant(+_), initialize(), force) : str; };
    force[prop] = function(_) { return arguments.length ? (target = typeof _ === "function" ? _ : constant(+_), initialize(), force) : target; };
    return force;
  };
}

// ── forceSimulation ─────────────────────────────────────────────────
var initialRadius = 10, initialAngleRoll = Math.PI * (3 - Math.sqrt(5)), initialAngleYaw = Math.PI * 20 / (9 + Math.sqrt(221));

function forceSimulation(nodes) {
  var simulation, alpha = 1, alphaMin = 0.001, alphaDecay = 1 - Math.pow(alphaMin, 1/300),
      alphaTarget = 0, velocityDecay = 0.6, forces = new Map(),
      stepper = d3.timer(step), event = d3.dispatch("tick", "end"), random = lcg();
  if (nodes == null) nodes = [];

  function step() { tick(); event.call("tick", simulation); if (alpha < alphaMin) { stepper.stop(); event.call("end", simulation); } }

  function tick(iterations) {
    var i, n = nodes.length, node;
    if (iterations === undefined) iterations = 1;
    for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;
      forces.forEach(function(force) { force(alpha); });
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (node.fx == null) node.x += node.vx *= velocityDecay; else node.x = node.fx, node.vx = 0;
        if (node.fy == null) node.y += node.vy *= velocityDecay; else node.y = node.fy, node.vy = 0;
        if (node.fz == null) node.z += node.vz *= velocityDecay; else node.z = node.fz, node.vz = 0;
      }
    }
    return simulation;
  }

  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i]; node.index = i;
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (node.fz != null) node.z = node.fz;
      if (isNaN(node.x) || isNaN(node.y) || isNaN(node.z)) {
        var radius = initialRadius * Math.cbrt(0.5 + i),
            rollAngle = i * initialAngleRoll, yawAngle = i * initialAngleYaw;
        node.x = radius * Math.sin(rollAngle) * Math.cos(yawAngle);
        node.y = radius * Math.cos(rollAngle);
        node.z = radius * Math.sin(rollAngle) * Math.sin(yawAngle);
      }
      if (isNaN(node.vx) || isNaN(node.vy) || isNaN(node.vz)) { node.vx = 0; node.vy = 0; node.vz = 0; }
    }
  }

  function initializeForce(force) { if (force.initialize) force.initialize(nodes, random); return force; }
  initializeNodes();

  return simulation = {
    tick: tick,
    restart: function() { return stepper.restart(step), simulation; },
    stop: function() { return stepper.stop(), simulation; },
    nodes: function(_) { return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes; },
    alpha: function(_) { return arguments.length ? (alpha = +_, simulation) : alpha; },
    alphaMin: function(_) { return arguments.length ? (alphaMin = +_, simulation) : alphaMin; },
    alphaDecay: function(_) { return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay; },
    alphaTarget: function(_) { return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget; },
    velocityDecay: function(_) { return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay; },
    randomSource: function(_) { return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random; },
    force: function(name, _) { return arguments.length > 1 ? ((_ == null ? forces.delete(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name); },
    find: function(x, y, z, radius) {
      var i = 0, n = nodes.length, dx, dy, dz, d2, node, closest;
      if (radius == null) radius = Infinity; radius *= radius;
      for (i = 0; i < n; ++i) {
        node = nodes[i]; dx = x - node.x; dy = y - (node.y||0); dz = z - (node.z||0);
        d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < radius) closest = node, radius = d2;
      }
      return closest;
    },
    on: function(name, _) { return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name); }
  };
}

// ── Expose ──────────────────────────────────────────────────────────
global.Force3D = {
  forceSimulation: forceSimulation,
  forceCenter: forceCenter,
  forceCollide: forceCollide,
  forceLink: forceLink,
  forceManyBody: forceManyBody,
  forceX: forceAxis('x'),
  forceY: forceAxis('y'),
  forceZ: forceAxis('z'),
  octree: octree
};
})(window, d3);
</script>

<!-- ════════════════════════════════════════════════════════════════════
     Main Application: Three.js renderer, Cesium controls, graph logic
     ════════════════════════════════════════════════════════════════════ -->
<script>
// ── Graph State ─────────────────────────────────────────────────────
var graphNodes = new Map();   // uid -> node obj
var graphLinks = [];          // {source, target, predicate}
var linkSet = new Set();
var selectedNode = null;
var hoveredNode = null;
var glowDepth = 5;
var viewMode = '3d'; // '2d' or '3d'

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
  var conns = graphLinks.filter(function(l) { var s = l.source.uid||l.source, t = l.target.uid||l.target; return s === n.uid || t === n.uid; }).length;
  return Math.max(2, Math.min(8, 2 + conns * 0.8));
}

// ── Three.js Scene ──────────────────────────────────────────────────
var scene, camera, renderer, raycaster, mouse;
var nodeGroup, linkMesh;
var gizmoScene, gizmoCamera, gizmoRenderer;
var draggedNode = null, dragPlane, dragOffset;
var activeNode = null; // node with throb highlight
var nodeMeshes = new Map();     // uid -> THREE.Mesh
var nodeLabels = new Map();     // uid -> THREE.Sprite
var linkPositionAttr, linkColorAttr;
// Platonic solids + sphere, assigned per type
var GEOMETRIES = [
  new THREE.IcosahedronGeometry(1, 0),     // 20 faces — default
  new THREE.OctahedronGeometry(1, 0),      // 8 faces
  new THREE.DodecahedronGeometry(1, 0),    // 12 faces
  new THREE.TetrahedronGeometry(1, 0),     // 4 faces
  new THREE.BoxGeometry(1.2, 1.2, 1.2),   // cube
  new THREE.SphereGeometry(1, 16, 12),     // sphere
  new THREE.IcosahedronGeometry(1, 1),     // subdivided icosahedron (smoother)
  new THREE.OctahedronGeometry(1, 1),      // subdivided octahedron
];
var typeGeoMap = {};
var geoIdx = 0;
function typeGeometry(t) {
  if (!typeGeoMap[t]) typeGeoMap[t] = GEOMETRIES[geoIdx++ % GEOMETRIES.length];
  return typeGeoMap[t];
}

var materialCache = new Map();  // "hex|emissive" -> MeshStandardMaterial

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

// ── Cesium-Style Camera Controls ────────────────────────────────────
var controls;

function CesiumControls(cam, el) {
  this.camera = cam;
  this.el = el;
  this.target = new THREE.Vector3(0, 0, 0);
  this.spherical = new THREE.Spherical(800, Math.PI / 2.2, 0);
  this.minDist = 1;
  this.maxDist = 5000;
  this._spinVel = {theta: 0, phi: 0};
  this._zoomVel = 0;
  this._damping = 0.92;
  this._mode = null;
  this._prev = {x: 0, y: 0};
  this._moved = false;
  this.wasDragging = false;
  var self = this;

  el.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  el.addEventListener('mousedown', function(e) {
    self._moved = false;
    if (e.button === 0 && e.ctrlKey) self._mode = 'freelook';
    else if (e.button === 0 && !e.shiftKey) self._mode = 'orbit';
    else if (e.button === 2) self._mode = 'zoom';
    else if (e.button === 1) self._mode = 'tilt';
    self._prev.x = e.clientX; self._prev.y = e.clientY;
    self._spinVel.theta = 0; self._spinVel.phi = 0; self._zoomVel = 0;
  });

  window.addEventListener('mousemove', function(e) {
    if (!self._mode) return;
    var dx = e.clientX - self._prev.x, dy = e.clientY - self._prev.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) self._moved = true;
    self._prev.x = e.clientX; self._prev.y = e.clientY;

    if (self._mode === 'orbit') {
      var td = -dx * 0.005, pd = -dy * 0.005;
      self.spherical.theta += td;
      self.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, self.spherical.phi + pd));
      self._spinVel.theta = td; self._spinVel.phi = pd;
      self._syncCamera();
    } else if (self._mode === 'zoom') {
      var zd = dy * Math.max(5, self.spherical.radius * 0.01);
      self._doZoom(zd);
      self._zoomVel = zd;
    } else if (self._mode === 'tilt') {
      var pd = -dy * 0.005;
      self.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, self.spherical.phi + pd));
      self._syncCamera();
    } else if (self._mode === 'freelook') {
      self.camera.rotateOnWorldAxis(new THREE.Vector3(0,1,0), -dx * 0.003);
      self.camera.rotateX(-dy * 0.003);
      var dir = new THREE.Vector3(0,0,-1).applyQuaternion(self.camera.quaternion);
      self.target.copy(self.camera.position).add(dir.multiplyScalar(self.spherical.radius));
    }
  });

  window.addEventListener('mouseup', function(e) {
    self.wasDragging = self._moved;
    self._mode = null;
    // Release highlight lock — re-raycast to see what we're over now
    if (typeof highlightLocked !== 'undefined' && highlightLocked) {
      highlightLocked = null;
      setTimeout(doRaycast, 50);
    }
  });

  el.addEventListener('wheel', function(e) {
    var delta = e.deltaY * Math.max(3, self.spherical.radius * 0.005);
    self._doZoom(delta);
    self._zoomVel = delta * 0.3;
    e.preventDefault();
  }, {passive: false});

  this._syncCamera();
}

CesiumControls.prototype._doZoom = function(delta) {
  var oldRadius = this.spherical.radius;
  var newRadius = Math.max(this.minDist, Math.min(this.maxDist, oldRadius + delta));
  // When zooming in, slide the orbit target forward along the view direction
  // so we actually approach what we're looking at instead of orbiting a fixed point
  if (newRadius < oldRadius) {
    var approach = (oldRadius - newRadius) * 0.4; // 40% of the zoom step moves the target forward
    var dir = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
    this.target.addScaledVector(dir, approach);
  }
  this.spherical.radius = newRadius;
  this._syncCamera();
};

CesiumControls.prototype._syncCamera = function() {
  var offset = new THREE.Vector3().setFromSpherical(this.spherical);
  this.camera.position.copy(this.target).add(offset);
  this.camera.lookAt(this.target);
};

CesiumControls.prototype.update = function() {
  if (this._mode) return;
  var changed = false;
  if (Math.abs(this._spinVel.theta) > 0.00005 || Math.abs(this._spinVel.phi) > 0.00005) {
    this.spherical.theta += this._spinVel.theta;
    this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi + this._spinVel.phi));
    this._spinVel.theta *= this._damping; this._spinVel.phi *= this._damping;
    changed = true;
  }
  if (Math.abs(this._zoomVel) > 0.05) {
    this._doZoom(this._zoomVel);
    this._zoomVel *= this._damping;
    changed = true;
  }
  if (changed) this._syncCamera();
};

CesiumControls.prototype.lookAt = function(pos, duration) {
  this.target.copy(pos);
  this._syncCamera();
};

// ── Init ────────────────────────────────────────────────────────────
function initGraph() {
  var container = document.getElementById('graph-container');
  // Remove any 2D SVGs
  var svgs = container.querySelectorAll('svg');
  svgs.forEach(function(s) { s.remove(); });
  var w = container.clientWidth, h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.0004);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 10000);
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.insertBefore(renderer.domElement, container.firstChild);

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = {threshold: 5};
  mouse = new THREE.Vector2(-999, -999);

  nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  // Lighting for MeshStandardMaterial shading
  scene.add(new THREE.AmbientLight(0x8090a0, 1.2));
  var keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(200, 400, 300);
  scene.add(keyLight);
  var fillLight = new THREE.DirectionalLight(0x4466aa, 0.4);
  fillLight.position.set(-200, -100, -200);
  scene.add(fillLight);
  var rimLight = new THREE.PointLight(0x58a6ff, 0.6, 2000);
  rimLight.position.set(0, 300, -400);
  scene.add(rimLight);

  controls = new CesiumControls(camera, renderer.domElement);

  document.getElementById('controls-hint').innerHTML = 'Left-drag: orbit &middot; Right-drag: zoom &middot; Scroll: zoom<br>Middle-drag: tilt &middot; Ctrl+left-drag: free-look<br>Shift+drag node: move &middot; Click: select &middot; Dbl-click: expand';

  // Simulation
  simulation = Force3D.forceSimulation([])
    .force('link', Force3D.forceLink([]).id(function(d) { return d.uid; }).distance(80).strength(0.3))
    .force('charge', Force3D.forceManyBody().strength(-200).distanceMax(500))
    .force('center', Force3D.forceCenter(0, 0, 0))
    .force('collide', Force3D.forceCollide(8))
    .on('tick', onSimTick);

  simulation.stop();

  // Raycasting on mousemove
  var rcThrottle = 0;
  renderer.domElement.addEventListener('mousemove', function(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    var now = Date.now();
    if (now - rcThrottle > 40) { rcThrottle = now; doRaycast(); }
  });

  // Node dragging in 3D
  draggedNode = null; dragPlane = new THREE.Plane(); dragOffset = new THREE.Vector3();

  renderer.domElement.addEventListener('mousedown', function(e) {
    if (e.button !== 0 || !e.shiftKey) return;
    // Check if mouse is over a node
    var rect = renderer.domElement.getBoundingClientRect();
    var mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    var meshes = nodeGroup.children.filter(function(c) { return c.userData && c.userData.uid; });
    var hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      var uid = hits[0].object.userData.uid;
      draggedNode = graphNodes.get(uid) || null;
      if (draggedNode) {
        // Prevent orbit controls from engaging
        controls._mode = null;
        e.stopPropagation();
        // Set up drag plane perpendicular to camera
        var camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        var nodePos = new THREE.Vector3(draggedNode.x||0, draggedNode.y||0, draggedNode.z||0);
        dragPlane.setFromNormalAndCoplanarPoint(camDir, nodePos);
        // Compute offset from intersection to node center
        var intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersection);
        dragOffset.subVectors(nodePos, intersection);
        draggedNode.fx = draggedNode.x; draggedNode.fy = draggedNode.y; draggedNode.fz = draggedNode.z;
        simulation.alphaTarget(0.1).restart();
      }
    }
  }, true); // capture phase to intercept before CesiumControls

  window.addEventListener('mousemove', function(e) {
    if (!draggedNode) return;
    var rect = renderer.domElement.getBoundingClientRect();
    var mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    var intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      intersection.add(dragOffset);
      draggedNode.fx = intersection.x; draggedNode.fy = intersection.y; draggedNode.fz = intersection.z;
    }
  });

  window.addEventListener('mouseup', function(e) {
    if (draggedNode) {
      draggedNode.fx = null; draggedNode.fy = null; draggedNode.fz = null;
      simulation.alphaTarget(0);
      draggedNode = null;
    }
  });

  // Click / dblclick
  renderer.domElement.addEventListener('click', function(e) {
    if (controls.wasDragging) return;
    doRaycast();
    if (hoveredNode) { selectedNode = hoveredNode; activeNode = hoveredNode; showNodeInfo(hoveredNode); }
    else { selectedNode = null; activeNode = null; }
  });
  renderer.domElement.addEventListener('dblclick', function(e) {
    if (hoveredNode) expandNode(hoveredNode);
  });

  // Resize
  window.addEventListener('resize', function() {
    var w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ── Orientation Gizmo ──────────────────────────────────────────────
  initGizmo();

  animate();
}

function initGizmo() {
  var gizmoEl = document.getElementById('orientation-gizmo');
  gizmoScene = new THREE.Scene();
  gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  gizmoCamera.position.set(0, 0, 5);
  gizmoCamera.lookAt(0, 0, 0);
  gizmoRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  gizmoRenderer.setSize(120, 120);
  gizmoRenderer.setPixelRatio(window.devicePixelRatio);
  gizmoRenderer.setClearColor(0x000000, 0);
  gizmoEl.appendChild(gizmoRenderer.domElement);

  // Axis lines
  var axisLen = 1.6;
  var axes = [
    {dir: [axisLen,0,0], color: 0xe15759, label: 'X'},
    {dir: [0,axisLen,0], color: 0x59a14f, label: 'Y'},
    {dir: [0,0,axisLen], color: 0x4e79a7, label: 'Z'}
  ];
  axes.forEach(function(a) {
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0), new THREE.Vector3(a.dir[0], a.dir[1], a.dir[2])
    ]);
    var mat = new THREE.LineBasicMaterial({color: a.color, linewidth: 2});
    gizmoScene.add(new THREE.Line(geo, mat));
    // Cone tip
    var coneGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
    var coneMat = new THREE.MeshBasicMaterial({color: a.color});
    var cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(a.dir[0], a.dir[1], a.dir[2]);
    // Orient cone along axis
    if (a.dir[0]) cone.rotation.z = -Math.PI / 2;
    else if (a.dir[2]) cone.rotation.x = Math.PI / 2;
    gizmoScene.add(cone);
    // Label
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.font = 'bold 48px SF Mono, monospace';
    ctx.fillStyle = '#' + a.color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label, 32, 32);
    var tex = new THREE.CanvasTexture(canvas);
    var spriteMat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false});
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.5, 0.5, 1);
    var offset = 0.35;
    sprite.position.set(a.dir[0] + (a.dir[0]?offset:0), a.dir[1] + (a.dir[1]?offset:0), a.dir[2] + (a.dir[2]?offset:0));
    gizmoScene.add(sprite);
  });

  // Small sphere at origin
  var originGeo = new THREE.SphereGeometry(0.1, 12, 8);
  var originMat = new THREE.MeshBasicMaterial({color: 0x484f58});
  gizmoScene.add(new THREE.Mesh(originGeo, originMat));
}

// ── Raycasting ──────────────────────────────────────────────────────
var highlightLocked = null; // locked node during drag

function doRaycast() {
  // While dragging, keep highlight locked on the node we started on
  if (controls._mode && highlightLocked) return;

  raycaster.setFromCamera(mouse, camera);
  var meshes = nodeGroup.children.filter(function(c) { return c.userData && c.userData.uid; });
  var intersects = raycaster.intersectObjects(meshes, false);
  var prev = hoveredNode;
  if (intersects.length > 0) {
    var uid = intersects[0].object.userData.uid;
    hoveredNode = graphNodes.get(uid) || null;
  } else {
    hoveredNode = null;
  }
  renderer.domElement.style.cursor = hoveredNode ? 'pointer' : 'default';
  if (hoveredNode !== prev) {
    if (hoveredNode) { highlightConnections(hoveredNode); highlightLocked = hoveredNode; }
    else if (!controls._mode) { clearHighlight(); highlightLocked = null; }
  }
}

// ── Highlight (BFS) ─────────────────────────────────────────────────
function highlightConnections(d) {
  var adj = new Map();
  graphLinks.forEach(function(l) {
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    if (!adj.has(sid)) adj.set(sid, []);
    if (!adj.has(tid)) adj.set(tid, []);
    adj.get(sid).push(tid); adj.get(tid).push(sid);
  });
  var maxRank = glowDepth - 1, ranks = new Map();
  ranks.set(d.uid, 0);
  var frontier = [d.uid];
  for (var rank = 1; rank <= maxRank; rank++) {
    var next = [];
    frontier.forEach(function(uid) {
      (adj.get(uid) || []).forEach(function(nb) { if (!ranks.has(nb)) { ranks.set(nb, rank); next.push(nb); } });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  graphNodes.forEach(function(n) { n._hlRank = ranks.has(n.uid) ? ranks.get(n.uid) : -1; });
  graphLinks.forEach(function(l) {
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    l._hlRank = (ranks.has(sid) && ranks.has(tid)) ? Math.max(ranks.get(sid), ranks.get(tid)) : -1;
  });
  applyHighlightColors();
}

function clearHighlight() {
  graphNodes.forEach(function(n) { delete n._hlRank; });
  graphLinks.forEach(function(l) { delete l._hlRank; });
  applyHighlightColors();
}

function applyHighlightColors() {
  // Update node mesh colors
  nodeMeshes.forEach(function(mesh, uid) {
    var n = graphNodes.get(uid); if (!n) return;
    var base = typeColor(n.type || 'unknown');
    var color;
    color = base;
    mesh.material = getMaterial(color, color);
    var r = nodeRadius(n);
    mesh.scale.setScalar(r);
  });
  // Update label visibility
  nodeLabels.forEach(function(sprite, uid) {
    var n = graphNodes.get(uid); if (!n) return;
    sprite.visible = n._hlRank !== undefined && n._hlRank >= 0 && n._hlRank <= 3;
    if (sprite.visible) sprite.material.opacity = Math.max(0.3, 1 - n._hlRank * 0.2);
  });
  // Update link colors
  if (linkColorAttr && linkMesh) {
    var colors = linkColorAttr.array;
    for (var i = 0; i < graphLinks.length; i++) {
      var l = graphLinks[i];
      var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
      var base = src ? typeColor(src.type || 'unknown') : '#30363d';
      var hex;
      if (l._hlRank === undefined) hex = base;
      else if (l._hlRank < 0) hex = '#1a1e24';
      else hex = adjustBrightness(base, Math.max(1.0, 2.5 - l._hlRank * 0.3));
      var rgb = hexToRgb(hex);
      var idx = i * 6;
      colors[idx] = colors[idx+3] = rgb[0]/255;
      colors[idx+1] = colors[idx+4] = rgb[1]/255;
      colors[idx+2] = colors[idx+5] = rgb[2]/255;
    }
    linkColorAttr.needsUpdate = true;
  }
}

// ── Simulation tick → update mesh positions ─────────────────────────
function onSimTick() {
  graphNodes.forEach(function(n) {
    var mesh = nodeMeshes.get(n.uid);
    if (mesh) mesh.position.set(n.x || 0, n.y || 0, n.z || 0);
    var label = nodeLabels.get(n.uid);
    if (label) label.position.set((n.x||0), (n.y||0) + nodeRadius(n) + 3, (n.z||0));
  });
  updateLinkPositions();
}

function updateLinkPositions() {
  if (!linkPositionAttr || !linkMesh) return;
  var pos = linkPositionAttr.array;
  for (var i = 0; i < graphLinks.length; i++) {
    var l = graphLinks[i];
    var s = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
    var t = typeof l.target === 'object' ? l.target : graphNodes.get(l.target);
    if (!s || !t) continue;
    var idx = i * 6;
    pos[idx] = s.x||0; pos[idx+1] = s.y||0; pos[idx+2] = s.z||0;
    pos[idx+3] = t.x||0; pos[idx+4] = t.y||0; pos[idx+5] = t.z||0;
  }
  linkPositionAttr.needsUpdate = true;
}

// ── Build / rebuild meshes ──────────────────────────────────────────
function rebuildScene() {
  // Clear old meshes
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);
  if (linkMesh) { scene.remove(linkMesh); linkMesh = null; }
  nodeMeshes.clear();
  nodeLabels.forEach(function(sprite) { scene.remove(sprite); });
  nodeLabels.clear();

  var nodeArr = Array.from(graphNodes.values());

  // Node meshes + labels
  nodeArr.forEach(function(n) {
    var t = n.type || 'unknown';
    var color = typeColor(t);
    var mesh = new THREE.Mesh(typeGeometry(t), getMaterial(color, color));
    var r = nodeRadius(n);
    mesh.scale.setScalar(r);
    mesh.position.set(n.x||0, n.y||0, n.z||0);
    mesh.userData = {uid: n.uid};
    nodeGroup.add(mesh);
    nodeMeshes.set(n.uid, mesh);

    // Label sprite
    var label = n.label || n.uid;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fontSize = 64;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    var tw = ctx.measureText(label).width + 16;
    canvas.width = tw; canvas.height = fontSize + 16;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    ctx.fillStyle = '#c9d1d9';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 8, canvas.height / 2);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false, fog: true, opacity: 0.9});
    var sprite = new THREE.Sprite(mat);
    var scale = 3 / fontSize;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.position.set((n.x||0), (n.y||0) + r + 3, (n.z||0));
    sprite.visible = false;
    scene.add(sprite);
    nodeLabels.set(n.uid, sprite);
  });

  // Link geometry
  var numLinks = graphLinks.length;
  var linkGeo = new THREE.BufferGeometry();
  var positions = new Float32Array(numLinks * 6);
  var colors = new Float32Array(numLinks * 6);
  for (var i = 0; i < numLinks; i++) {
    var l = graphLinks[i];
    var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
    var base = src ? typeColor(src.type || 'unknown') : '#30363d';
    var rgb = hexToRgb(base);
    var idx = i * 6;
    colors[idx] = colors[idx+3] = rgb[0]/255;
    colors[idx+1] = colors[idx+4] = rgb[1]/255;
    colors[idx+2] = colors[idx+5] = rgb[2]/255;
  }
  linkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  linkPositionAttr = linkGeo.attributes.position;
  linkColorAttr = linkGeo.attributes.color;
  var linkMat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.9, fog: true, linewidth: 1});
  linkMesh = new THREE.LineSegments(linkGeo, linkMat);
  scene.add(linkMesh);

  updateLinkPositions();
}

// ── Render (called after data changes) ──────────────────────────────
function renderGraph() {
  if (viewMode === '2d') { render2D(); return; }
  var nodeArr = Array.from(graphNodes.values());
  rebuildScene();
  simulation.nodes(nodeArr);
  simulation.force('link').links(graphLinks);
  simulation.alpha(0.5).restart();
  updateLegend();
}

// ── Animation loop ──────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  controls.update();

  // Auto-pan when dragging node near viewport edge
  if (draggedNode) {
    var edgeMargin = 0.15; // 15% from edge triggers pan
    var panSpeed = 3;
    var dx = 0, dy = 0;
    if (mouse.x > 1 - edgeMargin) dx = (mouse.x - (1 - edgeMargin)) / edgeMargin * panSpeed;
    else if (mouse.x < -1 + edgeMargin) dx = (mouse.x - (-1 + edgeMargin)) / edgeMargin * panSpeed;
    if (mouse.y > 1 - edgeMargin) dy = (mouse.y - (1 - edgeMargin)) / edgeMargin * panSpeed;
    else if (mouse.y < -1 + edgeMargin) dy = (mouse.y - (-1 + edgeMargin)) / edgeMargin * panSpeed;
    if (dx !== 0 || dy !== 0) {
      var right = new THREE.Vector3(); camera.getWorldDirection(right);
      var up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(up, right).normalize();
      controls.target.addScaledVector(right, dx);
      controls.target.addScaledVector(up, dy);
      controls._syncCamera();
    }
  }

  // Throb active (selected) node
  if (activeNode && nodeMeshes.has(activeNode.uid)) {
    var mesh = nodeMeshes.get(activeNode.uid);
    var t = Date.now() * 0.004;
    var pulse = 0.5 + 0.5 * Math.sin(t); // 0..1
    var baseR = nodeRadius(activeNode);
    mesh.scale.setScalar(baseR * (1 + pulse * 0.25));
    var baseColor = typeColor(activeNode.type || 'unknown');
    var bright = adjustBrightness(baseColor, 1.5 + pulse * 1.0);
    mesh.material = getMaterial(bright, '#ffffff');
    mesh.material.emissiveIntensity = 0.4 + pulse * 0.6;
    // Keep label visible
    var label = nodeLabels.get(activeNode.uid);
    if (label) { label.visible = true; label.material.opacity = 0.8 + pulse * 0.2; }
  }

  renderer.render(scene, camera);

  // Render orientation gizmo synced to main camera
  if (gizmoRenderer && gizmoCamera) {
    var q = camera.quaternion.clone();
    gizmoCamera.position.set(0, 0, 5).applyQuaternion(q);
    gizmoCamera.quaternion.copy(q);
    gizmoRenderer.render(gizmoScene, gizmoCamera);
  }
}

// ── Arrow key Z-axis movement ───────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (!selectedNode) return;
  var tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    var step = 25, dir = e.key === 'ArrowUp' ? -1 : 1;
    selectedNode.fz = (selectedNode.fz != null ? selectedNode.fz : (selectedNode.z || 0)) + dir * step;
    simulation.alpha(0.3).restart();
  }
});

// ── Sidebar: Node info ──────────────────────────────────────────────
function showNodeInfo(d) {
  var info = document.getElementById('node-info');
  var html = '<h3>' + escHtml(d.label || d.uid) + '</h3>';
  html += '<div class="prop-row"><span class="prop-key">uid</span><span class="prop-val">' + d.uid + '</span></div>';
  if (d.type) html += '<div class="prop-row"><span class="prop-key">dgraph.type</span><span class="prop-val">' + escHtml(d.type) + '</span></div>';
  for (var k in (d.props || {})) {
    if (k === 'uid' || k === 'dgraph.type') continue;
    var v = d.props[k];
    if (Array.isArray(v) && v.length > 0 && v[0] && v[0].uid) {
      var items = v.map(function(e) { return '<span class="edge-link" onclick="focusNode(\'' + e.uid + '\')">' + (e['dgraph.type'] ? e['dgraph.type'] + ':' : '') + e.uid + '</span>'; }).join(', ');
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + items + '</span></div>';
    } else {
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + escHtml(JSON.stringify(v)) + '</span></div>';
    }
  }
  if (!d.expanded) html += '<br><button class="btn btn-primary" onclick="expandNode(graphNodes.get(\'' + d.uid + '\'))">Expand edges</button>';
  info.innerHTML = html;
}

function focusNode(uid) {
  var n = graphNodes.get(uid);
  if (n) {
    selectedNode = n;
    activeNode = n;
    showNodeInfo(n);
    if (viewMode === '3d' && controls) {
      controls.target.set(n.x||0, n.y||0, n.z||0);
      controls.spherical.radius = Math.min(controls.spherical.radius, 150);
      controls._spinVel.theta = 0; controls._spinVel.phi = 0; controls._zoomVel = 0;
      controls._syncCamera();
    } else if (viewMode === '2d' && svg2d && zoom2d) {
      var container = document.getElementById('graph-container');
      var w = container.clientWidth, h = container.clientHeight;
      var scale = 2;
      svg2d.transition().duration(500).call(zoom2d.transform,
        d3.zoomIdentity.translate(w/2 - n.x*scale, h/2 - n.y*scale).scale(scale));
      updateActiveNode2D();
    }
  }
}

async function expandNode(d) {
  if (d.expanded) return;
  setStatus('Expanding ' + d.uid + '...');
  var query = '{ node(func: uid(' + d.uid + ')) { uid expand(_all_) { uid dgraph.type expand(_all_) } } }';
  try {
    var resp = await fetch('/api/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query: query})});
    var data = await resp.json();
    if (data.data && data.data.node) data.data.node.forEach(function(n) { ingestNode(n, d.x, d.y, d.z); });
    d.expanded = true;
    renderGraph();
    setStatus('Expanded ' + d.uid);
    if (selectedNode && selectedNode.uid === d.uid) showNodeInfo(d);
  } catch(e) { setStatus('Error: ' + e.message); }
}

// ── Data ingestion ──────────────────────────────────────────────────
function ingestNode(obj, px, py, pz) {
  if (!obj || !obj.uid) return;
  var type = Array.isArray(obj['dgraph.type']) ? obj['dgraph.type'][0] : obj['dgraph.type'];
  var label = obj.name || obj.title || obj.label || obj['dgraph.type'] || '';
  if (!graphNodes.has(obj.uid)) {
    graphNodes.set(obj.uid, {
      uid: obj.uid, label: Array.isArray(label) ? label[0] : label,
      type: type || 'unknown', props: obj, expanded: false,
      x: px ? px + (Math.random()-0.5)*60 : undefined,
      y: py ? py + (Math.random()-0.5)*60 : undefined,
      z: pz ? pz + (Math.random()-0.5)*60 : undefined,
    });
  } else {
    var existing = graphNodes.get(obj.uid);
    existing.props = Object.assign({}, existing.props, obj);
    if (!existing.label && label) existing.label = Array.isArray(label) ? label[0] : label;
    if ((!existing.type || existing.type === 'unknown') && type) existing.type = type;
  }
  for (var key in obj) {
    if (key === 'uid' || key === 'dgraph.type') continue;
    var val = obj[key];
    if (Array.isArray(val)) {
      val.forEach(function(item) { if (item && typeof item === 'object' && item.uid) { ingestNode(item, px, py, pz); addLink(obj.uid, item.uid, key); } });
    } else if (val && typeof val === 'object' && val.uid) {
      ingestNode(val, px, py, pz); addLink(obj.uid, val.uid, key);
    }
  }
}

function addLink(src, tgt, pred) {
  var key = src + '|' + tgt + '|' + pred;
  if (linkSet.has(key)) return;
  linkSet.add(key);
  graphLinks.push({source: src, target: tgt, predicate: pred});
}

// ── Query execution ─────────────────────────────────────────────────
async function runQuery() {
  var query = document.getElementById('query-input').value.trim();
  if (!query) return;
  setStatus('Running query...');
  try {
    var resp = await fetch('/api/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query: query})});
    if (!resp.ok) { setStatus('Error: ' + (await resp.text())); return; }
    var data = await resp.json();
    if (data.errors) { setStatus('Error: ' + data.errors.map(function(e){return e.message}).join('; ')); return; }
    var count = 0;
    if (data.data) { for (var k in data.data) { var arr = data.data[k]; if (Array.isArray(arr)) arr.forEach(function(obj) { ingestNode(obj); count++; }); } }
    renderGraph();
    setStatus('Loaded ' + count + ' root nodes, ' + graphNodes.size + ' total, ' + graphLinks.length + ' edges');
  } catch(e) { setStatus('Error: ' + e.message); }
}

function runAll() {
  document.getElementById('query-input').value = '{\n  all(func: has(dgraph.type)) {\n    uid\n    dgraph.type\n    expand(_all_) {\n      uid\n      dgraph.type\n      expand(_all_)\n    }\n  }\n}';
  runQuery();
}

function resetView() {
  if (viewMode === '3d') {
    if (graphNodes.size === 0) {
      controls.target.set(0, 0, 0);
      controls.spherical.radius = 800;
      controls.spherical.phi = Math.PI / 2.2;
      controls.spherical.theta = 0;
      controls._syncCamera();
      return;
    }
    // Compute bounding box of all nodes
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    graphNodes.forEach(function(n) {
      var x = n.x||0, y = n.y||0, z = n.z||0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    });
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    var span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
    controls.target.set(cx, cy, cz);
    controls.spherical.radius = span * 1.2 + 50;
    controls.spherical.phi = Math.PI / 2.2;
    controls.spherical.theta = 0;
    controls._spinVel.theta = 0; controls._spinVel.phi = 0; controls._zoomVel = 0;
    controls._syncCamera();
  } else {
    if (svg2d && zoom2d) {
      svg2d.transition().duration(300).call(zoom2d.transform, d3.zoomIdentity);
    }
  }
  setStatus('View reset');
}

function clearGraph() {
  graphNodes.clear(); graphLinks.length = 0; linkSet.clear();
  selectedNode = null; hoveredNode = null;
  if (viewMode === '3d') { if (simulation) simulation.stop(); rebuildScene(); }
  else { if (sim2d) sim2d.stop(); if (linkG2d) linkG2d.selectAll('*').remove(); if (labelG2d) labelG2d.selectAll('*').remove(); if (nodeG2d) nodeG2d.selectAll('*').remove(); }
  document.getElementById('node-info').innerHTML = '<p style="color:#484f58">Click a node to inspect. Double-click to expand.</p>';
  document.getElementById('legend').innerHTML = '';
  setStatus('Cleared');
}

async function loadSchema() {
  setStatus('Loading schema...');
  try {
    var resp = await fetch('/api/schema');
    var data = await resp.json();
    var info = document.getElementById('node-info');
    var html = '<h3>Schema</h3>';
    if (data.data && data.data.schema) {
      data.data.schema.forEach(function(s) {
        html += '<div class="prop-row"><span class="prop-key">' + escHtml(s.predicate) + '</span><span class="prop-val">' + escHtml(s.type || '') + (s.list ? ' [list]' : '') + (s.index ? ' @index(' + s.tokenizer.join(',') + ')' : '') + '</span></div>';
      });
    }
    info.innerHTML = html;
    setStatus('Schema loaded');
  } catch(e) { setStatus('Error: ' + e.message); }
}

// ── Legend ───────────────────────────────────────────────────────────
var GEO_NAMES = ['icosahedron','octahedron','dodecahedron','tetrahedron','cube','sphere','ico-smooth','octa-smooth'];
var GEO_SHAPES = ['polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)','polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)','circle(50%)','polygon(50% 0%, 100% 100%, 0% 100%)','none','circle(50%)','circle(50%)','polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'];

function updateLegend() {
  var types = new Set();
  graphNodes.forEach(function(n) { types.add(n.type || 'unknown'); });
  var legend = document.getElementById('legend');
  if (viewMode === '2d') {
    legend.innerHTML = Array.from(types).sort().map(function(t) {
      var gi = GEOMETRIES.indexOf(typeGeometry(t));
      var shape = GEO_SHAPES[gi] || 'circle(50%)';
      var borderRadius = (gi === 4) ? '2px' : '0';
      var clipPath = shape === 'none' ? '' : 'clip-path:' + shape + ';';
      return '<div><span class="swatch" style="background:' + typeColors2d(t) + ';border-radius:' + borderRadius + ';' + clipPath + '"></span>' + escHtml(t) + '</div>';
    }).join('');
  } else {
    legend.innerHTML = Array.from(types).sort().map(function(t) {
      var gi = GEOMETRIES.indexOf(typeGeometry(t));
      var shape = GEO_SHAPES[gi] || 'circle(50%)';
      var borderRadius = (gi === 4) ? '2px' : '0';
      var clipPath = shape === 'none' ? '' : 'clip-path:' + shape + ';';
      return '<div><span class="swatch" style="background:' + typeColor(t) + ';border-radius:' + borderRadius + ';' + clipPath + '"></span>' + escHtml(t) + '</div>';
    }).join('');
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
function setStatus(msg) { document.getElementById('status').textContent = msg; }
function escHtml(s) { var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

// ── Keyboard shortcut ───────────────────────────────────────────────
document.getElementById('query-input').addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
});

// ── Dgraph address ──────────────────────────────────────────────────
async function loadConfig() {
  try { var resp = await fetch('/api/config'); var data = await resp.json(); document.getElementById('dgraph-addr').value = data.dgraph || ''; } catch(e) {}
}
async function disconnectDgraph() { await fetch('/api/disconnect', {method: 'POST'}); setStatus('Disconnected'); }
async function connectDgraph(addr) {
  var resp = await fetch('/api/config', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({dgraph: addr})});
  if (resp.ok) { var data = await resp.json(); setStatus('Connected to ' + data.dgraph); } else { setStatus('Failed to connect'); }
}
document.getElementById('dgraph-addr').addEventListener('input', async function() {
  await disconnectDgraph(); var addr = this.value.trim(); if (addr) await connectDgraph(addr);
});

// ── Depth control ───────────────────────────────────────────────────
document.getElementById('glow-depth').addEventListener('change', function() {
  glowDepth = Math.max(1, Math.min(20, parseInt(this.value) || 5)); this.value = glowDepth;
});

// ══════════════════════════════════════════════════════════════════════
// 2D MODE (D3 SVG)
// ══════════════════════════════════════════════════════════════════════
var svg2d, g2d, linkG2d, labelG2d, nodeG2d, zoom2d, sim2d;
var typeColors2d = d3.scaleOrdinal(d3.schemeTableau10);

function nodeRadius2D(d) {
  var conns = graphLinks.filter(function(l) { var s = l.source.uid||l.source, t = l.target.uid||l.target; return s === d.uid || t === d.uid; }).length;
  return Math.max(6, Math.min(20, 6 + conns * 1.5));
}

function init2D() {
  var container = document.getElementById('graph-container');
  // Remove any 3D canvas
  var canvases = container.querySelectorAll('canvas');
  canvases.forEach(function(c) { c.remove(); });

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  container.insertBefore(svgEl, container.firstChild);

  svg2d = d3.select(svgEl);
  var rect = container.getBoundingClientRect();

  zoom2d = d3.zoom().scaleExtent([0.1, 8]).on('zoom', function(e) { g2d.attr('transform', e.transform); });
  svg2d.call(zoom2d);

  svg2d.on('click', function(e) {
    if (e.target.tagName === 'svg') { selectedNode = null; activeNode = null; updateActiveNode2D(); }
  });

  g2d = svg2d.append('g');
  linkG2d = g2d.append('g').attr('class', 'links');
  labelG2d = g2d.append('g').attr('class', 'link-labels');
  nodeG2d = g2d.append('g').attr('class', 'nodes');

  sim2d = d3.forceSimulation()
    .force('link', d3.forceLink().id(function(d) { return d.uid; }).distance(100).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    .force('center', d3.forceCenter(rect.width / 2, rect.height / 2))
    .force('collision', d3.forceCollide(30))
    .force('x', d3.forceX(rect.width / 2).strength(0.02))
    .force('y', d3.forceY(rect.height / 2).strength(0.02))
    .on('tick', ticked2D);
  sim2d.stop();

  document.getElementById('controls-hint').innerHTML = 'Scroll: zoom &middot; Drag: pan<br>Click: select &middot; Double-click: expand';
}

function teardown2D() {
  if (sim2d) sim2d.stop();
  var container = document.getElementById('graph-container');
  var svgs = container.querySelectorAll('svg');
  svgs.forEach(function(s) { s.remove(); });
  svg2d = null; g2d = null; linkG2d = null; labelG2d = null; nodeG2d = null; sim2d = null;
}

// SVG path generators for 2D projections of the 3D platonic solids (unit size, centered at origin)
// Matches GEOMETRIES order: icosahedron, octahedron, dodecahedron, tetrahedron, cube, sphere, ico-smooth, octa-smooth
var SVG_SHAPES = [
  function(r) { // icosahedron → pentagon
    var pts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI/2 + i * 2*Math.PI/5; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z';
  },
  function(r) { // octahedron → diamond
    return 'M0,'+(-r)+'L'+r+',0 0,'+r+' '+(-r)+',0Z';
  },
  function(r) { // dodecahedron → hexagon
    var pts = []; for (var i = 0; i < 6; i++) { var a = -Math.PI/2 + i * Math.PI/3; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z';
  },
  function(r) { // tetrahedron → triangle
    return 'M0,'+(-r)+'L'+(r*0.866).toFixed(2)+','+(r*0.5).toFixed(2)+' '+(-r*0.866).toFixed(2)+','+(r*0.5).toFixed(2)+'Z';
  },
  function(r) { // cube → square
    var h = r * 0.85; return 'M'+(-h)+','+(-h)+'L'+h+','+(-h)+' '+h+','+h+' '+(-h)+','+h+'Z';
  },
  function(r) { // sphere → circle (use d3 arc or just return null to use <circle>)
    return null;
  },
  function(r) { // ico-smooth → pentagon (same as icosahedron)
    var pts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI/2 + i * 2*Math.PI/5; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z';
  },
  function(r) { // octa-smooth → diamond (same as octahedron)
    return 'M0,'+(-r)+'L'+r+',0 0,'+r+' '+(-r)+',0Z';
  }
];

function svgShapeForType(t) {
  var gi = GEOMETRIES.indexOf(typeGeometry(t));
  return gi >= 0 ? SVG_SHAPES[gi] : SVG_SHAPES[5]; // default to sphere/circle
}

function render2D() {
  if (!svg2d) return;
  var nodeArr = Array.from(graphNodes.values());

  // Reset 2D positions if nodes don't have valid x/y for 2D
  var rect = document.getElementById('graph-container').getBoundingClientRect();
  nodeArr.forEach(function(n) {
    if (n.x === undefined || isNaN(n.x)) n.x = rect.width / 2 + (Math.random() - 0.5) * 200;
    if (n.y === undefined || isNaN(n.y)) n.y = rect.height / 2 + (Math.random() - 0.5) * 200;
  });

  // Links
  var linkSel = linkG2d.selectAll('line').data(graphLinks, function(d) { return (d.source.uid||d.source) + '|' + (d.target.uid||d.target) + '|' + d.predicate; });
  linkSel.exit().remove();
  linkSel.enter().append('line').attr('class', 'link').attr('stroke-width', 1.5);

  // Link labels
  var llSel = labelG2d.selectAll('text').data(graphLinks, function(d) { return (d.source.uid||d.source) + '|' + (d.target.uid||d.target) + '|' + d.predicate; });
  llSel.exit().remove();
  llSel.enter().append('text').attr('class', 'link-label').text(function(d) { return d.predicate; });

  // Nodes
  var nodeSel = nodeG2d.selectAll('g.node').data(nodeArr, function(d) { return d.uid; });
  nodeSel.exit().remove();

  var enter = nodeSel.enter().append('g')
    .attr('class', function(d) { return 'node ' + (d.expanded ? 'expanded' : 'unexpanded'); })
    .call(drag2D(sim2d))
    .on('click', function(e, d) { e.stopPropagation(); selectedNode = d; activeNode = d; showNodeInfo(d); updateActiveNode2D(); })
    .on('dblclick', function(e, d) { expandNode(d); })
    .on('mouseenter', function(e, d) { highlightConnections2D(d); })
    .on('mouseleave', function() { clearHighlight2D(); });

  enter.each(function(d) {
    var g = d3.select(this);
    var r = nodeRadius2D(d);
    var shapeFn = svgShapeForType(d.type || 'unknown');
    var pathD = shapeFn(r);
    if (pathD) {
      g.append('path').attr('d', pathD).attr('fill', typeColors2d(d.type || 'unknown')).attr('class', 'node-shape');
    } else {
      g.append('circle').attr('r', r).attr('fill', typeColors2d(d.type || 'unknown')).attr('class', 'node-shape');
    }
  });

  enter.append('text').attr('dx', 14).attr('dy', 4)
    .text(function(d) { return d.label || d.uid; });

  // Update existing
  nodeG2d.selectAll('g.node')
    .attr('class', function(d) { return 'node ' + (d.expanded ? 'expanded' : 'unexpanded'); })
    .each(function(d) {
      var g = d3.select(this);
      var r = nodeRadius2D(d);
      var shapeFn = svgShapeForType(d.type || 'unknown');
      var pathD = shapeFn(r);
      var shape = g.select('.node-shape');
      if (pathD) { shape.attr('d', pathD); }
      else { shape.attr('r', r); }
      shape.attr('fill', typeColors2d(d.type || 'unknown'));
    });

  linkG2d.selectAll('line').attr('stroke', function(d) {
    var src = typeof d.source === 'object' ? d.source : graphNodes.get(d.source);
    return src ? typeColors2d(src.type || 'unknown') : '#30363d';
  });

  sim2d.nodes(nodeArr);
  sim2d.force('link').links(graphLinks);
  sim2d.alpha(0.5).restart();
  updateLegend();
}

function ticked2D() {
  linkG2d.selectAll('line')
    .attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
  labelG2d.selectAll('text')
    .attr('x', function(d) { return (d.source.x + d.target.x) / 2; })
    .attr('y', function(d) { return (d.source.y + d.target.y) / 2; });
  nodeG2d.selectAll('g.node').attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
}

function drag2D(sim) {
  return d3.drag()
    .on('start', function(e, d) { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', function(e, d) { d.fx = e.x; d.fy = e.y; })
    .on('end', function(e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
}

function highlightConnections2D(d) {
  var adj = new Map();
  graphLinks.forEach(function(l) {
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    if (!adj.has(sid)) adj.set(sid, []);
    if (!adj.has(tid)) adj.set(tid, []);
    adj.get(sid).push(tid); adj.get(tid).push(sid);
  });
  var maxRank = glowDepth - 1, ranks = new Map();
  ranks.set(d.uid, 0);
  var frontier = [d.uid];
  for (var rank = 1; rank <= maxRank; rank++) {
    var next = [];
    frontier.forEach(function(uid) { (adj.get(uid) || []).forEach(function(nb) { if (!ranks.has(nb)) { ranks.set(nb, rank); next.push(nb); } }); });
    frontier = next; if (!frontier.length) break;
  }
  nodeG2d.selectAll('g.node').each(function(n) {
    var el = d3.select(this);
    for (var i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false);
    if (ranks.has(n.uid)) {
      var r = ranks.get(n.uid), gc = Math.min(r, 4);
      el.classed('glow-' + gc, true);
      el.select('text').style('opacity', r <= maxRank ? Math.max(0.3, 1 - r * 0.15) : 0);
    } else { el.classed('dimmed', true); el.select('text').style('opacity', 0); }
  });
  linkG2d.selectAll('line').each(function(l) {
    var el = d3.select(this);
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    el.classed('dimmed', false); el.classed('glow', false);
    if (ranks.has(sid) && ranks.has(tid)) {
      var edgeRank = Math.max(ranks.get(sid), ranks.get(tid));
      var t = Math.min(edgeRank / maxRank, 1);
      el.attr('stroke-width', 3.5 - t * 2.5).attr('stroke-opacity', 1.0 - t * 0.6);
      if (edgeRank <= 1) el.classed('glow', true);
    } else { el.classed('dimmed', true); }
  });
}

function clearHighlight2D() {
  if (!nodeG2d) return;
  nodeG2d.selectAll('g.node').each(function() {
    var el = d3.select(this);
    for (var i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false); el.select('text').style('opacity', 0);
  });
  linkG2d.selectAll('line').classed('dimmed', false).classed('glow', false)
    .attr('stroke-width', 1.5).attr('stroke-opacity', 0.4);
}

function updateActiveNode2D() {
  if (!nodeG2d) return;
  nodeG2d.selectAll('g.node').classed('active', function(d) { return activeNode && d.uid === activeNode.uid; });
}

// ══════════════════════════════════════════════════════════════════════
// 3D teardown
// ══════════════════════════════════════════════════════════════════════
function teardown3D() {
  if (simulation) simulation.stop();
  if (renderer) {
    renderer.domElement.remove();
    renderer.dispose();
    renderer = null;
  }
  if (gizmoRenderer) {
    gizmoRenderer.domElement.remove();
    gizmoRenderer.dispose();
    gizmoRenderer = null;
  }
  gizmoScene = null; gizmoCamera = null;
  scene = null; camera = null; controls = null;
  nodeMeshes.clear();
  nodeLabels.clear();
  linkMesh = null; linkPositionAttr = null; linkColorAttr = null;
}

// ══════════════════════════════════════════════════════════════════════
// Mode Switching
// ══════════════════════════════════════════════════════════════════════
function switchMode() {
  var newMode = viewMode === '3d' ? '2d' : '3d';
  // Teardown current
  if (viewMode === '3d') teardown3D();
  else teardown2D();

  // Un-resolve links back to uid strings for the new simulation
  graphLinks.forEach(function(l) {
    if (typeof l.source === 'object' && l.source.uid) l.source = l.source.uid;
    if (typeof l.target === 'object' && l.target.uid) l.target = l.target.uid;
  });

  viewMode = newMode;
  var knob = document.querySelector('.toggle-knob');
  knob.className = 'toggle-knob ' + (viewMode === '3d' ? 'active-3d' : 'active-2d');
  document.getElementById('toggle-label-2d').className = 'toggle-label' + (viewMode === '2d' ? ' active' : '');
  document.getElementById('toggle-label-3d').className = 'toggle-label' + (viewMode === '3d' ? ' active' : '');
  document.getElementById('orientation-gizmo').style.display = viewMode === '3d' ? '' : 'none';

  if (viewMode === '3d') {
    initGraph();
    if (graphNodes.size > 0) renderGraph();
  } else {
    init2D();
    if (graphNodes.size > 0) render2D();
  }
}

// ── Boot ────────────────────────────────────────────────────────────
loadConfig();
initGraph();
</script>
</body>
</html>`
