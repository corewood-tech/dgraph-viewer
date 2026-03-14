// ── Node modals ─────────────────────────────────────────────────────
var _modalCounter = 0;
var _activeModal = null; // the unpinned modal (replaced on next click)

function buildNodeInfoHTML(d) {
  var html = '';
  html += '<div class="prop-row"><span class="prop-key">uid</span><span class="prop-val">' + d.uid + '</span></div>';
  if (d.type) html += '<div class="prop-row"><span class="prop-key">dgraph.type</span><span class="prop-val">' + escHtml(d.type) + '</span></div>';
  for (var k in (d.props || {})) {
    if (k === 'uid' || k === 'dgraph.type') continue;
    var v = d.props[k];
    if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object' && v[0].uid) continue;
    if (v && typeof v === 'object' && v.uid) continue;
    html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + escHtml(JSON.stringify(v)) + '</span></div>';
  }
  var edges = [];
  graphLinks.forEach(function(l) {
    var sid = (typeof l.source === 'object') ? l.source.uid : l.source;
    var tid = (typeof l.target === 'object') ? l.target.uid : l.target;
    if (sid === d.uid) {
      var tgt = graphNodes.get(tid);
      edges.push({pred: l.predicate, uid: tid, label: tgt ? (tgt.label || tid) : tid});
    }
    if (tid === d.uid) {
      var src = graphNodes.get(sid);
      edges.push({pred: l.predicate, uid: sid, label: src ? (src.label || sid) : sid, inbound: true});
    }
  });
  if (edges.length > 0) {
    html += '<div class="edges-disclosure">';
    html += '<button class="edges-toggle" onclick="toggleEdges(this)">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    html += 'Edges (' + edges.length + ')</button>';
    html += '<div class="edges-list">';
    edges.forEach(function(e) {
      var arrow = e.inbound ? '&larr; ' : '&rarr; ';
      html += '<div class="edge-item"><span class="edge-pred">' + arrow + escHtml(e.pred) + '</span>';
      html += '<span class="edge-target" onclick="focusNode(\'' + e.uid + '\')">' + escHtml(e.label) + '</span></div>';
    });
    html += '</div></div>';
  }
  return html;
}

function createModal(d) {
  var id = 'node-modal-' + (++_modalCounter);
  var el = document.createElement('div');
  el.className = 'node-modal';
  el.id = id;
  el.dataset.uid = d.uid;
  // Position: bottom-right, stagger if pinned modals exist
  var pinnedCount = document.querySelectorAll('.node-modal.pinned').length;
  el.style.bottom = (24 + pinnedCount * 20) + 'px';
  el.style.right = (24 + pinnedCount * 20) + 'px';

  var title = d.label || d.uid;
  el.innerHTML =
    '<div class="modal-header">' +
      '<div class="modal-title-wrap"><h3>' + escHtml(title) + '</h3>' +
      '<a class="modal-flyto" onclick="focusNode(\'' + d.uid + '\')">fly to</a></div>' +
      '<button class="modal-btn collapse-btn" onclick="toggleCollapse(\'' + id + '\')" title="Collapse">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>' +
      '<button class="modal-btn pinned-btn" onclick="togglePin(\'' + id + '\')" title="Pin">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z"/></svg>' +
      '</button>' +
      '<button class="modal-btn" onclick="removeModal(\'' + id + '\')" title="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="modal-body">' + buildNodeInfoHTML(d) + '</div>';

  document.getElementById('node-modals').appendChild(el);
  makeDraggable(el);
  return el;
}

function showNodeInfo(d) {
  // If a modal for this node already exists, reuse it
  var existing = document.querySelector('.node-modal[data-uid="' + d.uid + '"]');
  if (existing) {
    if (existing.classList.contains('collapsed')) existing.classList.remove('collapsed');
    existing.style.zIndex = ++_modalZCounter;
    return;
  }
  // If there's an unpinned modal, replace it
  if (_activeModal && _activeModal.parentNode) {
    _activeModal.remove();
  }
  _activeModal = createModal(d);
  updateModalConnections();
}

var _modalZCounter = 200;

