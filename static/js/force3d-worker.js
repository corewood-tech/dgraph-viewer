// ── Force3D Web Worker ──────────────────────────────────────────────
// Runs the force simulation off the main thread, posting node
// positions back each tick via a Float64Array.

// Shim d3.timer and d3.dispatch so force3d.js can use them
self.d3 = {
  timer: function(callback) {
    var id = null;
    function tick() { callback(); id = setTimeout(tick, 16); }
    id = setTimeout(tick, 16);
    return {
      stop: function() { if (id != null) { clearTimeout(id); id = null; } },
      restart: function(cb) {
        if (id != null) clearTimeout(id);
        callback = cb || callback;
        function tick2() { callback(); id = setTimeout(tick2, 16); }
        id = setTimeout(tick2, 16);
      }
    };
  },
  dispatch: function() {
    var listeners = {};
    var dispatch = {
      on: function(name, cb) {
        if (arguments.length > 1) { listeners[name] = cb; return dispatch; }
        return listeners[name];
      },
      call: function(name) { if (listeners[name]) listeners[name](); }
    };
    return dispatch;
  }
};

importScripts('force3d.js');

var sim = null;
var nodes = [];
var links = [];
var config = {};

function createSim() {
  sim = Force3D.forceSimulation([])
    .force('link', Force3D.forceLink([]).id(function(d) { return d.uid; })
      .distance(config.linkDistance || 80)
      .strength(config.linkStrength || 0.3))
    .force('charge', Force3D.forceManyBody()
      .strength(config.chargeStrength || -200)
      .distanceMax(config.chargeDistanceMax || 500))
    .force('center', Force3D.forceCenter(0, 0, 0))
    .force('collide', Force3D.forceCollide(config.collideRadius || 8))
    .on('tick', onTick)
    .on('end', onEnd);
  sim.stop();
}

function onTick() {
  var n = nodes.length;
  var buf = new Float64Array(n * 3);
  for (var i = 0; i < n; i++) {
    buf[i * 3]     = nodes[i].x || 0;
    buf[i * 3 + 1] = nodes[i].y || 0;
    buf[i * 3 + 2] = nodes[i].z || 0;
  }
  self.postMessage({type: 'tick', positions: buf}, [buf.buffer]);
}

function onEnd() {
  self.postMessage({type: 'end'});
}

self.onmessage = function(e) {
  var msg = e.data;
  switch (msg.type) {
    case 'init':
      config = msg.config || {};
      createSim();
      break;

    case 'setGraph':
      nodes = msg.nodes || [];
      links = msg.links || [];
      if (!sim) createSim();
      sim.nodes(nodes);
      sim.force('link').links(links);
      break;

    case 'restart':
      if (sim) sim.alpha(msg.alpha != null ? msg.alpha : 0.5).restart();
      break;

    case 'stop':
      if (sim) sim.stop();
      break;

    case 'alphaTarget':
      if (sim) sim.alphaTarget(msg.value);
      break;

    case 'fixNode':
      if (nodes[msg.index]) {
        nodes[msg.index].fx = msg.fx;
        nodes[msg.index].fy = msg.fy;
        nodes[msg.index].fz = msg.fz;
      }
      break;

    case 'fixNodes':
      if (msg.fixes) {
        for (var i = 0; i < msg.fixes.length; i++) {
          var f = msg.fixes[i];
          if (nodes[f.index]) {
            nodes[f.index].fx = f.fx;
            nodes[f.index].fy = f.fy;
            nodes[f.index].fz = f.fz;
          }
        }
      }
      break;
  }
};
