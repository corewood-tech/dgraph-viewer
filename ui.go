package main

const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dgraph Viewer</title>
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

#node-info {
  flex: 1; overflow-y: auto; padding: 16px; font-size: 12px;
}
#node-info h3 { color: #58a6ff; margin-bottom: 8px; font-size: 13px; }
.prop-row { display: flex; padding: 4px 0; border-bottom: 1px solid #1c2128; }
.prop-key { color: #7ee787; min-width: 100px; margin-right: 8px; }
.prop-val { color: #c9d1d9; word-break: break-all; }
.edge-link {
  color: #58a6ff; cursor: pointer; text-decoration: underline;
}
.edge-link:hover { color: #79c0ff; }

#graph-container { flex: 1; position: relative; }
svg { width: 100%; height: 100%; }

.node circle { cursor: pointer; stroke: none; transition: r 0.2s; }
.node text { font-size: 10px; fill: #8b949e; pointer-events: none; user-select: none; opacity: 0; }

.link { stroke-opacity: 0.4; fill: none; stroke-width: 1.5px; }
.link-label { font-size: 8px; fill: #484f58; pointer-events: none; user-select: none; }

.node.glow-0 circle { filter: drop-shadow(0 0 8px rgba(88,166,255,0.9)) brightness(1.6); }
.node.glow-0 text { opacity: 1; fill: #fff; }
.node.glow-1 circle { filter: drop-shadow(0 0 6px rgba(88,166,255,0.7)) brightness(1.4); }
.node.glow-1 text { opacity: 0.9; }
.node.glow-2 circle { filter: drop-shadow(0 0 4px rgba(88,166,255,0.5)) brightness(1.25); }
.node.glow-2 text { opacity: 0.7; }
.node.glow-3 circle { filter: drop-shadow(0 0 2px rgba(88,166,255,0.3)) brightness(1.1); }
.node.glow-3 text { opacity: 0.5; }
.node.glow-4 circle { filter: brightness(1.0); }
.node.glow-4 text { opacity: 0.35; }
.node.dimmed circle { opacity: 0.12; }
.node.dimmed text { opacity: 0.08; }
.link.dimmed { stroke-opacity: 0.03; stroke-width: 0.5px !important; }

#legend {
  position: absolute; bottom: 16px; right: 16px; background: #161b22ee;
  border: 1px solid #30363d; border-radius: 6px; padding: 12px; font-size: 11px;
  max-height: 200px; overflow-y: auto;
}
#legend div { display: flex; align-items: center; gap: 6px; margin: 2px 0; }
#legend .swatch { width: 10px; height: 10px; border-radius: 50%; }

#tooltip {
  position: absolute; pointer-events: none; background: #1c2128ee; border: 1px solid #30363d;
  border-radius: 4px; padding: 6px 10px; font-size: 11px; display: none; z-index: 20;
  max-width: 300px;
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
          <button class="btn" onclick="loadSchema()">Schema</button>
        </div>
        <div class="addr-row">
          <label>Depth</label>
          <input id="glow-depth" type="number" min="1" max="20" value="5" style="width:50px; background:#0d1117; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; padding:6px 8px; font-family:inherit; font-size:12px; text-align:center;" />
        </div>
      </div>
    </div>
    <div id="status">Ready</div>
    <div id="node-info">
      <p style="color:#484f58">Click a node to inspect. Click to expand edges.</p>
    </div>
  </div>
  <div id="graph-container">
    <svg></svg>
    <div id="legend"></div>
    <div id="tooltip"></div>
  </div>
</div>

<script>
// ── State ──
const nodes = new Map();   // uid -> {uid, label, type, props, expanded}
const links = [];           // {source, target, predicate}
const linkSet = new Set();  // "src|tgt|pred"
let simulation, svg, g, linkG, nodeG, labelG, zoom;
let selectedNode = null;
let glowDepth = 5;

const typeColors = d3.scaleOrdinal(d3.schemeTableau10);

// ── Init SVG ──
function initGraph() {
  svg = d3.select('svg');
  const rect = document.getElementById('graph-container').getBoundingClientRect();

  zoom = d3.zoom().scaleExtent([0.1, 8]).on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  g = svg.append('g');
  linkG = g.append('g').attr('class', 'links');
  labelG = g.append('g').attr('class', 'link-labels');
  nodeG = g.append('g').attr('class', 'nodes');

  simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.uid).distance(100).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    .force('center', d3.forceCenter(rect.width / 2, rect.height / 2))
    .force('collision', d3.forceCollide(30))
    .force('x', d3.forceX(rect.width / 2).strength(0.02))
    .force('y', d3.forceY(rect.height / 2).strength(0.02))
    .on('tick', ticked);

  simulation.stop();
}

// ── Render ──
function render() {
  const nodeArr = Array.from(nodes.values());

  // Links
  const linkSel = linkG.selectAll('line').data(links, d => d.source.uid || d.source + '|' + (d.target.uid || d.target) + '|' + d.predicate);
  linkSel.exit().remove();
  linkSel.enter().append('line')
    .attr('class', 'link')
    .attr('stroke-width', 1.5);

  // Link labels
  const llSel = labelG.selectAll('text').data(links, d => d.source.uid || d.source + '|' + (d.target.uid || d.target) + '|' + d.predicate);
  llSel.exit().remove();
  llSel.enter().append('text')
    .attr('class', 'link-label')
    .text(d => d.predicate);

  // Nodes
  const nodeSel = nodeG.selectAll('g.node').data(nodeArr, d => d.uid);
  nodeSel.exit().remove();

  const enter = nodeSel.enter().append('g')
    .attr('class', d => 'node ' + (d.expanded ? 'expanded' : 'unexpanded'))
    .call(drag(simulation))
    .on('click', (e, d) => onNodeClick(e, d))
    .on('dblclick', (e, d) => expandNode(d))
    .on('mouseenter', (e, d) => highlightConnections(d))
    .on('mouseleave', () => clearHighlight());

  enter.append('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => typeColors(d.type || 'unknown'));

  enter.append('text')
    .attr('dx', 14).attr('dy', 4)
    .text(d => d.label || d.uid);

  // Update existing
  nodeG.selectAll('g.node')
    .attr('class', d => 'node ' + (d.expanded ? 'expanded' : 'unexpanded'))
    .select('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => typeColors(d.type || 'unknown'));

  // Color links by source node type
  linkG.selectAll('line').attr('stroke', d => {
    const src = typeof d.source === 'object' ? d.source : nodes.get(d.source);
    return src ? typeColors(src.type || 'unknown') : '#30363d';
  });

  simulation.nodes(nodeArr);
  simulation.force('link').links(links);
  simulation.alpha(0.5).restart();

  updateLegend();
}

function nodeRadius(d) {
  const conns = links.filter(l => (l.source.uid || l.source) === d.uid || (l.target.uid || l.target) === d.uid).length;
  return Math.max(6, Math.min(20, 6 + conns * 1.5));
}

function ticked() {
  linkG.selectAll('line')
    .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

  labelG.selectAll('text')
    .attr('x', d => (d.source.x + d.target.x) / 2)
    .attr('y', d => (d.source.y + d.target.y) / 2);

  nodeG.selectAll('g.node')
    .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
}

function drag(sim) {
  return d3.drag()
    .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
}

// ── Highlight ──
function highlightConnections(d) {
  // Build adjacency list
  const adj = new Map();
  links.forEach(l => {
    const sid = l.source.uid || l.source;
    const tid = l.target.uid || l.target;
    if (!adj.has(sid)) adj.set(sid, []);
    if (!adj.has(tid)) adj.set(tid, []);
    adj.get(sid).push(tid);
    adj.get(tid).push(sid);
  });

  // BFS to get rank (distance) from selected node, up to 5
  const maxRank = glowDepth - 1;

  const ranks = new Map(); // uid -> rank (0 = selected, 1 = direct, etc.)
  ranks.set(d.uid, 0);
  let frontier = [d.uid];
  for (let rank = 1; rank <= maxRank; rank++) {
    const next = [];
    frontier.forEach(uid => {
      (adj.get(uid) || []).forEach(neighbor => {
        if (!ranks.has(neighbor)) {
          ranks.set(neighbor, rank);
          next.push(neighbor);
        }
      });
    });
    frontier = next;
    if (frontier.length === 0) break;
  }

  // Apply glow classes and label visibility to nodes
  nodeG.selectAll('g.node').each(function(n) {
    const el = d3.select(this);
    for (let i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false);

    if (ranks.has(n.uid)) {
      const r = ranks.get(n.uid);
      const glowClass = Math.min(r, 4);
      el.classed('glow-' + glowClass, true);
      // Show labels for nodes in the highlight chain
      el.select('text').style('opacity', r <= maxRank ? Math.max(0.3, 1 - r * 0.15) : 0);
    } else {
      el.classed('dimmed', true);
      el.select('text').style('opacity', 0);
    }
  });

  // Highlight edges — width thins with distance, color stays as source node
  linkG.selectAll('line').each(function(l) {
    const el = d3.select(this);
    const sid = l.source.uid || l.source;
    const tid = l.target.uid || l.target;
    el.classed('dimmed', false);

    if (ranks.has(sid) && ranks.has(tid)) {
      const edgeRank = Math.max(ranks.get(sid), ranks.get(tid));
      const t = Math.min(edgeRank / maxRank, 1);
      el.attr('stroke-width', 3.5 - t * 3.0);
      el.attr('stroke-opacity', 1.0 - t * 0.8);
    } else {
      el.classed('dimmed', true);
    }
  });
}

function clearHighlight() {
  nodeG.selectAll('g.node').each(function() {
    const el = d3.select(this);
    for (let i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false);
    el.select('text').style('opacity', 0);
  });
  linkG.selectAll('line')
    .classed('dimmed', false)
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.4);
}

// ── Node click / expand ──
function onNodeClick(e, d) {
  e.stopPropagation();
  selectedNode = d;
  showNodeInfo(d);
}

function showNodeInfo(d) {
  const info = document.getElementById('node-info');
  let html = '<h3>' + escHtml(d.label || d.uid) + '</h3>';
  html += '<div class="prop-row"><span class="prop-key">uid</span><span class="prop-val">' + d.uid + '</span></div>';
  if (d.type) html += '<div class="prop-row"><span class="prop-key">dgraph.type</span><span class="prop-val">' + escHtml(d.type) + '</span></div>';

  for (const [k, v] of Object.entries(d.props || {})) {
    if (k === 'uid' || k === 'dgraph.type') continue;
    if (Array.isArray(v) && v.length > 0 && v[0] && v[0].uid) {
      const items = v.map(e => '<span class="edge-link" onclick="focusNode(\'' + e.uid + '\')">' + (e['dgraph.type'] ? e['dgraph.type'] + ':' : '') + e.uid + '</span>').join(', ');
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + items + '</span></div>';
    } else {
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + escHtml(JSON.stringify(v)) + '</span></div>';
    }
  }

  if (!d.expanded) {
    html += '<br><button class="btn btn-primary" onclick="expandNode(nodes.get(\'' + d.uid + '\'))">Expand edges</button>';
  }
  info.innerHTML = html;
}

function focusNode(uid) {
  const n = nodes.get(uid);
  if (n) { onNodeClick({stopPropagation:()=>{}}, n); }
}

async function expandNode(d) {
  if (d.expanded) return;
  setStatus('Expanding ' + d.uid + '...');

  const query = '{ node(func: uid(' + d.uid + ')) { uid expand(_all_) { uid dgraph.type expand(_all_) } } }';
  try {
    const resp = await fetch('/api/query', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query})
    });
    const data = await resp.json();
    if (data.data && data.data.node) {
      data.data.node.forEach(n => ingestNode(n, d.x, d.y));
    }
    d.expanded = true;
    render();
    setStatus('Expanded ' + d.uid);
    if (selectedNode && selectedNode.uid === d.uid) showNodeInfo(d);
  } catch(e) {
    setStatus('Error: ' + e.message);
  }
}

// ── Data ingestion ──
function ingestNode(obj, px, py) {
  if (!obj || !obj.uid) return;

  const type = Array.isArray(obj['dgraph.type']) ? obj['dgraph.type'][0] : obj['dgraph.type'];
  const label = obj.name || obj.title || obj.label || obj['dgraph.type'] || '';

  if (!nodes.has(obj.uid)) {
    nodes.set(obj.uid, {
      uid: obj.uid,
      label: Array.isArray(label) ? label[0] : label,
      type: type || 'unknown',
      props: obj,
      expanded: false,
      x: px ? px + (Math.random()-0.5)*60 : undefined,
      y: py ? py + (Math.random()-0.5)*60 : undefined,
    });
  } else {
    const existing = nodes.get(obj.uid);
    existing.props = {...existing.props, ...obj};
    if (!existing.label && label) existing.label = Array.isArray(label) ? label[0] : label;
    if ((!existing.type || existing.type === 'unknown') && type) existing.type = type;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key === 'uid' || key === 'dgraph.type') continue;
    if (Array.isArray(val)) {
      val.forEach(item => {
        if (item && typeof item === 'object' && item.uid) {
          ingestNode(item, px, py);
          addLink(obj.uid, item.uid, key);
        }
      });
    } else if (val && typeof val === 'object' && val.uid) {
      ingestNode(val, px, py);
      addLink(obj.uid, val.uid, key);
    }
  }
}

function addLink(src, tgt, pred) {
  const key = src + '|' + tgt + '|' + pred;
  if (linkSet.has(key)) return;
  linkSet.add(key);
  links.push({source: src, target: tgt, predicate: pred});
}

// ── Query execution ──
async function runQuery() {
  const query = document.getElementById('query-input').value.trim();
  if (!query) return;

  setStatus('Running query...');
  try {
    const resp = await fetch('/api/query', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query})
    });
    if (!resp.ok) {
      const text = await resp.text();
      setStatus('Error: ' + text);
      return;
    }
    const data = await resp.json();

    if (data.errors) {
      setStatus('Error: ' + data.errors.map(e => e.message).join('; '));
      return;
    }

    let count = 0;
    if (data.data) {
      for (const [, arr] of Object.entries(data.data)) {
        if (Array.isArray(arr)) {
          arr.forEach(obj => { ingestNode(obj); count++; });
        }
      }
    }

    render();
    setStatus('Loaded ' + count + ' root nodes, ' + nodes.size + ' total, ' + links.length + ' edges');
  } catch(e) {
    setStatus('Error: ' + e.message);
  }
}

