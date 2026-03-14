// ── Auto-refresh ────────────────────────────────────────────────────
var _autoRefreshEnabled = false;
var _autoRefreshSeconds = 15;
var _autoRefreshStart = 0;   // timestamp when current cycle began
var _autoRefreshTimer = null; // setInterval id
var _autoRefreshRAF = null;   // requestAnimationFrame id
var _autoRefreshRunning = false; // true while a query is in flight

function toggleAutoRefresh() {
  _autoRefreshEnabled = document.getElementById('opt-autorefresh').checked;
  if (_autoRefreshEnabled) startAutoRefresh();
  else stopAutoRefresh();
}

function stepAutoRefresh(dir) {
  var input = document.getElementById('autorefresh-seconds');
  var val = Math.max(5, Math.min(60, (parseInt(input.value) || 15) + dir));
  input.value = val;
  _autoRefreshSeconds = val;
  if (_autoRefreshEnabled) { stopAutoRefresh(); startAutoRefresh(); }
}

function updateAutoRefreshInterval() {
  var input = document.getElementById('autorefresh-seconds');
  var val = Math.max(5, Math.min(60, parseInt(input.value) || 15));
  input.value = val;
  _autoRefreshSeconds = val;
  if (_autoRefreshEnabled) { stopAutoRefresh(); startAutoRefresh(); }
}

function startAutoRefresh() {
  stopAutoRefresh();
  var barWrap = document.getElementById('refresh-bar-wrap');
  barWrap.classList.remove('hidden');
  _autoRefreshStart = performance.now();

  _autoRefreshTimer = setInterval(function() {
    if (_autoRefreshRunning) return; // skip if previous query still in flight
    _autoRefreshRunning = true;
    _autoRefreshStart = performance.now();
    // Run the "All" query
    document.getElementById('query-input').value = '{\n  all(func: has(dgraph.type)) {\n    uid\n    dgraph.type\n    expand(_all_) {\n      uid\n      dgraph.type\n      expand(_all_)\n    }\n  }\n}';
    runQuery().then(function() {
      _autoRefreshRunning = false;
    }).catch(function() {
      _autoRefreshRunning = false;
    });
  }, _autoRefreshSeconds * 1000);

  // Start the progress bar animation
  function tickBar() {
    if (!_autoRefreshEnabled) return;
    var elapsed = performance.now() - _autoRefreshStart;
    var total = _autoRefreshSeconds * 1000;
    var remaining = Math.max(0, 1 - elapsed / total);
    var bar = document.getElementById('refresh-bar');
    bar.style.transform = 'scaleX(' + remaining + ')';
    _autoRefreshRAF = requestAnimationFrame(tickBar);
  }
  _autoRefreshRAF = requestAnimationFrame(tickBar);
}

function stopAutoRefresh() {
  if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
  if (_autoRefreshRAF) { cancelAnimationFrame(_autoRefreshRAF); _autoRefreshRAF = null; }
  var barWrap = document.getElementById('refresh-bar-wrap');
  barWrap.classList.add('hidden');
  var bar = document.getElementById('refresh-bar');
  bar.style.transform = 'scaleX(1)';
}
