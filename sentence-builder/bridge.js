/* Sentence Builder — links between the pupil side and the Teach tab.
 *   showOnBoard(tokens)    any sentence a child builds opens in the Teach tab's Present mode
 *                          (block-by-block reveal, full screen) in a new tab
 *   target structures      "Let pupils try it" on a Teach structure opens Free build with that
 *                          structure as a target (?go=free&target=y4.2); a banner shows the
 *                          parts it needs and ticks them off as the child adds them
 * Loaded after app.js; uses YEARS from structures.js.
 */

/* ---------- Show on the board ---------- */
// Sentence-builder tokens -> Present-mode entries [{title, items:[{cat, text}]}], one per sentence.
function tokensToEntries(tokens, title){
  const entries = [];
  let cur = null, prefix = '', rel = null;
  const newEntry = () => { cur = {title: title || 'Our sentence', items: []}; entries.push(cur); };
  const last = () => cur.items[cur.items.length - 1];
  newEntry();
  tokens.forEach((tk, i) => {
    const t = tk.t;
    if (tk.kind === 'stop' || (t === '.' && (tk.kind === 'punct' || tk.kind === 'join' || !tk.kind))){
      if (last()) last().text += '.';
      rel = null;
      if (tokens.slice(i + 1).some(x => x.t !== '.')) newEntry();
      return;
    }
    if (t === ',' || t === ')'){ if (last()) last().text += t; if (t === ',' && rel && rel.text.split(' ').length > 1) rel = null; if (t === ')') rel = null; return; }
    if (t === '('){ prefix += '('; return; }
    if (tk.kind === 'lit'){ prefix += t + ' '; return; }
    if (tk.kind === 'relw'){ rel = {cat:'relative', text: prefix + t}; prefix = ''; cur.items.push(rel); return; }
    if (rel && tk.rel){ rel.text += ' ' + t; return; }
    rel = null;
    const cat = tk.kind === 'join' ? (JOINS[tk.jid] ? JOINS[tk.jid].kind : (SUBORD_JOINS.includes(t) ? 'subord' : 'coord')) : tk.kind;
    cur.items.push({cat, text: prefix + t});
    prefix = '';
  });
  entries.forEach(e => { if (e.items[0]) e.items[0].text = e.items[0].text.replace(/^(\(?)(.)/, (m, a, b) => a + b.toUpperCase()); });
  return entries.filter(e => e.items.length);
}
function showOnBoard(tokens, title){
  const entries = tokensToEntries(tokens, title);
  if (!entries.length) return;
  window.open('teach/index.html#present=' + encodeURIComponent(JSON.stringify(entries)), '_blank');
}

/* ---------- Target structures from the Teach tab ---------- */
let sbTarget = null;    // "y4.2" = Year 4, structure 3
function targetStruct(){
  if (!sbTarget || typeof YEARS === 'undefined') return null;
  const [y, i] = sbTarget.split('.');
  const yr = YEARS.find(x => x.id === y);
  return yr && yr.structures[+i] ? {year: yr, st: yr.structures[+i]} : null;
}
const TARGET_LABEL = {who:'who', doing:'doing', what:'what', where:'where', when:'when', how:'how', describe:'describe', aux:'being / having', coord:'joining word', subord:'joining word', relative:'extra info', comma:','};
// Which of the target's parts does the sentence have yet? Counts each kind, so "doing and doing" needs two.
function targetProgress(tokens){
  const t = targetStruct(); if (!t) return null;
  const have = {};
  const bump = k => { have[k] = (have[k] || 0) + 1; };
  tokens.forEach(tk => {
    if (tk.kind === 'punct' && tk.t === ',') bump('comma');
    else if (tk.kind === 'relw') bump('relative');
    else if (tk.kind === 'join') bump(JOINS[tk.jid] && JOINS[tk.jid].kind === 'subord' ? 'subord' : 'coord');
    else if (!tk.rel && tk.kind) bump(tk.kind);
    if (tk.t) bump('lit:' + tk.t.toLowerCase());
  });
  const used = {};
  const parts = t.st.pattern.map(p => {
    const key = p.type === 'lit' ? 'lit:' + p.text.toLowerCase() : p.type;
    used[key] = (used[key] || 0) + 1;
    return {p, ok: (have[key] || 0) >= used[key]};
  });
  return {t, parts, done: parts.every(x => x.ok)};
}
function targetBannerHtml(tokens){
  const pr = targetProgress(tokens || []);
  if (!pr) return '';
  const chip = ({p, ok}) => p.type === 'comma' ? `<span class="tg-mark${ok ? ' ok' : ''}">,</span>`
    : p.type === 'lit' ? `<span class="tg-lit${ok ? ' ok' : ''}">${esc(p.text)}</span>`
    : `<span class="tg-chip c-${p.type === 'relative' ? 'rel' : p.type}${ok ? ' ok' : ''}">${ok ? '✓ ' : ''}${esc(TARGET_LABEL[p.type] || p.type)}</span>`;
  return `<div class="tg-head"><b>🎯 Target from Teach:</b> ${esc(pr.t.st.title)} <small>(${esc(pr.t.year.label)} · ${esc(pr.t.st.note || '')})</small>
    <button class="tg-close" onclick="sbTarget=null; render(); if (!document.getElementById('home').hidden) showHome();" title="Remove the target">✖</button></div>
    <div class="tg-row">${pr.parts.map(chip).join('')}<span class="tg-mark">.</span></div>
    <div class="tg-eg">e.g. <q>${esc(pr.t.st.examples[0] || '')}</q></div>
    ${pr.done ? '<div class="tg-done">🌟 Your sentence has every part of the target structure!</div>' : ''}`;
}
function renderTarget(tokens){
  const box = document.getElementById('target');
  if (!box) return;
  const html = (mode === 'free' || (mode === 'build' && isFree())) ? targetBannerHtml(tokens) : '';
  box.innerHTML = html; box.hidden = !html;
}
