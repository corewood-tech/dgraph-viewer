// ── 2D Mode (D3 SVG) ────────────────────────────────────────────────
var svg2d, g2d, linkG2d, labelG2d, nodeG2d, zoom2d, sim2d;
var typeColors2d = d3.scaleOrdinal(d3.schemeTableau10);

function nodeRadius2D(d) {
  if (!scaleByConns) return 10;
  var conns = graphLinks.filter(function(l) { var s = l.source.uid||l.source, t = l.target.uid||l.target; return s === d.uid || t === d.uid; }).length;
  return Math.max(6, Math.min(20, 6 + Math.log2(conns + 1) * 4));
}

// SVG path generators for 2D projections of the 3D platonic solids
var SVG_SHAPES = [
  function(r) { var pts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI/2 + i * 2*Math.PI/5; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z'; },
  function(r) { return 'M0,'+(-r)+'L'+r+',0 0,'+r+' '+(-r)+',0Z'; },
  function(r) { var pts = []; for (var i = 0; i < 6; i++) { var a = -Math.PI/2 + i * Math.PI/3; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z'; },
  function(r) { return 'M0,'+(-r)+'L'+(r*0.866).toFixed(2)+','+(r*0.5).toFixed(2)+' '+(-r*0.866).toFixed(2)+','+(r*0.5).toFixed(2)+'Z'; },
  function(r) { var h = r * 0.85; return 'M'+(-h)+','+(-h)+'L'+h+','+(-h)+' '+h+','+h+' '+(-h)+','+h+'Z'; },
  function(r) { return null; },
  function(r) { var pts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI/2 + i * 2*Math.PI/5; pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)); } return 'M'+pts.join('L')+'Z'; },
  function(r) { return 'M0,'+(-r)+'L'+r+',0 0,'+r+' '+(-r)+',0Z'; }
];

function svgShapeForType(t) {
  if (!useShapes) return SVG_SHAPES[5];
  var gi = GEOMETRIES.indexOf(typeGeometry(t));
  return gi >= 0 ? SVG_SHAPES[gi] : SVG_SHAPES[5];
}

