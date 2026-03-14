// ── Cesium-Style Camera Controls ────────────────────────────────────
var controls;

function CesiumControls(cam, el) {
  this.camera = cam;
  this.el = el;
  this.target = new THREE.Vector3(0, 0, 0);
  this.spherical = new THREE.Spherical(800, Math.PI / 2.2, 0);
  this.minDist = 1;
  this.maxDist = 5000;
  this._spinVel = {theta: 0, phi: 0};
  this._zoomVel = 0;
  this._damping = 0.92;
  this._mode = null;
  this._prev = {x: 0, y: 0};
  this._moved = false;
  this.wasDragging = false;
  var self = this;

  el.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  el.addEventListener('mousedown', function(e) {
    self._moved = false;
    if (e.button === 0 && e.shiftKey) {
      // Check if over a node — if so, drag it; otherwise pan
      if (raycaster && nodeGroup && camera) {
        var rect = el.getBoundingClientRect();
        var mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        var my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
        var meshes = nodeGroup.children.filter(function(c) { return c.userData && c.userData.uid; });
        var hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
          var uid = hits[0].object.userData.uid;
          draggedNode = graphNodes.get(uid) || null;
          if (draggedNode) {
            self._mode = 'nodedrag';
            var camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            var nodePos = new THREE.Vector3(draggedNode.x||0, draggedNode.y||0, draggedNode.z||0);
            dragPlane = new THREE.Plane();
            dragPlane.setFromNormalAndCoplanarPoint(camDir, nodePos);
            dragOffset = new THREE.Vector3();
            var intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, intersection);
            dragOffset.subVectors(nodePos, intersection);
            draggedNode.fx = draggedNode.x; draggedNode.fy = draggedNode.y; draggedNode.fz = draggedNode.z;
            if (simulation && simulation.fixNode) simulation.fixNode(draggedNode);
            dragCluster = getClusterNeighbors(uid, 2);
            dragCluster.forEach(function(entry) {
              var n = entry.node;
              n._dragAnchorX = n.x; n._dragAnchorY = n.y; n._dragAnchorZ = n.z;
            });
            dragAnchor = {x: draggedNode.x, y: draggedNode.y, z: draggedNode.z};
            if (simulation) simulation.alphaTarget(0.1).restart();
          } else {
            self._mode = 'pan';
          }
        } else {
          self._mode = 'pan';
        }
      } else {
        self._mode = 'pan';
      }
    }
    else if (e.button === 0 && e.ctrlKey) self._mode = 'freelook';
    else if (e.button === 0) self._mode = 'orbit';
    else if (e.button === 2) self._mode = 'zoom';
    else if (e.button === 1) self._mode = 'tilt';
    self._prev.x = e.clientX; self._prev.y = e.clientY;
    self._spinVel.theta = 0; self._spinVel.phi = 0; self._zoomVel = 0;
  });

  window.addEventListener('mousemove', function(e) {
    if (!self._mode) return;
    var dx = e.clientX - self._prev.x, dy = e.clientY - self._prev.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) self._moved = true;
    self._prev.x = e.clientX; self._prev.y = e.clientY;

    if (self._mode === 'orbit') {
      var td = -dx * 0.005, pd = -dy * 0.005;
      self.spherical.theta += td;
      self.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, self.spherical.phi + pd));
      self._spinVel.theta = td; self._spinVel.phi = pd;
      self._syncCamera();
    } else if (self._mode === 'zoom') {
      var zd = dy * Math.max(5, self.spherical.radius * 0.01);
      self._doZoom(zd);
      self._zoomVel = zd;
    } else if (self._mode === 'tilt') {
      var pd = -dy * 0.005;
      self.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, self.spherical.phi + pd));
      self._syncCamera();
    } else if (self._mode === 'nodedrag') {
      if (draggedNode && raycaster && camera && dragPlane) {
        var rect = self.el.getBoundingClientRect();
        var mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        var my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
        var intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          intersection.add(dragOffset);
          draggedNode.fx = intersection.x; draggedNode.fy = intersection.y; draggedNode.fz = intersection.z;
          if (simulation && simulation.fixNode) simulation.fixNode(draggedNode);
          if (dragCluster && dragAnchor) {
            var ddx = intersection.x - dragAnchor.x, ddy = intersection.y - dragAnchor.y, ddz = intersection.z - dragAnchor.z;
            dragCluster.forEach(function(entry) {
              var n = entry.node, s = entry.strength;
              n.fx = n._dragAnchorX + ddx * s;
              n.fy = n._dragAnchorY + ddy * s;
              n.fz = n._dragAnchorZ + ddz * s;
            });
            if (simulation && simulation.fixNodes) simulation.fixNodes(dragCluster);
          }
        }
      }
    } else if (self._mode === 'pan') {
      var panScale = self.spherical.radius * 0.002;
      var right = new THREE.Vector3();
      var up = new THREE.Vector3();
      self.camera.getWorldDirection(right);
      up.set(0, 1, 0);
      right.crossVectors(up, right).normalize();
      up.crossVectors(right, new THREE.Vector3().subVectors(self.camera.position, self.target).normalize()).normalize();
      self.target.addScaledVector(right, -dx * panScale);
      self.target.addScaledVector(up, dy * panScale);
      self._syncCamera();
    } else if (self._mode === 'freelook') {
      self.camera.rotateOnWorldAxis(new THREE.Vector3(0,1,0), -dx * 0.003);
      self.camera.rotateX(-dy * 0.003);
      var dir = new THREE.Vector3(0,0,-1).applyQuaternion(self.camera.quaternion);
      self.target.copy(self.camera.position).add(dir.multiplyScalar(self.spherical.radius));
    }
  });

  window.addEventListener('mouseup', function(e) {
    if (self._mode === 'nodedrag' && draggedNode) {
      draggedNode.fx = null; draggedNode.fy = null; draggedNode.fz = null;
      if (simulation && simulation.fixNode) simulation.fixNode(draggedNode);
      if (dragCluster) {
        dragCluster.forEach(function(entry) {
          var n = entry.node;
          n.fx = null; n.fy = null; n.fz = null;
          delete n._dragAnchorX; delete n._dragAnchorY; delete n._dragAnchorZ;
        });
        if (simulation && simulation.fixNodes) simulation.fixNodes(dragCluster);
        dragCluster = null; dragAnchor = null;
      }
      if (simulation) simulation.alphaTarget(0);
      draggedNode = null;
    }
    self.wasDragging = self._moved;
    self._mode = null;
    if (typeof highlightLocked !== 'undefined' && highlightLocked) {
      highlightLocked = null;
      setTimeout(doRaycast, 50);
    }
  });

  el.addEventListener('wheel', function(e) {
    var delta = e.deltaY * Math.max(3, self.spherical.radius * 0.005);
    self._doZoom(delta);
    self._zoomVel = delta * 0.3;
    e.preventDefault();
  }, {passive: false});

  this._syncCamera();
}

