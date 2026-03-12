// ── Query Builder ────────────────────────────────────────────────────
// Algorithm registry, UI, execution pipeline, and highlight rendering.

var ALGO_REGISTRY = {
  centrality: [
    {id: 'degree', label: 'Degree Centrality', mode: 'gradient', params: []},
    {id: 'betweenness', label: 'Betweenness Centrality', mode: 'gradient', params: []},
    {id: 'closeness', label: 'Closeness Centrality', mode: 'gradient', params: []},
    {id: 'pagerank', label: 'PageRank', mode: 'gradient', params: [
      {name: 'damping', type: 'number', label: 'Damping', min: 0.1, max: 1, step: 0.05, default: 0.85},
      {name: 'iterations', type: 'number', label: 'Iterations', min: 1, max: 100, step: 1, default: 30}
    ]},
    {id: 'hits', label: 'HITS', mode: 'gradient', params: [
      {name: 'metric', type: 'select', label: 'Metric', options: [{value: 'authorities', label: 'Authorities'}, {value: 'hubs', label: 'Hubs'}], default: 'authorities'},
      {name: 'iterations', type: 'number', label: 'Iterations', min: 1, max: 100, step: 1, default: 20}
    ]}
  ],
  community: [
    {id: 'labelProp', label: 'Label Propagation', mode: 'community', params: [
      {name: 'iterations', type: 'number', label: 'Iterations', min: 1, max: 100, step: 1, default: 20}
    ]}
  ],
  structure: [
    {id: 'kcore', label: 'K-Core', mode: 'binary', params: [
      {name: 'k', type: 'number', label: 'K value', min: 1, max: 50, step: 1, default: 2}
    ]},
    {id: 'components', label: 'Connected Components', mode: 'community', params: []}
  ],
  path: [
    {id: 'shortest', label: 'Shortest Path', mode: 'path', params: [
      {name: 'source', type: 'nodeSelect', label: 'Source Node'},
      {name: 'target', type: 'nodeSelect', label: 'Target Node'},
      {name: 'useDQL', type: 'checkbox', label: 'Use DQL (query Dgraph)'}
    ]},
    {id: 'ego', label: 'Ego Network', mode: 'binary', params: [
      {name: 'center', type: 'nodeSelect', label: 'Center Node'},
      {name: 'radius', type: 'number', label: 'Radius', min: 1, max: 10, step: 1, default: 2},
      {name: 'useDQL', type: 'checkbox', label: 'Use DQL (query Dgraph)'}
    ]},
    {id: 'multiTopic', label: 'Multi-Topic Distance', mode: 'gradient', params: [
      {name: 'seeds', type: 'nodeMultiSelect', label: 'Seed Nodes'},
      {name: 'maxDistance', type: 'number', label: 'Max Distance', min: 1, max: 50, step: 1, default: 10}
    ]}
  ],
  metric: [
    {id: 'density', label: 'Network Density', mode: 'scalar', params: []}
  ]
};

var CATEGORY_LABELS = {
  centrality: 'Centrality',
  community: 'Community',
  structure: 'Structure',
  path: 'Path',
  metric: 'Metric'
};

var COMMUNITY_PALETTE = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
  '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac',
  '#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e',
  '#e6ab02','#a6761d','#666666'
];

// ── Active node-select input (for click-to-fill) ────────────────────
var _algoNodeSelectInput = null;

// ── Build UI ─────────────────────────────────────────────────────────
function initAlgoPanel() {
  var catSelect = document.getElementById('algo-category');
  var algoSelect = document.getElementById('algo-select');
  if (!catSelect || !algoSelect) return;

  catSelect.innerHTML = '';
  for (var cat in ALGO_REGISTRY) {
    var opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat] || cat;
    catSelect.appendChild(opt);
  }

  catSelect.addEventListener('change', function() { populateAlgos(); });
  algoSelect.addEventListener('change', function() { populateParams(); });

  populateAlgos();
}

function populateAlgos() {
  var catSelect = document.getElementById('algo-category');
  var algoSelect = document.getElementById('algo-select');
  var cat = catSelect.value;
  var algos = ALGO_REGISTRY[cat] || [];

  algoSelect.innerHTML = '';
  algos.forEach(function(a) {
    var opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.label;
    algoSelect.appendChild(opt);
  });
  populateParams();
}