function init2D() {
  var container = document.getElementById('graph-container');
  var canvases = container.querySelectorAll('canvas');
  canvases.forEach(function(c) { c.remove(); });

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  container.insertBefore(svgEl, container.firstChild);

  svg2d = d3.select(svgEl);
  var rect = container.getBoundingClientRect();

  zoom2d = d3.zoom().scaleExtent([0.1, 8]).on('zoom', function(e) { g2d.attr('transform', e.transform); });
  svg2d.call(zoom2d);

  svg2d.on('click', function(e) {
    if (e.target.tagName === 'svg') { selectedNode = null; activeNode = null; updateActiveNode2D(); if (focusMode) { focusedNode = null; focusRanks = null; applyFocus2D(); } }
  });

  g2d = svg2d.append('g');
  linkG2d = g2d.append('g').attr('class', 'links');
  labelG2d = g2d.append('g').attr('class', 'link-labels');
  nodeG2d = g2d.append('g').attr('class', 'nodes');

  sim2d = d3.forceSimulation()
    .force('link', d3.forceLink().id(function(d) { return d.uid; }).distance(100).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    .force('center', d3.forceCenter(rect.width / 2, rect.height / 2))
    .force('collision', d3.forceCollide(30))
    .force('x', d3.forceX(rect.width / 2).strength(0.02))
    .force('y', d3.forceY(rect.height / 2).strength(0.02))
    .on('tick', ticked2D);
  sim2d.stop();

  document.getElementById('controls-hint').innerHTML = 'Scroll: zoom &middot; Drag: pan<br>Click: select &middot; Double-click: expand';
}

function render2D() {
  if (!svg2d) return;
  var nodeArr = Array.from(graphNodes.values());
  var rect = document.getElementById('graph-container').getBoundingClientRect();
  nodeArr.forEach(function(n) {
    if (n.x === undefined || isNaN(n.x)) n.x = rect.width / 2 + (Math.random() - 0.5) * 200;
    if (n.y === undefined || isNaN(n.y)) n.y = rect.height / 2 + (Math.random() - 0.5) * 200;
  });

  var linkSel = linkG2d.selectAll('line').data(graphLinks, function(d) { return (d.source.uid||d.source) + '|' + (d.target.uid||d.target) + '|' + d.predicate; });
  linkSel.exit().remove();
  linkSel.enter().append('line').attr('class', 'link').attr('stroke-width', 1.5);

  var llSel = labelG2d.selectAll('text').data(graphLinks, function(d) { return (d.source.uid||d.source) + '|' + (d.target.uid||d.target) + '|' + d.predicate; });
  llSel.exit().remove();
  llSel.enter().append('text').attr('class', 'link-label').text(function(d) { return d.predicate; });

  var nodeSel = nodeG2d.selectAll('g.node').data(nodeArr, function(d) { return d.uid; });
  nodeSel.exit().remove();

  var enter = nodeSel.enter().append('g')
    .attr('class', function(d) { return 'node ' + (d.expanded ? 'expanded' : 'unexpanded'); })
    .call(drag2D(sim2d))
    .on('click', function(e, d) { e.stopPropagation(); selectedNode = d; activeNode = d; showNodeInfo(d); updateActiveNode2D(); handleFocusClick(d); })
    .on('dblclick', function(e, d) { expandNode(d); })
    .on('mouseenter', function(e, d) { highlightConnections2D(d); })
    .on('mouseleave', function() { clearHighlight2D(); });

  enter.each(function(d) {
    var g = d3.select(this);
    var r = nodeRadius2D(d);
    var shapeFn = svgShapeForType(d.type || 'unknown');
    var pathD = shapeFn(r);
    if (pathD) {
      g.append('path').attr('d', pathD).attr('fill', typeColors2d(d.type || 'unknown')).attr('class', 'node-shape');
    } else {
      g.append('circle').attr('r', r).attr('fill', typeColors2d(d.type || 'unknown')).attr('class', 'node-shape');
    }
  });

  enter.append('text').attr('dx', 14).attr('dy', 4).text(function(d) { return d.label || d.uid; });

  nodeG2d.selectAll('g.node')
    .attr('class', function(d) { return 'node ' + (d.expanded ? 'expanded' : 'unexpanded'); })
    .each(function(d) {
      var g = d3.select(this);
      var r = nodeRadius2D(d);
      var shapeFn = svgShapeForType(d.type || 'unknown');
      var pathD = shapeFn(r);
      var shape = g.select('.node-shape');
      if (pathD) { shape.attr('d', pathD); }
      else { shape.attr('r', r); }
      shape.attr('fill', typeColors2d(d.type || 'unknown'));
    });

  linkG2d.selectAll('line').attr('stroke', function(d) {
    var src = typeof d.source === 'object' ? d.source : graphNodes.get(d.source);
    return src ? typeColors2d(src.type || 'unknown') : '#30363d';
  });

  sim2d.nodes(nodeArr);
  sim2d.force('link').links(graphLinks);
  sim2d.alpha(0.5).restart();
  updateLegend();
}

function ticked2D() {
  linkG2d.selectAll('line')
    .attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
  labelG2d.selectAll('text')
    .attr('x', function(d) { return (d.source.x + d.target.x) / 2; })
    .attr('y', function(d) { return (d.source.y + d.target.y) / 2; });
  nodeG2d.selectAll('g.node').attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
}

function drag2D(sim) {
  return d3.drag()
    .on('start', function(e, d) { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', function(e, d) { d.fx = e.x; d.fy = e.y; })
    .on('end', function(e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
}

function highlightConnections2D(d) {
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
    frontier.forEach(function(uid) { (adj.get(uid) || []).forEach(function(nb) { if (!ranks.has(nb)) { ranks.set(nb, rank); next.push(nb); } }); });
    frontier = next; if (!frontier.length) break;
  }
  nodeG2d.selectAll('g.node').each(function(n) {
    var el = d3.select(this);
    for (var i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false);
    if (ranks.has(n.uid)) {
      var r = ranks.get(n.uid), gc = Math.min(r, 4);
      el.classed('glow-' + gc, true);
      el.select('text').style('opacity', r <= maxRank ? Math.max(0.3, 1 - r * 0.15) : 0);
    } else { el.classed('dimmed', true); el.select('text').style('opacity', 0); }
  });
  linkG2d.selectAll('line').each(function(l) {
    var el = d3.select(this);
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    el.classed('dimmed', false); el.classed('glow', false);
    if (ranks.has(sid) && ranks.has(tid)) {
      var edgeRank = Math.max(ranks.get(sid), ranks.get(tid));
      var t = Math.min(edgeRank / maxRank, 1);
      el.attr('stroke-width', 3.5 - t * 2.5).attr('stroke-opacity', 1.0 - t * 0.6);
      if (edgeRank <= 1) el.classed('glow', true);
    } else { el.classed('dimmed', true); }
  });
}

function clearHighlight2D() {
  if (!nodeG2d) return;
  nodeG2d.selectAll('g.node').each(function() {
    var el = d3.select(this);
    for (var i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false); el.select('text').style('opacity', 0);
  });
  linkG2d.selectAll('line').classed('dimmed', false).classed('glow', false)
    .attr('stroke-width', 1.5).attr('stroke-opacity', 0.4);
}

function updateActiveNode2D() {
  if (!nodeG2d) return;
  nodeG2d.selectAll('g.node').classed('active', function(d) { return activeNode && d.uid === activeNode.uid; });
}

function teardown2D() {
  if (sim2d) sim2d.stop();
  var container = document.getElementById('graph-container');
  var svgs = container.querySelectorAll('svg');
  svgs.forEach(function(s) { s.remove(); });
  svg2d = null; g2d = null; linkG2d = null; labelG2d = null; nodeG2d = null; sim2d = null;
}
