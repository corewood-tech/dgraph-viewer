// ── Data ingestion ──────────────────────────────────────────────────
function ingestNode(obj, px, py, pz) {
  if (!obj || !obj.uid) return;
  var type = Array.isArray(obj['dgraph.type']) ? obj['dgraph.type'][0] : obj['dgraph.type'];
  var label = obj.name || obj.title || obj.label || obj['dgraph.type'] || '';
  if (!graphNodes.has(obj.uid)) {
    graphNodes.set(obj.uid, {
      uid: obj.uid, label: Array.isArray(label) ? label[0] : label,
      type: type || 'unknown', props: obj,
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

// Get connected neighbors with BFS depth and strength falloff
// Returns Map of uid → {node, strength} where strength = 1 at depth 1, decays per hop
function getClusterNeighbors(uid, maxDepth) {
  maxDepth = maxDepth || 2;
  var adj = new Map();
  graphLinks.forEach(function(l) {
    var s = (typeof l.source === 'object') ? l.source.uid : l.source;
    var t = (typeof l.target === 'object') ? l.target.uid : l.target;
    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);
    adj.get(s).push(t);
    adj.get(t).push(s);
  });
  var result = new Map();
  var frontier = [uid];
  var visited = new Set([uid]);
  for (var depth = 1; depth <= maxDepth; depth++) {
    var next = [];
    frontier.forEach(function(id) {
      (adj.get(id) || []).forEach(function(nb) {
        if (!visited.has(nb)) {
          visited.add(nb);
          var n = graphNodes.get(nb);
          if (n) result.set(nb, {node: n, strength: Math.pow(0.5, depth)});
          next.push(nb);
        }
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  return result;
}

function addLink(src, tgt, pred) {
  var key = src + '|' + tgt + '|' + pred;
  if (linkSet.has(key)) return;
  linkSet.add(key);
  graphLinks.push({source: src, target: tgt, predicate: pred});
}