function getSelectedAlgo() {
  var cat = document.getElementById('algo-category').value;
  var id = document.getElementById('algo-select').value;
  var algos = ALGO_REGISTRY[cat] || [];
  for (var i = 0; i < algos.length; i++) {
    if (algos[i].id === id) return algos[i];
  }
  return null;
}

function populateParams() {
  var paramsDiv = document.getElementById('algo-params');
  paramsDiv.innerHTML = '';
  _algoNodeSelectInput = null;
  var algo = getSelectedAlgo();
  if (!algo) return;

  algo.params.forEach(function(p) {
    var row = document.createElement('div');
    row.className = 'algo-param-row';

    var label = document.createElement('label');
    label.textContent = p.label;
    label.className = 'algo-param-label';
    row.appendChild(label);

    if (p.type === 'number') {
      var input = document.createElement('input');
      input.type = 'number';
      input.className = 'algo-param-input';
      input.id = 'algo-p-' + p.name;
      input.min = p.min; input.max = p.max; input.step = p.step;
      input.value = p.default;
      row.appendChild(input);
    } else if (p.type === 'select') {
      var sel = document.createElement('select');
      sel.className = 'algo-param-input';
      sel.id = 'algo-p-' + p.name;
      (p.options || []).forEach(function(o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label;
        if (o.value === p.default) opt.selected = true;
        sel.appendChild(opt);
      });
      row.appendChild(sel);
    } else if (p.type === 'checkbox') {
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'algo-param-checkbox';
      cb.id = 'algo-p-' + p.name;
      row.appendChild(cb);
    } else if (p.type === 'nodeSelect') {
      var wrap = document.createElement('div');
      wrap.className = 'algo-node-select-wrap';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'algo-param-input algo-node-input';
      input.id = 'algo-p-' + p.name;
      input.placeholder = 'Click node or type UID';
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('focus', function() { _algoNodeSelectInput = this; });
      input.addEventListener('blur', function() {
        var self = this;
        setTimeout(function() { if (_algoNodeSelectInput === self) _algoNodeSelectInput = null; }, 200);
      });
      setupNodeAutocomplete(input);
      wrap.appendChild(input);
      row.appendChild(wrap);
    } else if (p.type === 'nodeMultiSelect') {
      var wrap = document.createElement('div');
      wrap.className = 'algo-node-multi-wrap';
      wrap.id = 'algo-p-' + p.name;
      var chipBox = document.createElement('div');
      chipBox.className = 'algo-chip-box';
      wrap.appendChild(chipBox);
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'algo-param-input algo-node-input';
      input.placeholder = 'Click node or type UID';
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('focus', function() { _algoNodeSelectInput = this; });
      input.addEventListener('blur', function() {
        var self = this;
        setTimeout(function() { if (_algoNodeSelectInput === self) _algoNodeSelectInput = null; }, 200);
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var uid = this.value.trim();
          if (uid && graphNodes.has(uid)) {
            addMultiSelectChip(this.closest('.algo-node-multi-wrap'), uid);
            this.value = '';
          }
        }
      });
      setupNodeAutocomplete(input);
      wrap.appendChild(input);
      row.appendChild(wrap);
    } else if (p.type === 'typeSelect') {
      var wrap = document.createElement('div');
      wrap.className = 'algo-type-select';
      wrap.id = 'algo-p-' + p.name;
      var types = Object.keys(typeColorMap);
      types.forEach(function(t) {
        var lbl = document.createElement('label');
        lbl.className = 'algo-type-opt';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = t;
        cb.checked = true;
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(' ' + t));
        wrap.appendChild(lbl);
      });
      row.appendChild(wrap);
    }

    paramsDiv.appendChild(row);
  });
}

