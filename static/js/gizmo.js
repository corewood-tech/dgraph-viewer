// ── Orientation Gizmo ───────────────────────────────────────────────
function initGizmo() {
  var gizmoEl = document.getElementById('orientation-gizmo');
  gizmoScene = new THREE.Scene();
  gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  gizmoCamera.position.set(0, 0, 5);
  gizmoCamera.lookAt(0, 0, 0);
  gizmoRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  gizmoRenderer.setSize(120, 120);
  gizmoRenderer.setPixelRatio(window.devicePixelRatio);
  gizmoRenderer.setClearColor(0x000000, 0);
  gizmoEl.appendChild(gizmoRenderer.domElement);

  var axisLen = 1.6;
  var axes = [
    {dir: [axisLen,0,0], color: 0xe15759, label: 'X'},
    {dir: [0,axisLen,0], color: 0x59a14f, label: 'Y'},
    {dir: [0,0,axisLen], color: 0x4e79a7, label: 'Z'}
  ];
  axes.forEach(function(a) {
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0), new THREE.Vector3(a.dir[0], a.dir[1], a.dir[2])
    ]);
    var mat = new THREE.LineBasicMaterial({color: a.color, linewidth: 2});
    gizmoScene.add(new THREE.Line(geo, mat));
    // Cone tip
    var coneGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
    var coneMat = new THREE.MeshBasicMaterial({color: a.color});
    var cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(a.dir[0], a.dir[1], a.dir[2]);
    if (a.dir[0]) cone.rotation.z = -Math.PI / 2;
    else if (a.dir[2]) cone.rotation.x = Math.PI / 2;
    gizmoScene.add(cone);
    // Label
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.font = 'bold 48px SF Mono, monospace';
    ctx.fillStyle = '#' + a.color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label, 32, 32);
    var tex = new THREE.CanvasTexture(canvas);
    var spriteMat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false});
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.5, 0.5, 1);
    var offset = 0.35;
    sprite.position.set(a.dir[0] + (a.dir[0]?offset:0), a.dir[1] + (a.dir[1]?offset:0), a.dir[2] + (a.dir[2]?offset:0));
    gizmoScene.add(sprite);
  });

  var originGeo = new THREE.SphereGeometry(0.1, 12, 8);
  var originMat = new THREE.MeshBasicMaterial({color: 0x484f58});
  gizmoScene.add(new THREE.Mesh(originGeo, originMat));
}
