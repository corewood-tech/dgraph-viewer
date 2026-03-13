// ── Query Modal ─────────────────────────────────────────────────────
var _queryModalInited = false;

function openQueryModal() {
  var modal = document.getElementById('query-modal');
  modal.style.display = 'flex';
  modal.style.zIndex = ++_modalZCounter;
  if (!_queryModalInited) {
    _queryModalInited = true;
    makeDraggable(modal);
    var ta = document.getElementById('query-input');
    var pre = modal.querySelector('.query-highlight');
    ta.addEventListener('input', highlightDQL);
    ta.addEventListener('scroll', function() {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    });
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        highlightDQL();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
    });
  }
  highlightDQL();
  document.getElementById('query-input').focus();
}

function closeQueryModal() {
  document.getElementById('query-modal').style.display = 'none';
}

function toggleQueryModalCollapse() {
  var modal = document.getElementById('query-modal');
  var isCollapsed = modal.classList.toggle('collapsed');
  var btn = modal.querySelector('.collapse-btn svg');
  btn.style.transform = isCollapsed ? 'rotate(180deg)' : '';
}

// ── DQL Tokenizer ───────────────────────────────────────────────────
var DQL_KEYWORDS = new Set([
  'query', 'mutation', 'fragment', 'func', 'type', 'as', 'val', 'uid',
  'first', 'offset', 'after', 'orderasc', 'orderdesc', 'filter',
  'and', 'or', 'not', 'var', 'cascade', 'normalize', 'groupby',
  'count', 'sum', 'avg', 'min', 'max', 'shortest', 'from', 'to',
  'recurse', 'depth', 'loop', 'ignorereflex', 'facets'
]);

var DQL_FUNCTIONS = new Set([
  'has', 'eq', 'ge', 'gt', 'le', 'lt', 'between', 'allofterms',
  'anyofterms', 'alloftext', 'anyoftext', 'regexp', 'match', 'near',
  'within', 'contains', 'intersects', 'exact', 'term', 'fulltext',
  'trigram', 'hash', 'type', 'expand', 'uid_in', 'checkpwd',
  'math', 'ceil', 'floor', 'ln', 'exp', 'sqrt', 'since', 'pow',
  'logbase', 'cond', 'len', 'substr', 'lower', 'upper'
]);

function tokenizeDQL(text) {
  var tokens = [];
  var i = 0, len = text.length;
  while (i < len) {
    var ch = text[i];
    // Comment
    if (ch === '#') {
      var end = text.indexOf('\n', i);
      if (end === -1) end = len;
      tokens.push({type: 'comment', value: text.substring(i, end)});
      i = end;
      continue;
    }
    // String
    if (ch === '"') {
      var j = i + 1;
      while (j < len && text[j] !== '"') { if (text[j] === '\\') j++; j++; }
      if (j < len) j++; // include closing quote
      tokens.push({type: 'string', value: text.substring(i, j)});
      i = j;
      continue;
    }
    // Directive
    if (ch === '@') {
      var j = i + 1;
      while (j < len && /[a-zA-Z0-9_]/.test(text[j])) j++;
      tokens.push({type: 'directive', value: text.substring(i, j)});
      i = j;
      continue;
    }
    // Variable
    if (ch === '$') {
      var j = i + 1;
      while (j < len && /[a-zA-Z0-9_]/.test(text[j])) j++;
      tokens.push({type: 'variable', value: text.substring(i, j)});
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(ch) || (ch === '-' && i + 1 < len && /[0-9]/.test(text[i + 1]))) {
      var j = i;
      if (ch === '-') j++;
      while (j < len && /[0-9.]/.test(text[j])) j++;
      // Only treat as number if we consumed digits
      if (j > i + (ch === '-' ? 1 : 0)) {
        tokens.push({type: 'number', value: text.substring(i, j)});
        i = j;
        continue;
      }
    }
    // Word (keyword or function or default)
    if (/[a-zA-Z_]/.test(ch)) {
      var j = i + 1;
      while (j < len && /[a-zA-Z0-9_.]/.test(text[j])) j++;
      var word = text.substring(i, j);
      var lower = word.toLowerCase();
      // Check if followed by ( to detect functions
      var nextNonSpace = j;
      while (nextNonSpace < len && text[nextNonSpace] === ' ') nextNonSpace++;
      if (DQL_FUNCTIONS.has(lower) || (nextNonSpace < len && text[nextNonSpace] === '(' && !DQL_KEYWORDS.has(lower))) {
        tokens.push({type: 'function', value: word});
      } else if (DQL_KEYWORDS.has(lower)) {
        tokens.push({type: 'keyword', value: word});
      } else {
        tokens.push({type: 'default', value: word});
      }
      i = j;
      continue;
    }
    // Braces
    if (ch === '{' || ch === '}' || ch === '(' || ch === ')') {
      tokens.push({type: 'brace', value: ch});
      i++;
      continue;
    }
    // Whitespace
    if (/\s/.test(ch)) {
      var j = i + 1;
      while (j < len && /\s/.test(text[j])) j++;
      tokens.push({type: 'ws', value: text.substring(i, j)});
      i = j;
      continue;
    }
    // Default (operators, punctuation, etc.)
    tokens.push({type: 'default', value: ch});
    i++;
  }
  return tokens;
}

// ── Highlight renderer ──────────────────────────────────────────────
function highlightDQL() {
  var ta = document.getElementById('query-input');
  var code = document.getElementById('query-highlight-code');
  if (!ta || !code) return;
  var text = ta.value;
  var wrap = ta.closest('.query-editor-wrap');

  if (!text) {
    code.innerHTML = '';
    if (wrap) wrap.classList.remove('hl-active');
    return;
  }
  if (wrap) wrap.classList.add('hl-active');

  var tokens = tokenizeDQL(text);
  var html = '';
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    var escaped = t.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (t.type === 'ws' || t.type === 'default') {
      html += escaped;
    } else {
      html += '<span class="dql-' + t.type + '">' + escaped + '</span>';
    }
  }
  // Pad trailing newline so scroll heights match
  if (text.charAt(text.length - 1) === '\n') html += ' ';
  code.innerHTML = html;
}
