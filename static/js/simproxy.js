// ── SimulationProxy ─────────────────────────────────────────────────
// Main-thread stand-in for the 3D force simulation.  Spawns a Web
// Worker that runs force3d.js and posts node positions back each tick.
// Exposes the same chainable API surface used by the rest of the app:
//   .nodes(arr), .force('link').links(arr), .alpha(v), .alphaTarget(v),
//   .restart(), .stop(), .on('tick'|'end', cb), .fixNode(n), .terminate()

function SimulationProxy(workerUrl, config) {
  var self = this;
  this._worker = new Worker(workerUrl);
  this._callbacks = {};
  this._nodes = [];       // reference to graphNodes array set via .nodes()
  this._nodeIndex = {};   // uid → index in the worker's nodes array
  this._pendingAlpha = null;

  // Fake link force object so `simulation.force('link').links(arr)` works
  this._linkForce = {
    _links: [],
    links: function(arr) {
      if (!arguments.length) return this._links;
      this._links = arr;
      return this;  // chainable – renderGraph doesn't chain further
    }
  };

  this._worker.onmessage = function(e) {
    var msg = e.data;
    if (msg.type === 'tick') {
      // Write positions from Float64Array back into the node objects
      var pos = msg.positions;
      for (var i = 0; i < self._nodes.length; i++) {
        self._nodes[i].x = pos[i * 3];
        self._nodes[i].y = pos[i * 3 + 1];
        self._nodes[i].z = pos[i * 3 + 2];
      }
      if (self._callbacks.tick) self._callbacks.tick();
    } else if (msg.type === 'end') {
      if (self._callbacks.end) self._callbacks.end();
    }
  };

  this._worker.postMessage({type: 'init', config: config || {}});
}

// ── Chainable API ───────────────────────────────────────────────────

SimulationProxy.prototype.nodes = function(arr) {
  if (!arguments.length) return this._nodes;
  this._nodes = arr;
  this._nodeIndex = {};
  for (var i = 0; i < arr.length; i++) {
    this._nodeIndex[arr[i].uid] = i;
  }
  return this;
};

SimulationProxy.prototype.force = function(name) {
  if (name === 'link') return this._linkForce;
  return null;
};

SimulationProxy.prototype.alpha = function(v) {
  if (!arguments.length) return this._pendingAlpha || 0;
  this._pendingAlpha = v;
  return this;
};

SimulationProxy.prototype.alphaTarget = function(v) {
  if (!arguments.length) return 0;
  this._worker.postMessage({type: 'alphaTarget', value: v});
  return this;
};

SimulationProxy.prototype.restart = function() {
  // Send graph data + restart in one go
  var serNodes = [];
  for (var i = 0; i < this._nodes.length; i++) {
    var n = this._nodes[i];
    serNodes.push({
      uid: n.uid, index: i,
      x: n.x, y: n.y, z: n.z,
      vx: n.vx || 0, vy: n.vy || 0, vz: n.vz || 0,
      fx: n.fx != null ? n.fx : null,
      fy: n.fy != null ? n.fy : null,
      fz: n.fz != null ? n.fz : null
    });
  }
  var serLinks = [];
  var links = this._linkForce._links;
  for (var j = 0; j < links.length; j++) {
    var l = links[j];
    serLinks.push({
      source: typeof l.source === 'object' ? l.source.uid : l.source,
      target: typeof l.target === 'object' ? l.target.uid : l.target,
      predicate: l.predicate
    });
  }
  this._worker.postMessage({type: 'setGraph', nodes: serNodes, links: serLinks});
  this._worker.postMessage({type: 'restart', alpha: this._pendingAlpha != null ? this._pendingAlpha : 0.5});
  this._pendingAlpha = null;
  return this;
};

SimulationProxy.prototype.stop = function() {
  this._worker.postMessage({type: 'stop'});
  return this;
};

SimulationProxy.prototype.on = function(name, cb) {
  if (arguments.length > 1) {
    this._callbacks[name] = cb;
    return this;
  }
  return this._callbacks[name];
};

// ── Fix node helpers (notify worker of fx/fy/fz changes) ───────────

SimulationProxy.prototype.fixNode = function(node) {
  var idx = this._nodeIndex[node.uid];
  if (idx == null) return this;
  this._worker.postMessage({
    type: 'fixNode', index: idx,
    fx: node.fx != null ? node.fx : null,
    fy: node.fy != null ? node.fy : null,
    fz: node.fz != null ? node.fz : null
  });
  return this;
};

SimulationProxy.prototype.fixNodes = function(entries) {
  var fixes = [];
  for (var i = 0; i < entries.length; i++) {
    var n = entries[i].node;
    var idx = this._nodeIndex[n.uid];
    if (idx == null) continue;
    fixes.push({
      index: idx,
      fx: n.fx != null ? n.fx : null,
      fy: n.fy != null ? n.fy : null,
      fz: n.fz != null ? n.fz : null
    });
  }
  if (fixes.length) this._worker.postMessage({type: 'fixNodes', fixes: fixes});
  return this;
};

SimulationProxy.prototype.terminate = function() {
  if (this._worker) {
    this._worker.terminate();
    this._worker = null;
  }
};
