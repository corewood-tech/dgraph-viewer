// ── Simulation tick → update mesh positions ─────────────────────────
function onSimTick() {
  graphNodes.forEach(function(n) {
    var mesh = nodeMeshes.get(n.uid);
    if (mesh) mesh.position.set(n.x || 0, n.y || 0, n.z || 0);
    var label = nodeLabels.get(n.uid);
    if (label) label.position.set((n.x||0), (n.y||0) + nodeRadius(n) + 3, (n.z||0));
  });
  updateLinkPositions();
  for (var i = 0; i < linkLabelSprites.length; i++) {
    var obj = linkLabelSprites[i];
    var l = graphLinks[obj.linkIdx];
    if (!l) continue;
    var s = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
    var t = typeof l.target === 'object' ? l.target : graphNodes.get(l.target);
    if (s && t) obj.sprite.position.set(((s.x||0)+(t.x||0))/2, ((s.y||0)+(t.y||0))/2 + 1.5, ((s.z||0)+(t.z||0))/2);
  }
}

function updateLinkPositions() {
  if (!linkPositionAttr || !linkMesh) return;
  var pos = linkPositionAttr.array;
  for (var i = 0; i < graphLinks.length; i++) {
    var l = graphLinks[i];
    var s = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
    var t = typeof l.target === 'object' ? l.target : graphNodes.get(l.target);
    if (!s || !t) continue;
    var idx = i * 6;
    pos[idx] = s.x||0; pos[idx+1] = s.y||0; pos[idx+2] = s.z||0;
    pos[idx+3] = t.x||0; pos[idx+4] = t.y||0; pos[idx+5] = t.z||0;
  }
  linkPositionAttr.needsUpdate = true;
  linkMesh.geometry.computeBoundingSphere();
}

// ── Build / rebuild meshes ──────────────────────────────────────────
function rebuildScene() {
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);
  if (linkMesh) { scene.remove(linkMesh); linkMesh = null; }
  nodeMeshes.clear();
  nodeLabels.forEach(function(sprite) { scene.remove(sprite); });
  nodeLabels.clear();
  linkLabelSprites.forEach(function(obj) { scene.remove(obj.sprite); });
  linkLabelSprites = [];

  var nodeArr = Array.from(graphNodes.values());

  // Node meshes + labels
  nodeArr.forEach(function(n) {
    var t = n.type || 'unknown';
    var color = typeColor(t);
    var geo = useShapes ? typeGeometry(t) : GEOMETRIES[5];
    var mesh = new THREE.Mesh(geo, getMaterial(color, color));
    var r = nodeRadius(n);
    mesh.scale.setScalar(r);
    mesh.position.set(n.x||0, n.y||0, n.z||0);
    mesh.userData = {uid: n.uid};
    nodeGroup.add(mesh);
    nodeMeshes.set(n.uid, mesh);

    // Label sprite
    var label = n.label || n.uid;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fontSize = 64;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    var tw = ctx.measureText(label).width + 16;
    canvas.width = tw; canvas.height = fontSize + 16;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    ctx.fillStyle = '#c9d1d9';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 8, canvas.height / 2);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false, fog: true, opacity: 0.9});
    var sprite = new THREE.Sprite(mat);
    var scale = 3 / fontSize;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.position.set((n.x||0), (n.y||0) + r + 3, (n.z||0));
    sprite.visible = false;
    scene.add(sprite);
    nodeLabels.set(n.uid, sprite);
  });

  // Link geometry
  var numLinks = graphLinks.length;
  var linkGeo = new THREE.BufferGeometry();
  var positions = new Float32Array(numLinks * 6);
  var colors = new Float32Array(numLinks * 6);
  for (var i = 0; i < numLinks; i++) {
    var l = graphLinks[i];
    var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
    var base = src ? typeColor(src.type || 'unknown') : '#30363d';
    var rgb = hexToRgb(base);
    var idx = i * 6;
    colors[idx] = colors[idx+3] = rgb[0]/255;
    colors[idx+1] = colors[idx+4] = rgb[1]/255;
    colors[idx+2] = colors[idx+5] = rgb[2]/255;
  }
  linkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  linkPositionAttr = linkGeo.attributes.position;
  linkColorAttr = linkGeo.attributes.color;
  var linkMat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.9, fog: true, linewidth: 1});
  linkMesh = new THREE.LineSegments(linkGeo, linkMat);
  linkMesh.frustumCulled = false;
  scene.add(linkMesh);

  // Link label sprites
  for (var i = 0; i < numLinks; i++) {
    var l = graphLinks[i];
    var pred = l.predicate || '';
    if (!pred) continue;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fontSize = 48;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    var tw = ctx.measureText(pred).width + 12;
    canvas.width = tw; canvas.height = fontSize + 8;
    ctx.font = fontSize + 'px SF Mono, Fira Code, monospace';
    ctx.fillStyle = '#8b949e';
    ctx.textBaseline = 'middle';
    ctx.fillText(pred, 6, canvas.height / 2);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false, fog: true, opacity: 0.85});
    var sprite = new THREE.Sprite(mat);
    var scale = 2 / fontSize;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.visible = false;
    scene.add(sprite);
    linkLabelSprites.push({sprite: sprite, linkIdx: i});
  }

  updateLinkPositions();
}

// ── Render (called after data changes) ──────────────────────────────
function renderGraph() {
  if (viewMode === '2d') { render2D(); return; }
  var nodeArr = Array.from(graphNodes.values());
  rebuildScene();
  simulation.nodes(nodeArr);
  simulation.force('link').links(graphLinks);
  simulation.alpha(0.5).restart();
  updateLegend();
}
