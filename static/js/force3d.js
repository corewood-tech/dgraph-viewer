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

var nDim = 3;

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
