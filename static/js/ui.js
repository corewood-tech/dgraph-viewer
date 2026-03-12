// ── Sidebar: Node info ──────────────────────────────────────────────
function showNodeInfo(d) {
  var info = document.getElementById('node-info');
  var html = '<h3>' + escHtml(d.label || d.uid) + '</h3>';
  html += '<div class="prop-row"><span class="prop-key">uid</span><span class="prop-val">' + d.uid + '</span></div>';
  if (d.type) html += '<div class="prop-row"><span class="prop-key">dgraph.type</span><span class="prop-val">' + escHtml(d.type) + '</span></div>';
  for (var k in (d.props || {})) {
    if (k === 'uid' || k === 'dgraph.type') continue;
    var v = d.props[k];
    if (Array.isArray(v) && v.length > 0 && v[0] && v[0].uid) {
      var items = v.map(function(e) { return '<span class="edge-link" onclick="focusNode(\'' + e.uid + '\')">' + (e['dgraph.type'] ? e['dgraph.type'] + ':' : '') + e.uid + '</span>'; }).join(', ');
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + items + '</span></div>';
    } else {
      html += '<div class="prop-row"><span class="prop-key">' + escHtml(k) + '</span><span class="prop-val">' + escHtml(JSON.stringify(v)) + '</span></div>';
    }
  }
  if (!d.expanded) html += '<br><button class="btn btn-primary" onclick="expandNode(graphNodes.get(\'' + d.uid + '\'))">Expand edges</button>';
  info.innerHTML = html;
}

function focusNode(uid) {
  var n = graphNodes.get(uid);
  if (n) {
    selectedNode = n;
    activeNode = n;
    showNodeInfo(n);
    if (viewMode === '3d' && controls) {
      controls.target.set(n.x||0, n.y||0, n.z||0);
      controls.spherical.radius = Math.min(controls.spherical.radius, 150);
      controls._spinVel.theta = 0; controls._spinVel.phi = 0; controls._zoomVel = 0;
      controls._syncCamera();
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

// ── Keyboard shortcut ───────────────────────────────────────────────
document.getElementById('query-input').addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
});

// ── 3D teardown ─────────────────────────────────────────────────────
function teardown3D() {
  if (simulation) simulation.stop();
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
  var svgs = container.querySelectorAll('svg');
  svgs.forEach(function(s) { s.remove(); });
  var w = container.clientWidth, h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.0004);

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

  scene.add(new THREE.AmbientLight(0x8090a0, 1.2));
  var keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(200, 400, 300);
  scene.add(keyLight);
  var fillLight = new THREE.DirectionalLight(0x4466aa, 0.4);
  fillLight.position.set(-200, -100, -200);
  scene.add(fillLight);
  var rimLight = new THREE.PointLight(0x58a6ff, 0.6, 2000);
  rimLight.position.set(0, 300, -400);
  scene.add(rimLight);

  controls = new CesiumControls(camera, renderer.domElement);

  document.getElementById('controls-hint').innerHTML = 'Left-drag: orbit &middot; Shift+drag: pan &middot; Scroll: zoom<br>Shift+drag node: move &middot; Right-drag: zoom &middot; Middle: tilt<br>Ctrl+drag: free-look &middot; Click: select &middot; Dbl-click: expand';

  simulation = Force3D.forceSimulation([])
    .force('link', Force3D.forceLink([]).id(function(d) { return d.uid; }).distance(80).strength(0.3))
    .force('charge', Force3D.forceManyBody().strength(-200).distanceMax(500))
    .force('center', Force3D.forceCenter(0, 0, 0))
    .force('collide', Force3D.forceCollide(8))
    .on('tick', onSimTick);
  simulation.stop();

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
      selectedNode = hoveredNode; activeNode = hoveredNode; showNodeInfo(hoveredNode);
      handleFocusClick(hoveredNode);
    } else {
      selectedNode = null; activeNode = null;
      if (focusMode) { focusedNode = null; focusRanks = null; applyFocus3D(); }
    }
  });
  renderer.domElement.addEventListener('dblclick', function(e) {
    if (hoveredNode) expandNode(hoveredNode);
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
}

// ── Boot ────────────────────────────────────────────────────────────
loadConfig();
initGraph();