function runAll() {
  document.getElementById('query-input').value = '{\n  all(func: has(dgraph.type)) {\n    uid\n    dgraph.type\n    expand(_all_) {\n      uid\n      dgraph.type\n      expand(_all_)\n    }\n  }\n}';
  runQuery();
}

function clearGraph() {
  nodes.clear();
  links.length = 0;
  linkSet.clear();
  selectedNode = null;
  simulation.stop();
  linkG.selectAll('*').remove();
  labelG.selectAll('*').remove();
  nodeG.selectAll('*').remove();
  document.getElementById('node-info').innerHTML = '<p style="color:#484f58">Click a node to inspect. Double-click to expand.</p>';
  document.getElementById('legend').innerHTML = '';
  setStatus('Cleared');
}

async function loadSchema() {
  setStatus('Loading schema...');
  try {
    const resp = await fetch('/api/schema');
    const data = await resp.json();
    const info = document.getElementById('node-info');
    let html = '<h3>Schema</h3>';
    if (data.data && data.data.schema) {
      data.data.schema.forEach(s => {
        html += '<div class="prop-row"><span class="prop-key">' + escHtml(s.predicate) + '</span><span class="prop-val">' + escHtml(s.type || '') + (s.list ? ' [list]' : '') + (s.index ? ' @index(' + s.tokenizer.join(',') + ')' : '') + '</span></div>';
      });
    }
    info.innerHTML = html;
    setStatus('Schema loaded');
  } catch(e) {
    setStatus('Error: ' + e.message);
  }
}