function setupNodeAutocomplete(input) {
  var listId = 'algo-ac-' + Math.random().toString(36).slice(2);
  var datalist = document.createElement('datalist');
  datalist.id = listId;
  input.setAttribute('list', listId);
  input.parentNode && input.parentNode.appendChild(datalist);
  // Defer append until added to DOM
  var origAppend = input.addEventListener;
  input.addEventListener('focus', function() {
    if (!datalist.parentNode) input.parentNode.appendChild(datalist);
    datalist.innerHTML = '';
    graphNodes.forEach(function(n) {
      var opt = document.createElement('option');
      opt.value = n.uid;
      opt.textContent = (n.label || n.uid) + ' (' + (n.type || '') + ')';
      datalist.appendChild(opt);
    });
  });
}

function addMultiSelectChip(wrap, uid) {
  var chipBox = wrap.querySelector('.algo-chip-box');
  // Check if already added
  var existing = chipBox.querySelectorAll('.algo-chip');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].dataset.uid === uid) return;
  }
  var n = graphNodes.get(uid);
  var chip = document.createElement('span');
  chip.className = 'algo-chip';
  chip.dataset.uid = uid;
  chip.textContent = (n ? (n.label || uid) : uid);
  var x = document.createElement('span');
  x.className = 'algo-chip-x';
  x.textContent = '\u00d7';
  x.addEventListener('click', function() { chip.remove(); });
  chip.appendChild(x);
  chipBox.appendChild(chip);
}

// Fill node select from graph click
function algoFillNodeSelect(uid) {
  if (!_algoNodeSelectInput) return false;
  var input = _algoNodeSelectInput;
  // If inside a multi-select wrapper
  if (input.closest('.algo-node-multi-wrap')) {
    addMultiSelectChip(input.closest('.algo-node-multi-wrap'), uid);
    input.value = '';
  } else {
    input.value = uid;
  }
  return true;
}