CesiumControls.prototype._doZoom = function(delta) {
  var oldRadius = this.spherical.radius;
  var newRadius = Math.max(this.minDist, Math.min(this.maxDist, oldRadius + delta));
  if (newRadius < oldRadius) {
    var approach = (oldRadius - newRadius) * 0.4;
    var dir = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
    this.target.addScaledVector(dir, approach);
  }
  this.spherical.radius = newRadius;
  this._syncCamera();
};

CesiumControls.prototype._syncCamera = function() {
  var offset = new THREE.Vector3().setFromSpherical(this.spherical);
  this.camera.position.copy(this.target).add(offset);
  this.camera.lookAt(this.target);
};

CesiumControls.prototype.update = function() {
  if (this._mode) return;
  var changed = false;
  if (Math.abs(this._spinVel.theta) > 0.00005 || Math.abs(this._spinVel.phi) > 0.00005) {
    this.spherical.theta += this._spinVel.theta;
    this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi + this._spinVel.phi));
    this._spinVel.theta *= this._damping; this._spinVel.phi *= this._damping;
    changed = true;
  }
  if (Math.abs(this._zoomVel) > 0.05) {
    this._doZoom(this._zoomVel);
    this._zoomVel *= this._damping;
    changed = true;
  }
  if (changed) this._syncCamera();
};

CesiumControls.prototype.lookAt = function(pos, duration) {
  this.target.copy(pos);
  this._syncCamera();
};
