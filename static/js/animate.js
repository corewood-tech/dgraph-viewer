// ── Animation loop ──────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  controls.update();

  // Throb active (selected) node
  if (activeNode && nodeMeshes.has(activeNode.uid)) {
    var mesh = nodeMeshes.get(activeNode.uid);
    var t = Date.now() * 0.004;
    var pulse = 0.5 + 0.5 * Math.sin(t);
    var baseR = nodeRadius(activeNode);
    mesh.scale.setScalar(baseR * (1 + pulse * 0.25));
    var baseColor = typeColor(activeNode.type || 'unknown');
    var bright = adjustBrightness(baseColor, 1.5 + pulse * 1.0);
    mesh.material = getMaterial(bright, '#ffffff');
    mesh.material.emissiveIntensity = 0.4 + pulse * 0.6;
    var label = nodeLabels.get(activeNode.uid);
    if (label) { label.visible = true; label.material.opacity = 0.8 + pulse * 0.2; }
    var auid = activeNode.uid;
    for (var li = 0; li < linkLabelSprites.length; li++) {
      var obj = linkLabelSprites[li];
      var lnk = graphLinks[obj.linkIdx];
      if (!lnk) continue;
      var sid = lnk.source.uid || lnk.source, tid = lnk.target.uid || lnk.target;
      if (sid === auid || tid === auid) { obj.sprite.visible = true; }
    }
  }

  renderer.render(scene, camera);

  // Gizmo synced to main camera
  if (gizmoRenderer && gizmoCamera) {
    var q = camera.quaternion.clone();
    gizmoCamera.position.set(0, 0, 5).applyQuaternion(q);
    gizmoCamera.quaternion.copy(q);
    gizmoRenderer.render(gizmoScene, gizmoCamera);
  }
}

// ── Arrow key node movement ─────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (!selectedNode) return;
  var tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  var step = 25;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    var dir = e.key === 'ArrowRight' ? 1 : -1;
    selectedNode.fx = (selectedNode.fx != null ? selectedNode.fx : (selectedNode.x || 0)) + dir * step;
    if (viewMode === '3d') simulation.alpha(0.3).restart();
    else if (sim2d) sim2d.alpha(0.3).restart();
  } else if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    if (viewMode !== '3d') return;
    var dir = e.key === 'ArrowUp' ? -1 : 1;
    selectedNode.fz = (selectedNode.fz != null ? selectedNode.fz : (selectedNode.z || 0)) + dir * step;
    simulation.alpha(0.3).restart();
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    var dir = e.key === 'ArrowUp' ? 1 : -1;
    selectedNode.fy = (selectedNode.fy != null ? selectedNode.fy : (selectedNode.y || 0)) + dir * step;
    if (viewMode === '3d') simulation.alpha(0.3).restart();
    else if (sim2d) sim2d.alpha(0.3).restart();
  }
});