// ── Execution ────────────────────────────────────────────────────────
function runAlgorithm() {
  var algo = getSelectedAlgo();
  if (!algo) return;

  var ws = GraphAlgorithms.getWorkingSet();
  var nodes = ws.nodes, links = ws.links;

  if (nodes.size === 0) {
    showAlgoResult('No nodes in graph');
    return;
  }

  var result;
  try {
    switch (algo.id) {
      case 'degree':
        result = {scores: GraphAlgorithms.degreeCentrality(nodes, links), mode: 'gradient', label: 'Degree Centrality'};
        break;
      case 'betweenness':
        result = {scores: GraphAlgorithms.betweennessCentrality(nodes, links), mode: 'gradient', label: 'Betweenness Centrality'};
        break;
      case 'closeness':
        result = {scores: GraphAlgorithms.closenessCentrality(nodes, links), mode: 'gradient', label: 'Closeness Centrality'};
        break;
      case 'pagerank': {
        var damping = parseFloat(document.getElementById('algo-p-damping').value) || 0.85;
        var iters = parseInt(document.getElementById('algo-p-iterations').value) || 30;
        result = {scores: GraphAlgorithms.pageRank(nodes, links, {damping: damping, iterations: iters}), mode: 'gradient', label: 'PageRank'};
        break;
      }
      case 'hits': {
        var metric = document.getElementById('algo-p-metric').value;
        var iters = parseInt(document.getElementById('algo-p-iterations').value) || 20;
        var hitsResult = GraphAlgorithms.hits(nodes, links, iters);
        result = {scores: metric === 'hubs' ? hitsResult.hubs : hitsResult.authorities, mode: 'gradient', label: 'HITS (' + metric + ')'};
        break;
      }
      case 'labelProp': {
        var iters = parseInt(document.getElementById('algo-p-iterations').value) || 20;
        var communities = GraphAlgorithms.communityDetection(nodes, links, iters);
        var nodeSet = new Set();
        communities.forEach(function(c) { c.forEach(function(uid) { nodeSet.add(uid); }); });
        result = {communities: communities, nodeSet: nodeSet, mode: 'community', label: 'Label Propagation (' + communities.length + ' communities)'};
        break;
      }
      case 'kcore': {
        var k = parseInt(document.getElementById('algo-p-k').value) || 2;
        var coreSet = GraphAlgorithms.kCore(nodes, links, k);
        result = {nodeSet: coreSet, mode: 'binary', label: k + '-Core (' + coreSet.size + ' nodes)'};
        break;
      }
      case 'components': {
        var components = GraphAlgorithms.connectedComponents(nodes, links);
        var nodeSet = new Set();
        components.forEach(function(c) { c.forEach(function(uid) { nodeSet.add(uid); }); });
        result = {communities: components, nodeSet: nodeSet, mode: 'community', label: 'Connected Components (' + components.length + ')'};
        break;
      }
      case 'shortest': {
        var srcUid = (document.getElementById('algo-p-source').value || '').trim();
        var tgtUid = (document.getElementById('algo-p-target').value || '').trim();
        if (!srcUid || !tgtUid) { showAlgoResult('Select source and target nodes'); return; }
        var useDQL = document.getElementById('algo-p-useDQL').checked;
        if (useDQL) {
          runDQLShortestPath(srcUid, tgtUid);
          return;
        }
        var path = GraphAlgorithms.shortestPath(nodes, links, srcUid, tgtUid);
        if (!path) { showAlgoResult('No path found'); return; }
        var pathSet = new Set(path);
        var scores = new Map();
        path.forEach(function(uid, idx) { scores.set(uid, idx); });
        result = {scores: scores, nodeSet: pathSet, mode: 'path', label: 'Shortest Path (' + path.length + ' nodes)'};
        break;
      }
      case 'ego': {
        var center = (document.getElementById('algo-p-center').value || '').trim();
        if (!center) { showAlgoResult('Select a center node'); return; }
        var radius = parseInt(document.getElementById('algo-p-radius').value) || 2;
        var useDQL = document.getElementById('algo-p-useDQL').checked;
        if (useDQL) {
          runDQLEgoNetwork(center, radius);
          return;
        }
        var egoSet = GraphAlgorithms.egoNetwork(nodes, links, center, radius);
        result = {nodeSet: egoSet, mode: 'binary', label: 'Ego Network (' + egoSet.size + ' nodes)'};
        break;
      }
      case 'multiTopic': {
        var wrap = document.getElementById('algo-p-seeds');
        var chips = wrap.querySelectorAll('.algo-chip');
        var seeds = [];
        chips.forEach(function(c) { seeds.push(c.dataset.uid); });
        if (seeds.length < 2) { showAlgoResult('Select at least 2 seed nodes'); return; }
        var maxDist = parseInt(document.getElementById('algo-p-maxDistance').value) || 10;
        var mtScores = GraphAlgorithms.multiTopicDistance(nodes, links, seeds, maxDist);
        if (mtScores.size === 0) { showAlgoResult('No reachable nodes'); return; }
        // Invert scores: lower distance = higher score
        var maxVal = 0;
        mtScores.forEach(function(v) { if (v > maxVal) maxVal = v; });
        var inverted = new Map();
        mtScores.forEach(function(v, uid) { inverted.set(uid, maxVal > 0 ? 1 - (v / maxVal) : 1); });
        result = {scores: inverted, nodeSet: new Set(inverted.keys()), mode: 'gradient', label: 'Multi-Topic (' + inverted.size + ' nodes)'};
        break;
      }
      case 'density': {
        var d = GraphAlgorithms.density(nodes, links);
        showAlgoResult('Network Density: ' + d.toFixed(4) + ' (' + nodes.size + ' nodes, ' + links.length + ' edges)');
        return;
      }
    }
  } catch (e) {
    showAlgoResult('Error: ' + e.message);
    return;
  }

  if (!result) return;

  // Normalize gradient scores to 0-1
  if (result.mode === 'gradient' && result.scores) {
    var max = 0;
    result.scores.forEach(function(v) { if (v > max) max = v; });
    if (max > 0) {
      var normalized = new Map();
      result.scores.forEach(function(v, uid) { normalized.set(uid, v / max); });
      result.scores = normalized;
    }
    if (!result.nodeSet) {
      result.nodeSet = new Set(result.scores.keys());
    }
  }

  // For binary/community modes, build scores as 1 for all in set
  if ((result.mode === 'binary' || result.mode === 'community') && !result.scores) {
    result.scores = new Map();
    result.nodeSet.forEach(function(uid) { result.scores.set(uid, 1); });
  }

  highlightQuery = result;
  applyHighlightQuery();
  showAlgoResultSummary(result);
}