// ── Legend ──
function updateLegend() {
  const types = new Set();
  nodes.forEach(n => types.add(n.type || 'unknown'));
  const legend = document.getElementById('legend');
  legend.innerHTML = Array.from(types).sort().map(t =>
    '<div><span class="swatch" style="background:' + typeColors(t) + '"></span>' + escHtml(t) + '</div>'
  ).join('');
}

// ── Helpers ──
function setStatus(msg) { document.getElementById('status').textContent = msg; }
function escHtml(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

// ── Keyboard shortcut ──
document.getElementById('query-input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
});

// ── Dgraph address ──
async function loadConfig() {
  try {
    const resp = await fetch('/api/config');
    const data = await resp.json();
    document.getElementById('dgraph-addr').value = data.dgraph || '';
    lastSentAddr = data.dgraph || '';
  } catch(e) { /* ignore */ }
}

async function disconnectDgraph() {
  await fetch('/api/disconnect', {method: 'POST'});
  setStatus('Disconnected');
}

async function connectDgraph(addr) {
  const resp = await fetch('/api/config', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dgraph: addr})
  });
  if (resp.ok) {
    const data = await resp.json();
    setStatus('Connected to ' + data.dgraph);
  } else {
    setStatus('Failed to connect');
  }
}

document.getElementById('dgraph-addr').addEventListener('input', async function() {
  await disconnectDgraph();
  const addr = this.value.trim();
  if (addr) await connectDgraph(addr);
});

// ── Depth control ──
document.getElementById('glow-depth').addEventListener('change', function() {
  glowDepth = Math.max(1, Math.min(20, parseInt(this.value) || 5));
  this.value = glowDepth;
});

// ── Init ──
loadConfig();
initGraph();
</script>
</body>
</html>`
