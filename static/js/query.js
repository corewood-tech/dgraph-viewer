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