function showAlgoResult(msg) {
  var el = document.getElementById('algo-result');
  if (el) el.textContent = msg;
}

var _algoResultItems = null; // cached sorted items for progressive loading
var _algoResultShown = 0;
var ALGO_PAGE_SIZE = 20;

function showAlgoResultSummary(result) {
  var el = document.getElementById('algo-result');
  if (!el) return;
  _algoResultItems = null;
  _algoResultShown = 0;

  var html = '<strong>' + escHtml(result.label) + '</strong>';

  if (result.mode === 'gradient' && result.scores) {
    var sorted = [];
    result.scores.forEach(function(v, uid) { sorted.push({uid: uid, score: v}); });
    sorted.sort(function(a, b) { return b.score - a.score; });
    _algoResultItems = {type: 'gradient', items: sorted};
    html += '<div class="algo-top-list" id="algo-result-list"></div>';
    el.innerHTML = html;
    _algoAppendPage();
  } else if (result.mode === 'community' && result.communities) {
    _algoResultItems = {type: 'community', items: result.communities};
    html += '<div class="algo-top-list" id="algo-result-list"></div>';
    el.innerHTML = html;
    _algoAppendPage();
  } else if (result.mode === 'path' && result.scores) {
    var path = [];
    result.scores.forEach(function(idx, uid) { path.push({uid: uid, idx: idx}); });
    path.sort(function(a, b) { return a.idx - b.idx; });
    _algoResultItems = {type: 'path', items: path};
    html += '<div class="algo-top-list" id="algo-result-list"></div>';
    el.innerHTML = html;
    _algoAppendPage();
  } else if (result.mode === 'binary') {
    // For binary, list all nodes
    var items = [];
    result.nodeSet.forEach(function(uid) { items.push({uid: uid}); });
    _algoResultItems = {type: 'binary', items: items};
    html += '<div class="algo-top-list" id="algo-result-list"></div>';
    el.innerHTML = html;
    _algoAppendPage();
  } else {
    el.innerHTML = html;
  }

  // Set up scroll-to-load
  el.addEventListener('scroll', _algoOnScroll);
}

function _algoOnScroll() {
  var el = document.getElementById('algo-result');
  if (!el || !_algoResultItems) return;
  if (_algoResultShown >= _algoResultItems.items.length) return;
  // Load more when scrolled near bottom
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
    _algoAppendPage();
  }
}

