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
