// ── Focus Mode ──────────────────────────────────────────────────────
function computeBFSRanks(d) {
  var adj = new Map();
  graphLinks.forEach(function(l) {
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    if (!adj.has(sid)) adj.set(sid, []);
    if (!adj.has(tid)) adj.set(tid, []);
    adj.get(sid).push(tid); adj.get(tid).push(sid);
  });
  var maxRank = glowDepth - 1, ranks = new Map();
  ranks.set(d.uid, 0);
  var frontier = [d.uid];
  for (var rank = 1; rank <= maxRank; rank++) {
    var next = [];
    frontier.forEach(function(uid) {
      (adj.get(uid) || []).forEach(function(nb) { if (!ranks.has(nb)) { ranks.set(nb, rank); next.push(nb); } });
    });
    frontier = next; if (!frontier.length) break;
  }
  return ranks;
}

function handleFocusClick(d) {
  if (!focusMode) return false;
  if (focusedNode && focusedNode.uid === d.uid) {
    focusedNode = null; focusRanks = null;
  } else {
    focusedNode = d;
    focusRanks = computeBFSRanks(d);
  }
  if (viewMode === '3d') applyFocus3D();
  else applyFocus2D();
  return true;
}

function applyFocus3D() {
  if (!focusRanks) {
    nodeMeshes.forEach(function(mesh) { mesh.visible = true; });
    nodeLabels.forEach(function(sprite) { sprite.visible = false; });
    if (linkMesh) linkMesh.visible = true;
    linkLabelSprites.forEach(function(obj) { obj.sprite.visible = false; });
    applyHighlightColors();
    return;
  }
  nodeMeshes.forEach(function(mesh, uid) {
    mesh.visible = focusRanks.has(uid);
  });
  nodeLabels.forEach(function(sprite, uid) {
    var rank = focusRanks.get(uid);
    sprite.visible = rank !== undefined && rank <= 3;
    if (sprite.visible) sprite.material.opacity = Math.max(0.3, 1 - rank * 0.2);
  });
  if (linkColorAttr && linkMesh) {
    linkMesh.visible = true;
    var colors = linkColorAttr.array;
    for (var i = 0; i < graphLinks.length; i++) {
      var l = graphLinks[i];
      var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
      var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
      var base = src ? typeColor(src.type || 'unknown') : '#0F3B24';
      var visible = focusRanks.has(sid) && focusRanks.has(tid);
      var hex = visible ? adjustBrightness(base, Math.max(1.0, 2.5 - Math.max(focusRanks.get(sid), focusRanks.get(tid)) * 0.3)) : '#000000';
      var rgb = hexToRgb(hex);
      var idx = i * 6;
      colors[idx] = colors[idx+3] = rgb[0]/255;
      colors[idx+1] = colors[idx+4] = rgb[1]/255;
      colors[idx+2] = colors[idx+5] = rgb[2]/255;
    }
    linkColorAttr.needsUpdate = true;
  }
  for (var j = 0; j < linkLabelSprites.length; j++) {
    var obj = linkLabelSprites[j];
    var ll = graphLinks[obj.linkIdx];
    if (!ll) { obj.sprite.visible = false; continue; }
    var s = ll.source.uid || ll.source, tt = ll.target.uid || ll.target;
    var lr = (focusRanks.has(s) && focusRanks.has(tt)) ? Math.max(focusRanks.get(s), focusRanks.get(tt)) : -1;
    obj.sprite.visible = lr >= 0 && lr <= 3;
  }
}

function applyFocus2D() {
  if (!nodeG2d) return;
  if (!focusRanks) {
    nodeG2d.selectAll('g.node').style('display', null).style('opacity', null);
    linkG2d.selectAll('line').style('display', null).attr('stroke-opacity', 0.4);
    if (labelG2d) labelG2d.selectAll('text').style('display', null);
    return;
  }
  nodeG2d.selectAll('g.node').each(function(n) {
    var el = d3.select(this);
    if (focusRanks.has(n.uid)) {
      el.style('display', null).style('opacity', 1);
    } else {
      el.style('display', 'none');
    }
  });
  linkG2d.selectAll('line').each(function(l) {
    var el = d3.select(this);
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    if (focusRanks.has(sid) && focusRanks.has(tid)) {
      el.style('display', null);
      var edgeRank = Math.max(focusRanks.get(sid), focusRanks.get(tid));
      el.attr('stroke-opacity', Math.max(0.3, 1 - edgeRank * 0.15));
    } else {
      el.style('display', 'none');
    }
  });
  if (labelG2d) {
    labelG2d.selectAll('text').each(function(l) {
      var el = d3.select(this);
      var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
      el.style('display', (focusRanks.has(sid) && focusRanks.has(tid)) ? null : 'none');
    });
  }
}