function _algoAppendPage() {
  if (!_algoResultItems) return;
  var list = document.getElementById('algo-result-list');
  if (!list) return;
  var data = _algoResultItems;
  var start = _algoResultShown;
  var end = Math.min(start + ALGO_PAGE_SIZE, data.items.length);

  var fragment = document.createDocumentFragment();

  for (var i = start; i < end; i++) {
    var div = document.createElement('div');
    div.className = 'algo-top-item';

    if (data.type === 'gradient') {
      var item = data.items[i];
      var n = graphNodes.get(item.uid);
      var label = n ? (n.label || item.uid) : item.uid;
      div.innerHTML = (i + 1) + '. <span class="algo-node-link" onclick="focusNode(\'' + item.uid + '\')">' + escHtml(label) + '</span> <span class="algo-score">' + item.score.toFixed(3) + '</span>';
    } else if (data.type === 'community') {
      var c = data.items[i];
      div.className = 'algo-community-group';
      var headerDiv = document.createElement('div');
      headerDiv.className = 'algo-community-header algo-top-item';
      headerDiv.innerHTML = '<span class="algo-community-dot" style="background:' + COMMUNITY_PALETTE[i % COMMUNITY_PALETTE.length] + '"></span>' +
        '<span class="algo-community-toggle"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>' +
        'Community ' + (i + 1) + ': ' + c.size + ' nodes';
      var membersDiv = document.createElement('div');
      membersDiv.className = 'algo-community-members';
      membersDiv.style.display = 'none';
      var members = Array.from(c);
      members.forEach(function(uid) {
        var n = graphNodes.get(uid);
        var label = n ? (n.label || uid) : uid;
        var row = document.createElement('div');
        row.className = 'algo-top-item algo-community-member';
        row.innerHTML = '<span class="algo-node-link" onclick="focusNode(\'' + uid + '\')">' + escHtml(label) + '</span>';
        membersDiv.appendChild(row);
      });
      headerDiv.addEventListener('click', function() {
        var m = this.nextElementSibling;
        var open = m.style.display !== 'none';
        m.style.display = open ? 'none' : 'block';
        this.querySelector('.algo-community-toggle svg').style.transform = open ? '' : 'rotate(90deg)';
      });
      div.appendChild(headerDiv);
      div.appendChild(membersDiv);
      div.style.padding = '0';
      div.style.border = 'none';
    } else if (data.type === 'path') {
      var item = data.items[i];
      var n = graphNodes.get(item.uid);
      var label = n ? (n.label || item.uid) : item.uid;
      div.innerHTML = '<span class="algo-node-link" onclick="focusNode(\'' + item.uid + '\')">' + escHtml(label) + '</span>';
    } else if (data.type === 'binary') {
      var item = data.items[i];
      var n = graphNodes.get(item.uid);
      var label = n ? (n.label || item.uid) : item.uid;
      div.innerHTML = '<span class="algo-node-link" onclick="focusNode(\'' + item.uid + '\')">' + escHtml(label) + '</span>';
    }

    fragment.appendChild(div);
  }

  // Remove existing "load more" indicator
  var existing = list.querySelector('.algo-load-more');
  if (existing) existing.remove();

  list.appendChild(fragment);
  _algoResultShown = end;

  // Add "scroll for more" indicator if there are more items
  if (end < data.items.length) {
    var more = document.createElement('div');
    more.className = 'algo-load-more';
    more.textContent = (data.items.length - end) + ' more \u2014 scroll to load';
    more.addEventListener('click', function() { _algoAppendPage(); });
    list.appendChild(more);
  }
}

// ── Highlight Query Rendering ────────────────────────────────────────

function applyHighlightQuery() {
  if (!highlightQuery) return;
  if (viewMode === '3d') applyHighlightQuery3D();
  else applyHighlightQuery2D();
}

