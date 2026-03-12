// ── Graph Algorithms ────────────────────────────────────────────────
// Client-side implementations operating on graphNodes / graphLinks.
// Each algorithm accepts a "working set" (nodes Map + links array)
// so it can run on the full graph or a focus subgraph.

var GraphAlgorithms = (function() {

  // Build adjacency from a links array. Returns Map<uid, uid[]>
  function buildAdj(links) {
    var adj = new Map();
    links.forEach(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      if (!adj.has(s)) adj.set(s, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(s).push(t);
      adj.get(t).push(s);
    });
    return adj;
  }

  // Build directed adjacency
  function buildDirAdj(links) {
    var outAdj = new Map(), inAdj = new Map();
    links.forEach(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      if (!outAdj.has(s)) outAdj.set(s, []);
      if (!outAdj.has(t)) outAdj.set(t, []);
      if (!inAdj.has(s)) inAdj.set(s, []);
      if (!inAdj.has(t)) inAdj.set(t, []);
      outAdj.get(s).push(t);
      inAdj.get(t).push(s);
    });
    return {out: outAdj, in: inAdj};
  }

  // BFS from a source, returns Map<uid, distance>
  function bfs(adj, source, maxDist) {
    var dist = new Map();
    dist.set(source, 0);
    var frontier = [source];
    var d = 0;
    while (frontier.length && (!maxDist || d < maxDist)) {
      d++;
      var next = [];
      frontier.forEach(function(u) {
        (adj.get(u) || []).forEach(function(v) {
          if (!dist.has(v)) { dist.set(v, d); next.push(v); }
        });
      });
      frontier = next;
    }
    return dist;
  }

  // ── Degree Centrality ────────────────────────────────────────────
  function degreeCentrality(nodes, links) {
    var n = nodes.size;
    if (n < 2) return new Map();
    var deg = new Map();
    nodes.forEach(function(_, uid) { deg.set(uid, 0); });
    links.forEach(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      if (deg.has(s)) deg.set(s, deg.get(s) + 1);
      if (deg.has(t)) deg.set(t, deg.get(t) + 1);
    });
    var scores = new Map();
    deg.forEach(function(d, uid) { scores.set(uid, d / (n - 1)); });
    return scores;
  }

  // ── PageRank ─────────────────────────────────────────────────────
  function pageRank(nodes, links, opts) {
    opts = opts || {};
    var damping = opts.damping || 0.85;
    var iterations = opts.iterations || 30;
    var n = nodes.size;
    if (n === 0) return new Map();

    var adj = buildAdj(links);
    var uids = [];
    nodes.forEach(function(_, uid) { uids.push(uid); });

    // Count outgoing edges per node
    var outDeg = new Map();
    uids.forEach(function(uid) { outDeg.set(uid, 0); });
    links.forEach(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      // Undirected: both directions
      if (outDeg.has(s)) outDeg.set(s, outDeg.get(s) + 1);
      if (outDeg.has(t)) outDeg.set(t, outDeg.get(t) + 1);
    });

    var pr = new Map();
    var initVal = 1 / n;
    uids.forEach(function(uid) { pr.set(uid, initVal); });

    for (var iter = 0; iter < iterations; iter++) {
      var newPr = new Map();
      var base = (1 - damping) / n;
      uids.forEach(function(uid) { newPr.set(uid, base); });

      uids.forEach(function(uid) {
        var neighbors = adj.get(uid) || [];
        var od = outDeg.get(uid) || 1;
        var share = damping * pr.get(uid) / od;
        neighbors.forEach(function(nb) {
          if (newPr.has(nb)) newPr.set(nb, newPr.get(nb) + share);
        });
      });
      pr = newPr;
    }
    return pr;
  }

  // ── Betweenness Centrality ───────────────────────────────────────
  function betweennessCentrality(nodes, links) {
    var n = nodes.size;
    if (n < 3) return new Map();
    var adj = buildAdj(links);
    var uids = [];
    nodes.forEach(function(_, uid) { uids.push(uid); });

    var cb = new Map();
    uids.forEach(function(uid) { cb.set(uid, 0); });

    uids.forEach(function(s) {
      var stack = [];
      var pred = new Map();
      var sigma = new Map();
      var dist = new Map();
      var delta = new Map();

      uids.forEach(function(uid) {
        pred.set(uid, []);
        sigma.set(uid, 0);
        dist.set(uid, -1);
        delta.set(uid, 0);
      });
      sigma.set(s, 1);
      dist.set(s, 0);

      var queue = [s];
      while (queue.length) {
        var v = queue.shift();
        stack.push(v);
        (adj.get(v) || []).forEach(function(w) {
          if (dist.get(w) < 0) {
            queue.push(w);
            dist.set(w, dist.get(v) + 1);
          }
          if (dist.get(w) === dist.get(v) + 1) {
            sigma.set(w, sigma.get(w) + sigma.get(v));
            pred.get(w).push(v);
          }
        });
      }

      while (stack.length) {
        var w = stack.pop();
        pred.get(w).forEach(function(v) {
          delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
        });
        if (w !== s) cb.set(w, cb.get(w) + delta.get(w));
      }
    });

    // Normalize for undirected graph
    var norm = (n - 1) * (n - 2);
    if (norm > 0) {
      cb.forEach(function(val, uid) { cb.set(uid, val / norm); });
    }
    return cb;
  }

  // ── Closeness Centrality ─────────────────────────────────────────
  function closenessCentrality(nodes, links) {
    var n = nodes.size;
    if (n < 2) return new Map();
    var adj = buildAdj(links);
    var scores = new Map();

    nodes.forEach(function(_, uid) {
      var dist = bfs(adj, uid);
      var totalDist = 0;
      var reachable = 0;
      dist.forEach(function(d, v) {
        if (v !== uid && d > 0) { totalDist += d; reachable++; }
      });
      scores.set(uid, reachable > 0 ? reachable / totalDist : 0);
    });
    return scores;
  }

  // ── K-Core Decomposition ─────────────────────────────────────────
  function kCore(nodes, links, k) {
    // Returns set of UIDs in the k-core
    var nodeSet = new Set();
    nodes.forEach(function(_, uid) { nodeSet.add(uid); });

    var changed = true;
    while (changed) {
      changed = false;
      var deg = new Map();
      nodeSet.forEach(function(uid) { deg.set(uid, 0); });
      links.forEach(function(l) {
        var s = l.source.uid || l.source, t = l.target.uid || l.target;
        if (nodeSet.has(s) && nodeSet.has(t)) {
          deg.set(s, deg.get(s) + 1);
          deg.set(t, deg.get(t) + 1);
        }
      });
      deg.forEach(function(d, uid) {
        if (d < k) { nodeSet.delete(uid); changed = true; }
      });
    }
    return nodeSet;
  }

  // ── Connected Components ─────────────────────────────────────────
  function connectedComponents(nodes, links) {
    var adj = buildAdj(links);
    var visited = new Set();
    var components = [];

    nodes.forEach(function(_, uid) {
      if (visited.has(uid)) return;
      var component = new Set();
      var queue = [uid];
      visited.add(uid);
      while (queue.length) {
        var v = queue.shift();
        component.add(v);
        (adj.get(v) || []).forEach(function(nb) {
          if (!visited.has(nb) && nodes.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        });
      }
      components.push(component);
    });
    // Sort by size descending
    components.sort(function(a, b) { return b.size - a.size; });
    return components;
  }

  // ── Shortest Path ────────────────────────────────────────────────
  function shortestPath(nodes, links, sourceUid, targetUid) {
    var adj = buildAdj(links);
    var prev = new Map();
    prev.set(sourceUid, null);
    var queue = [sourceUid];
    while (queue.length) {
      var v = queue.shift();
      if (v === targetUid) break;
      (adj.get(v) || []).forEach(function(nb) {
        if (!prev.has(nb) && nodes.has(nb)) {
          prev.set(nb, v);
          queue.push(nb);
        }
      });
    }
    if (!prev.has(targetUid)) return null;
    var path = [];
    var cur = targetUid;
    while (cur !== null) {
      path.unshift(cur);
      cur = prev.get(cur);
    }
    return path;
  }

  // ── Ego Network ──────────────────────────────────────────────────
  function egoNetwork(nodes, links, centerUid, radius) {
    radius = radius || 1;
    var adj = buildAdj(links);
    var dist = bfs(adj, centerUid, radius);
    var result = new Set();
    dist.forEach(function(d, uid) {
      if (nodes.has(uid)) result.add(uid);
    });
    return result;
  }

  // ── Community Detection (Label Propagation) ──────────────────────
  function communityDetection(nodes, links, iterations) {
    iterations = iterations || 20;
    var adj = buildAdj(links);
    var labels = new Map();
    var i = 0;
    nodes.forEach(function(_, uid) { labels.set(uid, i++); });

    var uids = [];
    nodes.forEach(function(_, uid) { uids.push(uid); });

    for (var iter = 0; iter < iterations; iter++) {
      // Shuffle order
      for (var j = uids.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = uids[j]; uids[j] = uids[k]; uids[k] = tmp;
      }
      var changed = false;
      uids.forEach(function(uid) {
        var neighbors = (adj.get(uid) || []).filter(function(nb) { return nodes.has(nb); });
        if (!neighbors.length) return;
        // Count label frequencies
        var counts = {};
        neighbors.forEach(function(nb) {
          var lbl = labels.get(nb);
          counts[lbl] = (counts[lbl] || 0) + 1;
        });
        // Find max
        var maxCount = 0, maxLabel = labels.get(uid);
        for (var lbl in counts) {
          if (counts[lbl] > maxCount) { maxCount = counts[lbl]; maxLabel = parseInt(lbl); }
        }
        if (labels.get(uid) !== maxLabel) { labels.set(uid, maxLabel); changed = true; }
      });
      if (!changed) break;
    }

    // Group by community
    var communities = {};
    labels.forEach(function(lbl, uid) {
      if (!communities[lbl]) communities[lbl] = new Set();
      communities[lbl].add(uid);
    });
    // Return as array of Sets, sorted by size
    var result = Object.values(communities);
    result.sort(function(a, b) { return b.size - a.size; });
    return result;
  }

  // ── Multi-Topic Distance ─────────────────────────────────────────
  function multiTopicDistance(nodes, links, seedUids, maxDistance) {
    var adj = buildAdj(links);
    var distances = seedUids.map(function(seed) { return bfs(adj, seed); });

    var scores = new Map();
    nodes.forEach(function(_, uid) {
      var totalDist = 0;
      var reachable = true;
      for (var i = 0; i < distances.length; i++) {
        if (!distances[i].has(uid)) { reachable = false; break; }
        totalDist += distances[i].get(uid);
      }
      if (reachable) {
        var mean = totalDist / distances.length;
        if (!maxDistance || mean <= maxDistance) {
          scores.set(uid, mean);
        }
      }
    });
    return scores;
  }

  // ── HITS (Hubs & Authorities) ────────────────────────────────────
  function hits(nodes, links, iterations) {
    iterations = iterations || 20;
    var uids = [];
    nodes.forEach(function(_, uid) { uids.push(uid); });
    var n = uids.length;
    if (n === 0) return {hubs: new Map(), authorities: new Map()};

    var adj = buildAdj(links);
    var auth = new Map(), hub = new Map();
    uids.forEach(function(uid) { auth.set(uid, 1); hub.set(uid, 1); });

    for (var iter = 0; iter < iterations; iter++) {
      // Update authority scores
      var newAuth = new Map();
      uids.forEach(function(uid) {
        var score = 0;
        (adj.get(uid) || []).forEach(function(nb) {
          if (hub.has(nb)) score += hub.get(nb);
        });
        newAuth.set(uid, score);
      });
      // Normalize
      var maxAuth = 0;
      newAuth.forEach(function(v) { if (v > maxAuth) maxAuth = v; });
      if (maxAuth > 0) newAuth.forEach(function(v, uid) { newAuth.set(uid, v / maxAuth); });
      auth = newAuth;

      // Update hub scores
      var newHub = new Map();
      uids.forEach(function(uid) {
        var score = 0;
        (adj.get(uid) || []).forEach(function(nb) {
          if (auth.has(nb)) score += auth.get(nb);
        });
        newHub.set(uid, score);
      });
      var maxHub = 0;
      newHub.forEach(function(v) { if (v > maxHub) maxHub = v; });
      if (maxHub > 0) newHub.forEach(function(v, uid) { newHub.set(uid, v / maxHub); });
      hub = newHub;
    }
    return {hubs: hub, authorities: auth};
  }

  // ── Network Density ──────────────────────────────────────────────
  function density(nodes, links) {
    var n = nodes.size;
    if (n < 2) return 0;
    var edgeCount = 0;
    links.forEach(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      if (nodes.has(s) && nodes.has(t)) edgeCount++;
    });
    return 2 * edgeCount / (n * (n - 1));
  }

  // ── Utility: get working set from current state ──────────────────
  function getWorkingSet() {
    // If focus mode is active and a node is focused, use that subgraph
    if (focusMode && focusRanks) {
      var subNodes = new Map();
      focusRanks.forEach(function(rank, uid) {
        var n = graphNodes.get(uid);
        if (n) subNodes.set(uid, n);
      });
      var subLinks = graphLinks.filter(function(l) {
        var s = l.source.uid || l.source, t = l.target.uid || l.target;
        return subNodes.has(s) && subNodes.has(t);
      });
      return {nodes: subNodes, links: subLinks};
    }
    return {nodes: graphNodes, links: graphLinks};
  }

  // ── Filter by type ───────────────────────────────────────────────
  function filterByType(nodes, links, types) {
    if (!types || !types.length) return {nodes: nodes, links: links};
    var typeSet = new Set(types);
    var filtered = new Map();
    nodes.forEach(function(n, uid) {
      if (typeSet.has(n.type || 'unknown')) filtered.set(uid, n);
    });
    var filteredLinks = links.filter(function(l) {
      var s = l.source.uid || l.source, t = l.target.uid || l.target;
      return filtered.has(s) && filtered.has(t);
    });
    return {nodes: filtered, links: filteredLinks};
  }

  return {
    buildAdj: buildAdj,
    bfs: bfs,
    degreeCentrality: degreeCentrality,
    pageRank: pageRank,
    betweennessCentrality: betweennessCentrality,
    closenessCentrality: closenessCentrality,
    kCore: kCore,
    connectedComponents: connectedComponents,
    shortestPath: shortestPath,
    egoNetwork: egoNetwork,
    communityDetection: communityDetection,
    multiTopicDistance: multiTopicDistance,
    hits: hits,
    density: density,
    getWorkingSet: getWorkingSet,
    filterByType: filterByType
  };
})();
