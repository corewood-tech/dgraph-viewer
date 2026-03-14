// ── Raycasting ──────────────────────────────────────────────────────
var highlightLocked = null;

function doRaycast() {
  if (controls._mode && highlightLocked) return;

  raycaster.setFromCamera(mouse, camera);
  var meshes = nodeGroup.children.filter(function(c) { return c.userData && c.userData.uid; });
  if (highlightQuery && highlightQuery.nodeSet) {
    meshes = meshes.filter(function(c) { return highlightQuery.nodeSet.has(c.userData.uid); });
  }
  var intersects = raycaster.intersectObjects(meshes, false);
  var prev = hoveredNode;
  if (intersects.length > 0) {
    var uid = intersects[0].object.userData.uid;
    hoveredNode = graphNodes.get(uid) || null;
  } else {
    hoveredNode = null;
  }
  renderer.domElement.style.cursor = hoveredNode ? 'pointer' : 'default';
  if (hoveredNode !== prev) {
    if (hoveredNode) { highlightConnections(hoveredNode); highlightLocked = hoveredNode; }
    else if (!controls._mode) { clearHighlight(); highlightLocked = null; }
  }
}

// ── Highlight (BFS) ─────────────────────────────────────────────────
function highlightConnections(d) {
  var workingLinks = (highlightQuery && highlightQuery.nodeSet)
    ? graphLinks.filter(function(l) {
        var s = l.source.uid || l.source, t = l.target.uid || l.target;
        return highlightQuery.nodeSet.has(s) && highlightQuery.nodeSet.has(t);
      })
    : graphLinks;
  var adj = new Map();
  workingLinks.forEach(function(l) {
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
    frontier = next;
    if (!frontier.length) break;
  }
  graphNodes.forEach(function(n) { n._hlRank = ranks.has(n.uid) ? ranks.get(n.uid) : -1; });
  graphLinks.forEach(function(l) {
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    l._hlRank = (ranks.has(sid) && ranks.has(tid)) ? Math.max(ranks.get(sid), ranks.get(tid)) : -1;
  });
  applyHighlightColors();
}

function clearHighlight() {
  graphNodes.forEach(function(n) { delete n._hlRank; });
  graphLinks.forEach(function(l) { delete l._hlRank; });
  applyHighlightColors();
}

function applyHighlightColors() {
  var hasFocus = focusMode && focusRanks;
  // Node mesh colors
  nodeMeshes.forEach(function(mesh, uid) {
    if (hasFocus && !focusRanks.has(uid)) return; // respect focus visibility
    var n = graphNodes.get(uid); if (!n) return;
    var base = typeColor(n.type || 'unknown');
    mesh.material = getMaterial(base, base);
    mesh.scale.setScalar(nodeRadius(n));
  });
  // Label visibility
  nodeLabels.forEach(function(sprite, uid) {
    var n = graphNodes.get(uid); if (!n) return;
    if (hasFocus && !focusRanks.has(uid)) { sprite.visible = false; return; }
    var focusVisible = hasFocus && focusRanks.get(uid) <= 3;
    var hlVisible = n._hlRank !== undefined && n._hlRank >= 0 && n._hlRank <= 3;
    sprite.visible = hlVisible || focusVisible;
    if (sprite.visible) {
      var rank = hlVisible ? n._hlRank : focusRanks.get(uid);
      sprite.material.opacity = Math.max(0.3, 1 - rank * 0.2);
    }
  });
  // Link colors
  if (linkColorAttr && linkMesh) {
    var colors = linkColorAttr.array;
    for (var i = 0; i < graphLinks.length; i++) {
      var l = graphLinks[i];
      var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
      var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
      var base = src ? typeColor(src.type || 'unknown') : '#0F3B24';
      var hex;
      // If focus mode is active, links outside the focus subgraph stay black
      if (hasFocus && (!focusRanks.has(sid) || !focusRanks.has(tid))) {
        hex = '#000000';
      } else if (l._hlRank === undefined) {
        // No hover highlight active — use focus dimming if applicable, otherwise base
        if (hasFocus) {
          var edgeRank = Math.max(focusRanks.get(sid), focusRanks.get(tid));
          hex = adjustBrightness(base, Math.max(1.0, 2.5 - edgeRank * 0.3));
        } else {
          hex = base;
        }
      } else if (l._hlRank < 0) {
        hex = '#1a1e24';
      } else {
        hex = adjustBrightness(base, Math.max(1.0, 2.5 - l._hlRank * 0.3));
      }
      var rgb = hexToRgb(hex);
      var idx = i * 6;
      colors[idx] = colors[idx+3] = rgb[0]/255;
      colors[idx+1] = colors[idx+4] = rgb[1]/255;
      colors[idx+2] = colors[idx+5] = rgb[2]/255;
    }
    linkColorAttr.needsUpdate = true;
  }
  // Link labels: highlight + active node, respecting focus
  var activeUid = activeNode ? activeNode.uid : null;
  for (var j = 0; j < linkLabelSprites.length; j++) {
    var obj = linkLabelSprites[j];
    var ll = graphLinks[obj.linkIdx];
    if (!ll) { obj.sprite.visible = false; continue; }
    var sid = ll.source.uid || ll.source, tid = ll.target.uid || ll.target;
    if (hasFocus && (!focusRanks.has(sid) || !focusRanks.has(tid))) { obj.sprite.visible = false; continue; }
    var hlVisible = ll._hlRank !== undefined && ll._hlRank >= 0 && ll._hlRank <= 3;
    var activeVisible = activeUid && (sid === activeUid || tid === activeUid);
    var focusLabelVisible = hasFocus && focusRanks.has(sid) && focusRanks.has(tid) && Math.max(focusRanks.get(sid), focusRanks.get(tid)) <= 3;
    obj.sprite.visible = hlVisible || activeVisible || focusLabelVisible;
  }
  // Re-apply algorithm highlight overlay so it isn't overwritten by hover BFS
  if (highlightQuery) applyHighlightQuery();
}