function applyHighlightQuery3D() {
  if (!highlightQuery) return;
  var hq = highlightQuery;

  // Build community lookup: uid → community index
  var communityOf = new Map();
  if (hq.mode === 'community' && hq.communities) {
    hq.communities.forEach(function(c, i) {
      c.forEach(function(uid) { communityOf.set(uid, i); });
    });
  }

  // Nodes
  nodeMeshes.forEach(function(mesh, uid) {
    var n = graphNodes.get(uid);
    if (!n) return;
    var base = typeColor(n.type || 'unknown');

    if (!hq.nodeSet || !hq.nodeSet.has(uid)) {
      // Dimmed node
      var dimColor = desaturate(base, 0.8);
      mesh.material = getMaterial(dimColor, '#000000');
      mesh.material.opacity = 0.12;
      mesh.material.transparent = true;
      mesh.scale.setScalar(nodeRadius(n));
      return;
    }

    if (hq.mode === 'gradient') {
      var score = (hq.scores && hq.scores.get(uid)) || 0;
      // Interpolate from dim base to bright morpho
      var r = hexToRgb(base), m = [42, 149, 200]; // morpho-400
      var fr = Math.round(r[0] + (m[0] - r[0]) * score);
      var fg = Math.round(r[1] + (m[1] - r[1]) * score);
      var fb = Math.round(r[2] + (m[2] - r[2]) * score);
      var hex = '#' + [fr, fg, fb].map(function(v) { return Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'); }).join('');
      var emissive = adjustBrightness(hex, 0.5 + score * 1.5);
      mesh.material = getMaterial(hex, emissive);
      mesh.material.opacity = 1;
      mesh.material.transparent = false;
      var s = nodeRadius(n) * (1 + score * 0.5);
      mesh.scale.setScalar(s);
    } else if (hq.mode === 'binary') {
      var bright = adjustBrightness(base, 1.5);
      mesh.material = getMaterial(bright, bright);
      mesh.material.opacity = 1;
      mesh.material.transparent = false;
      mesh.scale.setScalar(nodeRadius(n));
    } else if (hq.mode === 'community') {
      var ci = communityOf.get(uid);
      var cColor = ci !== undefined ? COMMUNITY_PALETTE[ci % COMMUNITY_PALETTE.length] : base;
      mesh.material = getMaterial(cColor, cColor);
      mesh.material.opacity = 1;
      mesh.material.transparent = false;
      mesh.scale.setScalar(nodeRadius(n));
    } else if (hq.mode === 'path') {
      var pathIdx = (hq.scores && hq.scores.get(uid)) || 0;
      var pathLen = hq.nodeSet.size;
      var t = pathLen > 1 ? pathIdx / (pathLen - 1) : 0;
      // Start green → end morpho-blue
      var pr = Math.round(74 + (42 - 74) * t);
      var pg = Math.round(143 + (149 - 143) * t);
      var pb = Math.round(79 + (200 - 79) * t);
      var pHex = '#' + [pr, pg, pb].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
      mesh.material = getMaterial(pHex, pHex);
      mesh.material.opacity = 1;
      mesh.material.transparent = false;
      mesh.scale.setScalar(nodeRadius(n) * 1.3);
    }
  });

  // Labels
  nodeLabels.forEach(function(sprite, uid) {
    if (!hq.nodeSet || !hq.nodeSet.has(uid)) {
      sprite.visible = false;
      return;
    }
    if (hq.mode === 'gradient') {
      var score = (hq.scores && hq.scores.get(uid)) || 0;
      sprite.visible = score > 0.5;
      if (sprite.visible) sprite.material.opacity = score;
    } else if (hq.mode === 'path') {
      sprite.visible = true;
      sprite.material.opacity = 0.9;
    } else {
      sprite.visible = true;
      sprite.material.opacity = 0.8;
    }
  });

  // Links
  if (linkColorAttr && linkMesh) {
    var colors = linkColorAttr.array;
    for (var i = 0; i < graphLinks.length; i++) {
      var l = graphLinks[i];
      var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
      var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
      var base = src ? typeColor(src.type || 'unknown') : '#0F3B24';
      var hex;

      if (hq.nodeSet && hq.nodeSet.has(sid) && hq.nodeSet.has(tid)) {
        if (hq.mode === 'community') {
          var ci = communityOf.get(sid);
          var cj = communityOf.get(tid);
          hex = (ci === cj && ci !== undefined) ? COMMUNITY_PALETTE[ci % COMMUNITY_PALETTE.length] : '#4a4a5a';
        } else {
          hex = adjustBrightness(base, 2.0);
        }
      } else {
        hex = '#0a0e14';
      }

      var rgb = hexToRgb(hex);
      var idx = i * 6;
      colors[idx] = colors[idx + 3] = rgb[0] / 255;
      colors[idx + 1] = colors[idx + 4] = rgb[1] / 255;
      colors[idx + 2] = colors[idx + 5] = rgb[2] / 255;
    }
    linkColorAttr.needsUpdate = true;
  }

  // Link labels
  for (var j = 0; j < linkLabelSprites.length; j++) {
    var obj = linkLabelSprites[j];
    var ll = graphLinks[obj.linkIdx];
    if (!ll) { obj.sprite.visible = false; continue; }
    var sid = ll.source.uid || ll.source, tid = ll.target.uid || ll.target;
    obj.sprite.visible = hq.nodeSet && hq.nodeSet.has(sid) && hq.nodeSet.has(tid);
  }
}

function applyHighlightQuery2D() {
  if (!highlightQuery || !nodeG2d) return;
  var hq = highlightQuery;

  // Build community lookup
  var communityOf = new Map();
  if (hq.mode === 'community' && hq.communities) {
    hq.communities.forEach(function(c, i) {
      c.forEach(function(uid) { communityOf.set(uid, i); });
    });
  }

  nodeG2d.selectAll('g.node').each(function(n) {
    var el = d3.select(this);
    // Clear existing algo classes
    el.classed('algo-highlight', false).classed('algo-dimmed', false);
    for (var i = 0; i < 5; i++) el.classed('glow-' + i, false);
    el.classed('dimmed', false);

    if (!hq.nodeSet || !hq.nodeSet.has(n.uid)) {
      el.classed('algo-dimmed', true);
      el.select('.node-shape').style('opacity', 0.12);
      el.select('text').style('opacity', 0);
      return;
    }

    el.classed('algo-highlight', true);
    el.select('.node-shape').style('opacity', 1);

    if (hq.mode === 'gradient') {
      var score = (hq.scores && hq.scores.get(n.uid)) || 0;
      // Interpolate color
      var base = hexToRgb(typeColor(n.type || 'unknown'));
      var m = [42, 149, 200];
      var fr = Math.round(base[0] + (m[0] - base[0]) * score);
      var fg = Math.round(base[1] + (m[1] - base[1]) * score);
      var fb = Math.round(base[2] + (m[2] - base[2]) * score);
      var hex = '#' + [fr, fg, fb].map(function(v) { return Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'); }).join('');
      el.select('.node-shape').attr('fill', hex);
      el.select('text').style('opacity', score > 0.5 ? score : 0);
    } else if (hq.mode === 'community') {
      var ci = communityOf.get(n.uid);
      var cColor = ci !== undefined ? COMMUNITY_PALETTE[ci % COMMUNITY_PALETTE.length] : typeColor(n.type || 'unknown');
      el.select('.node-shape').attr('fill', cColor);
      el.select('text').style('opacity', 0.8);
    } else if (hq.mode === 'path') {
      var pathIdx = (hq.scores && hq.scores.get(n.uid)) || 0;
      var pathLen = hq.nodeSet.size;
      var t = pathLen > 1 ? pathIdx / (pathLen - 1) : 0;
      var pr = Math.round(74 + (42 - 74) * t);
      var pg = Math.round(143 + (149 - 143) * t);
      var pb = Math.round(79 + (200 - 79) * t);
      var pHex = '#' + [pr, pg, pb].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
      el.select('.node-shape').attr('fill', pHex);
      el.select('text').style('opacity', 0.9);
    } else {
      el.select('text').style('opacity', 0.8);
    }
  });

  linkG2d.selectAll('line').each(function(l) {
    var el = d3.select(this);
    var sid = l.source.uid || l.source, tid = l.target.uid || l.target;
    el.classed('dimmed', false).classed('glow', false);

    if (hq.nodeSet && hq.nodeSet.has(sid) && hq.nodeSet.has(tid)) {
      if (hq.mode === 'community') {
        var ci = communityOf.get(sid), cj = communityOf.get(tid);
        var cColor = (ci === cj && ci !== undefined) ? COMMUNITY_PALETTE[ci % COMMUNITY_PALETTE.length] : '#4a4a5a';
        el.attr('stroke', cColor);
      }
      el.attr('stroke-opacity', 0.9).attr('stroke-width', 2.5);
    } else {
      el.attr('stroke-opacity', 0.03).attr('stroke-width', 0.5);
    }
  });
}

function clearHighlightQuery() {
  highlightQuery = null;
  _algoNodeSelectInput = null;
  var resultEl = document.getElementById('algo-result');
  if (resultEl) resultEl.innerHTML = '';

  // Restore normal rendering
  if (viewMode === '3d') {
    if (focusMode && focusRanks) applyFocus3D();
    else applyHighlightColors();
  } else {
    if (focusMode && focusRanks) applyFocus2D();
    else {
      clearHighlight2D();
      // Restore original fill colors
      if (nodeG2d) {
        nodeG2d.selectAll('g.node').each(function(n) {
          d3.select(this).select('.node-shape').attr('fill', typeColors2d(n.type || 'unknown')).style('opacity', null);
          d3.select(this).classed('algo-highlight', false).classed('algo-dimmed', false);
        });
        linkG2d.selectAll('line').each(function(l) {
          var src = typeof l.source === 'object' ? l.source : graphNodes.get(l.source);
          d3.select(this).attr('stroke', src ? typeColors2d(src.type || 'unknown') : '#0F3B24')
            .attr('stroke-opacity', 0.4).attr('stroke-width', 1.5);
        });
      }
    }
  }
}

// Init panel when DOM is ready
if (document.getElementById('algo-category')) {
  initAlgoPanel();
}