function togglePin(modalId) {
  var el = document.getElementById(modalId);
  if (!el) return;
  var btn = el.querySelector('.pinned-btn');
  var isPinned = el.classList.toggle('pinned');
  btn.classList.toggle('active', isPinned);
  if (isPinned && _activeModal === el) {
    _activeModal = null; // detach from active slot so it won't be replaced
  }
  updateModalConnections();
}

function removeModal(modalId) {
  var el = document.getElementById(modalId);
  if (!el) return;
  if (_activeModal === el) _activeModal = null;
  el.remove();
  updateModalConnections();
}

function closeAllModals() {
  document.querySelectorAll('.node-modal').forEach(function(m) { m.remove(); });
  _activeModal = null;
  updateModalConnections();
}

function toggleCollapse(modalId) {
  var el = document.getElementById(modalId);
  if (!el) return;
  var isCollapsed = el.classList.toggle('collapsed');
  var btn = el.querySelector('.collapse-btn svg');
  btn.style.transform = isCollapsed ? 'rotate(180deg)' : '';
}

function toggleEdges(btn) {
  btn.classList.toggle('open');
  btn.nextElementSibling.classList.toggle('open');
}

// ── Drag ────────────────────────────────────────────────────────────
function makeDraggable(el) {
  var header = el.querySelector('.modal-header');
  var ox, oy, sx, sy;
  header.addEventListener('mousedown', function(e) {
    if (e.target.closest('.modal-btn') || e.target.closest('.modal-flyto')) return; // don't drag from buttons or fly-to link
    e.preventDefault();
    el.style.zIndex = ++_modalZCounter;
    var rect = el.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY;
    sx = rect.left; sy = rect.top;
    // Switch from bottom/right to top/left positioning for drag
    el.style.left = sx + 'px'; el.style.top = sy + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    var dx = e.clientX - ox, dy = e.clientY - oy;
    el.style.left = (sx + dx) + 'px';
    el.style.top = (sy + dy) + 'px';
    updateModalConnections();
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

// ── Modal connection lines ─────────────────────────────────────────
function clipToRect(cx, cy, tx, ty, rect) {
  var dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return {x: cx, y: cy};
  var hw = rect.width / 2, hh = rect.height / 2;
  var mx = rect.left + hw, my = rect.top + hh;
  var scaleX = Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity;
  var scaleY = Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity;
  var t = Math.min(scaleX, scaleY);
  return {x: mx + dx * t, y: my + dy * t};
}

function updateModalConnections() {
  var svg = document.getElementById('modal-connections');
  var defs = svg.querySelector('defs');
  svg.innerHTML = '';
  if (defs) svg.appendChild(defs);
  var modals = document.querySelectorAll('.node-modal');
  if (modals.length < 2) return;

  // Build uid→modal rect map
  var modalMap = {};
  modals.forEach(function(m) {
    var uid = m.dataset.uid;
    if (uid) modalMap[uid] = m;
  });
  var uids = Object.keys(modalMap);
  if (uids.length < 2) return;

  // Collect all edges between open modals, grouped by modal pair
  var pairEdges = {};
  var drawn = new Set();
  graphLinks.forEach(function(l) {
    var sid = (typeof l.source === 'object') ? l.source.uid : l.source;
    var tid = (typeof l.target === 'object') ? l.target.uid : l.target;
    if (!modalMap[sid] || !modalMap[tid]) return;
    var dedupKey = sid + '|' + tid + '|' + l.predicate;
    if (drawn.has(dedupKey)) return;
    drawn.add(dedupKey);
    var pairKey = [sid, tid].sort().join('|');
    if (!pairEdges[pairKey]) pairEdges[pairKey] = [];
    pairEdges[pairKey].push({sid: sid, tid: tid, predicate: l.predicate});
  });

  // Draw each edge with offset when multiple edges share a pair
  Object.keys(pairEdges).forEach(function(pairKey) {
    var edges = pairEdges[pairKey];
    var count = edges.length;
    edges.forEach(function(edge, idx) {
    var r1 = modalMap[edge.sid].getBoundingClientRect();
    var r2 = modalMap[edge.tid].getBoundingClientRect();
    var cx1 = r1.left + r1.width / 2, cy1 = r1.top + r1.height / 2;
    var cx2 = r2.left + r2.width / 2, cy2 = r2.top + r2.height / 2;

    // Offset perpendicular to the line when multiple edges between same pair
    var offX = 0, offY = 0;
    if (count > 1) {
      var ldx = cx2 - cx1, ldy = cy2 - cy1;
      var len = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
      var nx = -ldy / len, ny = ldx / len;
      var spacing = 16;
      var shift = (idx - (count - 1) / 2) * spacing;
      offX = nx * shift; offY = ny * shift;
    }

    var p1 = clipToRect(cx1 + offX, cy1 + offY, cx2 + offX, cy2 + offY, r1);
    var p2 = clipToRect(cx2 + offX, cy2 + offY, cx1 + offX, cy1 + offY, r2);
    var x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;

    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('marker-end', 'url(#conn-arrow)');
    g.appendChild(line);

    // Label at midpoint
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    text.setAttribute('x', mx); text.setAttribute('y', my - 6);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = edge.predicate;
    g.appendChild(text);

    svg.appendChild(g);
    });
  });
}

function focusNode(uid) {
  var n = graphNodes.get(uid);
  if (n) {
    selectedNode = n;
    activeNode = n;
    showNodeInfo(n);
    if (viewMode === '3d' && controls) {
      controls._spinVel.theta = 0; controls._spinVel.phi = 0; controls._zoomVel = 0;
      var tx = n.x||0, ty = n.y||0, tz = n.z||0;
      var sx = controls.target.x, sy = controls.target.y, sz = controls.target.z;
      var sr = controls.spherical.radius, tr = Math.min(sr, 150);
      var duration = 600, start = performance.now();
      function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
      function flyStep(now) {
        var t = Math.min((now - start) / duration, 1);
        var e = ease(t);
        controls.target.set(sx + (tx-sx)*e, sy + (ty-sy)*e, sz + (tz-sz)*e);
        controls.spherical.radius = sr + (tr-sr)*e;
        controls._syncCamera();
        if (t < 1) requestAnimationFrame(flyStep);
      }
      requestAnimationFrame(flyStep);
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

// ── Legend ───────────────────────────────────────────────────────────
var GEO_NAMES = ['icosahedron','octahedron','dodecahedron','tetrahedron','cube','sphere','ico-smooth','octa-smooth'];
var GEO_SHAPES = ['polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)','polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)','circle(50%)','polygon(50% 0%, 100% 100%, 0% 100%)','none','circle(50%)','circle(50%)','polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'];

function updateLegend() {
  var types = new Set();
  graphNodes.forEach(function(n) { types.add(n.type || 'unknown'); });
  var legend = document.getElementById('legend');
  var colorFn = viewMode === '2d' ? typeColors2d : typeColor;
  legend.innerHTML = Array.from(types).sort().map(function(t) {
    var gi = GEOMETRIES.indexOf(typeGeometry(t));
    var shape = GEO_SHAPES[gi] || 'circle(50%)';
    var borderRadius = (gi === 4) ? '2px' : '0';
    var clipPath = shape === 'none' ? '' : 'clip-path:' + shape + ';';
    return '<div><span class="swatch" style="background:' + colorFn(t) + ';border-radius:' + borderRadius + ';' + clipPath + '"></span>' + escHtml(t) + '</div>';
  }).join('');
}

// ── User option toggles ─────────────────────────────────────────────
function toggleShapes() {
  useShapes = document.getElementById('opt-shapes').checked;
  if (graphNodes.size > 0) renderGraph();
}

function toggleScale() {
  scaleByConns = document.getElementById('opt-scale').checked;
  if (graphNodes.size > 0) renderGraph();
}

function toggleFocusMode() {
  focusMode = document.getElementById('opt-focus').checked;
  if (!focusMode) {
    focusedNode = null; focusRanks = null;
    if (viewMode === '3d') applyFocus3D();
    else applyFocus2D();
  }
}

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

// ── 3D teardown ─────────────────────────────────────────────────────
function teardown3D() {
  if (simulation) { simulation.stop(); simulation.terminate(); }
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

// ── 3D Init ─────────────────────────────────────────────────────────
function initGraph() {
  var container = document.getElementById('graph-container');
  var svgs = container.querySelectorAll(':scope > svg');
  svgs.forEach(function(s) { s.remove(); });
  var w = container.clientWidth, h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06150D);
  scene.fog = new THREE.FogExp2(0x06150D, 0.0004);

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

  scene.add(new THREE.AmbientLight(0x90a090, 1.2));
  var keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(200, 400, 300);
  scene.add(keyLight);
  var fillLight = new THREE.DirectionalLight(0x2D7A4A, 0.4);
  fillLight.position.set(-200, -100, -200);
  scene.add(fillLight);
  var rimLight = new THREE.PointLight(0x2A95C8, 0.6, 2000);
  rimLight.position.set(0, 300, -400);
  scene.add(rimLight);

  controls = new CesiumControls(camera, renderer.domElement);

  document.getElementById('hint-body-content').innerHTML =
    '<table>' +
    '<tr><th colspan="2" class="hint-section">Camera</th></tr>' +
    '<tr><td>Left-drag</td><td>Orbit</td></tr>' +
    '<tr><td>Shift + drag</td><td>Pan</td></tr>' +
    '<tr><td>Scroll</td><td>Zoom</td></tr>' +
    '<tr><td>Middle-drag</td><td>Tilt</td></tr>' +
    '<tr><td>Ctrl + drag</td><td>Free-look</td></tr>' +
    '<tr><th colspan="2" class="hint-section">Nodes</th></tr>' +
    '<tr><td>Click</td><td>Select node</td></tr>' +
    '<tr><td>Shift + drag node</td><td>Move node</td></tr>' +
    '<tr><td>&larr; / &rarr;</td><td>Move selected on X axis</td></tr>' +
    '<tr><td>&uarr; / &darr;</td><td>Move selected on Y axis</td></tr>' +
    '<tr><td>Shift + &uarr; / &darr;</td><td>Move selected on Z axis</td></tr>' +
    '</table>';

  simulation = new SimulationProxy('js/force3d-worker.js', {
    linkDistance: 80, linkStrength: 0.3,
    chargeStrength: -200, chargeDistanceMax: 500,
    collideRadius: 8
  });
  simulation.on('tick', onSimTick);

  var rcThrottle = 0;
  renderer.domElement.addEventListener('mousemove', function(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    var now = Date.now();
    if (now - rcThrottle > 40) { rcThrottle = now; doRaycast(); }
  });

  renderer.domElement.addEventListener('click', function(e) {
    if (controls.wasDragging) return;
    doRaycast();
    if (hoveredNode) {
      if (_algoNodeSelectInput) { algoFillNodeSelect(hoveredNode.uid); return; }
      selectedNode = hoveredNode; activeNode = hoveredNode; showNodeInfo(hoveredNode);
      handleFocusClick(hoveredNode);
    } else {
      selectedNode = null; activeNode = null;
      if (_activeModal && _activeModal.parentNode) { _activeModal.remove(); _activeModal = null; }
      if (focusMode) { focusedNode = null; focusRanks = null; applyFocus3D(); }
    }
  });
  window.addEventListener('resize', function() {
    var w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  initGizmo();
  animate();
}

// ── Mode Switching ──────────────────────────────────────────────────
function switchMode() {
  var newMode = viewMode === '3d' ? '2d' : '3d';
  if (viewMode === '3d') teardown3D();
  else teardown2D();

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
  if (highlightQuery) applyHighlightQuery();
}

// ── Depth stepper ──────────────────────────────────────────────────
function stepDepth(dir) {
  var input = document.getElementById('glow-depth');
  var val = Math.max(1, Math.min(20, (parseInt(input.value) || 5) + dir));
  input.value = val;
  glowDepth = val;
}

// ── Sidebar toggle ─────────────────────────────────────────────────
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  // trigger resize so the graph fills the space
  setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 320);
}

// ── Fullscreen ─────────────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}
document.addEventListener('fullscreenchange', function() {
  var btn = document.getElementById('fullscreen-toggle');
  btn.title = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
});

// ── Boot ────────────────────────────────────────────────────────────
loadConfig();
initGraph();

// Update connection lines when modals are resized
var _resizeObs = new ResizeObserver(function() { updateModalConnections(); });
_resizeObs.observe(document.getElementById('node-modals'));
