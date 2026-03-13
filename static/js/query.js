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
  clearHighlightQuery();
  if (viewMode === '3d') { if (simulation) simulation.stop(); rebuildScene(); }
  else { if (sim2d) sim2d.stop(); if (linkG2d) linkG2d.selectAll('*').remove(); if (labelG2d) labelG2d.selectAll('*').remove(); if (nodeG2d) nodeG2d.selectAll('*').remove(); }
  closeAllModals();
  document.getElementById('legend').innerHTML = '';
  setStatus('Cleared');
}

async function loadSchema() {
  setStatus('Loading schema...');
  try {
    var resp = await fetch('/api/schema');
    var data = await resp.json();
    var panel = document.getElementById('schema-panel');
    var html = '<div class="schema-header"><h3>Schema</h3><button class="schema-close" onclick="clearSchema()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    html += '<div class="schema-body">';
    if (data.data && data.data.schema) {
      data.data.schema.forEach(function(s) {
        html += '<div class="prop-row"><span class="prop-key">' + escHtml(s.predicate) + '</span><span class="prop-val">' + escHtml(s.type || '') + (s.list ? ' [list]' : '') + (s.index ? ' @index(' + s.tokenizer.join(',') + ')' : '') + '</span></div>';
      });
    }
    html += '</div>';
    panel.innerHTML = html;
    setStatus('Schema loaded');
  } catch(e) { setStatus('Error: ' + e.message); }
}

function clearSchema() {
  document.getElementById('schema-panel').innerHTML = '';
}

// ── DQL Algorithm Queries ───────────────────────────────────────────
var _lastDQLRootUids = null;

function runDQLAlgorithm(dql, callback) {
  setStatus('Running DQL algorithm...');
  fetch('/api/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query: dql})})
    .then(function(resp) {
      if (!resp.ok) return resp.text().then(function(t) { throw new Error(t); });
      return resp.json();
    })
    .then(function(data) {
      if (data.errors) { setStatus('DQL Error: ' + data.errors.map(function(e){return e.message}).join('; ')); return; }
      var ingested = new Set();
      var rootUids = new Set();
      if (data.data) {
        for (var k in data.data) {
          var arr = data.data[k];
          if (Array.isArray(arr)) {
            arr.forEach(function(obj) {
              ingestNode(obj);
              if (obj.uid) { ingested.add(obj.uid); rootUids.add(obj.uid); }
              // Also collect nested UIDs
              for (var prop in obj) {
                if (prop === 'uid' || prop === 'dgraph.type') continue;
                var val = obj[prop];
                if (Array.isArray(val)) val.forEach(function(item) { if (item && item.uid) ingested.add(item.uid); });
                else if (val && typeof val === 'object' && val.uid) ingested.add(val.uid);
              }
            });
          }
        }
      }
      _lastDQLRootUids = rootUids;
      renderGraph();
      setStatus('DQL algorithm returned ' + ingested.size + ' nodes');
      if (callback) callback(ingested);
    })
    .catch(function(e) { setStatus('DQL Error: ' + e.message); });
}

function fetchUidPredicates(callback) {
  fetch('/api/schema')
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      var preds = [];
      if (data.data && data.data.schema) {
        data.data.schema.forEach(function(s) {
          if (s.type === 'uid') preds.push({predicate: s.predicate, reverse: !!s.reverse});
        });
      }
      callback(preds);
    })
    .catch(function() { callback([]); });
}

function runDQLShortestPath(sourceUid, targetUid) {
  setStatus('Fetching schema for shortest path...');
  fetchUidPredicates(function(preds) {
    if (preds.length === 0) {
      showAlgoResult('No uid predicates found in schema');
      return;
    }
    // Include forward predicates + reverse (~pred) for predicates with @reverse
    var lines = [];
    preds.forEach(function(p) {
      lines.push('    ' + p.predicate);
      if (p.reverse) lines.push('    ~' + p.predicate);
    });
    var predLines = lines.join('\n');
    var dql = '{\n  path as shortest(from: ' + sourceUid + ', to: ' + targetUid + ') {\n' + predLines + '\n  }\n  path(func: uid(path)) {\n    uid\n    dgraph.type\n  }\n}';
    setStatus('Running DQL shortest path...');
    fetch('/api/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query: dql})})
      .then(function(resp) {
        if (!resp.ok) return resp.text().then(function(t) { throw new Error(t); });
        return resp.json();
      })
      .then(function(data) {
        if (data.errors) { showAlgoResult('DQL Error: ' + data.errors.map(function(e){return e.message}).join('; ')); return; }
        var pathUids = [];
        if (data.data && data.data.path && Array.isArray(data.data.path)) {
          data.data.path.forEach(function(obj) {
            if (obj.uid) pathUids.push(obj.uid);
          });
        }
        if (pathUids.length === 0) {
          showAlgoResult('No path found via DQL');
          return;
        }
        var pathSet = new Set(pathUids);
        var scores = new Map();
        pathUids.forEach(function(uid, idx) { scores.set(uid, idx); });
        highlightQuery = {scores: scores, nodeSet: pathSet, mode: 'path', label: 'DQL Shortest Path (' + pathUids.length + ' nodes)'};
        applyHighlightQuery();
        showAlgoResultSummary(highlightQuery);
        setStatus('DQL shortest path: ' + pathUids.length + ' nodes');
      })
      .catch(function(e) { showAlgoResult('DQL Error: ' + e.message); });
  });
}

function runDQLEgoNetwork(centerUid, radius) {
  var dql = '{\n  ego(func: uid(' + centerUid + ')) @recurse(depth: ' + radius + ') {\n    uid\n    dgraph.type\n    expand(_all_)\n  }\n}';
  runDQLAlgorithm(dql, function(uids) {
    if (uids.size === 0) {
      showAlgoResult('No results from DQL ego query');
      return;
    }
    highlightQuery = {nodeSet: uids, mode: 'binary', label: 'DQL Ego Network (' + uids.size + ' nodes)', scores: new Map()};
    uids.forEach(function(uid) { highlightQuery.scores.set(uid, 1); });
    applyHighlightQuery();
    showAlgoResultSummary(highlightQuery);
  });
}
