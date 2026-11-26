/* Sentence Builder · Teach — "Type a sentence" (26.11.26).
 * The teacher's main job in one screen, in four numbered steps:
 *   1 Type a sentence  2 Add help (Widgit pictures, sound boxes, hidden words)  3 Check it  4 Use it
 *   (show on the board, print or save as PDF, save for later).
 * Replaces the old "My sentence" tab and the separate Symbol sentences page on the staff OneDrive.
 *
 * Widgit pictures: Widgit's licence is inside school only, so no picture or picture list is ever in
 * this (public) repo. The page loads the word list (catalogue.js) and the pictures from the staff-only
 * site slides.wallscourt-farm-academy.co.uk/symbols/ (Cloudflare Access). learn.* and slides.* are the
 * same site for cookies, so a teacher signed in to slides.* gets the pictures here; anyone else gets
 * a "sign in" link and everything else still works. The master library is on the staff OneDrive
 * (Widgit Symbols/Symbol Library, built by its _tools/build_catalogue.py).
 *
 * Loaded before the Teach page's main script: uses its globals (TYPE, autoTagSentence, sentenceBank,
 * openPresentPlaylist, exportItemsToPptx…) only inside functions.
 */
const MK_KEY = 'wfa_scp_make_v1';
const MK_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SYM_SITE = 'https://slides.wallscourt-farm-academy.co.uk/symbols/';
const SYM_BASE = MK_LOCAL ? 'http://localhost:8772/' : SYM_SITE;   // local copy of the OneDrive library when testing
const MK_WORDS = {
  show:  {label:'The words', one:'The word', eg:'<span class="eg-t">fox</span>'},
  split: {label:'Split into sounds',  eg:'<span class="eg-f"><i>f</i><i>o</i><i>x</i></span>'},
  boxes: {label:'Empty sound boxes',  eg:'<span class="eg-f"><i></i><i></i><i></i></span>', sub:'The child writes the sounds.'},
  line:  {label:'Hidden words', one:'Hidden: a line', eg:'<span class="eg-l"></span>', sub:'A line for the child to write on.'},
};
const MK_PICS = {
  off:  {label:'No pictures'},
  part: {label:'One for each coloured part'},
  all:  {label:'One for every word'},
};
// Words that never get a picture of their own (clutter, not meaning).
const MK_NO_SYMBOL = new Set(['the','a','an','of','to','is','was','are','were','be','been','am']);

let mk = {text:'', pics:'off', words:'show', ks:'ks2', size:'1', title:'', edits:{}};
try { Object.assign(mk, JSON.parse(localStorage.getItem(MK_KEY) || '{}')); } catch(e) {}
if (!mk.edits || typeof mk.edits !== 'object') mk.edits = {};
function mkStore(){
  // keep only the edits for sentences still in the box
  const lines = new Set(mkLines());
  Object.keys(mk.edits).forEach(k => { if (!lines.has(k)) delete mk.edits[k]; });
  try { localStorage.setItem(MK_KEY, JSON.stringify(mk)); } catch(e) {}
}
const mkEsc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mkLines = () => mk.text.split(/\n+/).map(s => s.trim()).filter(Boolean);

/* ---------------- Widgit word list, from the staff-only site ---------------- */
const SYM = {state:'idle', exact:new Map(), alias:new Map(), byId:new Map(), all:[], credit:'Widgit Symbols © Widgit Software 2002-2026 www.widgit.com'};
const symNorm = s => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
function symIndex(data){
  SYM.exact = new Map(); SYM.alias = new Map(); SYM.byId = new Map();
  // plain ids before numbered variants (bat before bat-2)
  const rows = data.symbols.map(([id, word, aliases, file]) => ({id, word, aliases: aliases || [], file}))
    .sort((a, b) => (/-\d+$/.test(a.id)) - (/-\d+$/.test(b.id)));
  rows.forEach(s => {
    SYM.byId.set(s.id, s);
    if (!SYM.exact.has(symNorm(s.word))) SYM.exact.set(symNorm(s.word), s);
    s.aliases.forEach(a => { if (!SYM.alias.has(symNorm(a))) SYM.alias.set(symNorm(a), s); });
  });
  SYM.all = rows;
  if (data.credit) SYM.credit = data.credit;
}
function symLoad(){
  if (SYM.state === 'ready' || SYM.state === 'loading') return;
  SYM.state = 'loading'; mkRender();
  delete window.WIDGIT_SYMBOLS;
  const s = document.createElement('script');
  s.src = SYM_BASE + 'catalogue.js?t=' + Date.now();
  const done = () => {
    s.remove();
    if (window.WIDGIT_SYMBOLS && Array.isArray(window.WIDGIT_SYMBOLS.symbols)) { symIndex(window.WIDGIT_SYMBOLS); SYM.state = 'ready'; }
    else SYM.state = 'signin';
    mkRender();
  };
  s.onload = done; s.onerror = done;
  document.head.appendChild(s);
}
// Back from signing in on the other tab: try again.
function symRetry(){ if (SYM.state === 'signin' && mk.pics !== 'off'){ SYM.state = 'idle'; symLoad(); } }
window.addEventListener('focus', symRetry);
document.addEventListener('visibilitychange', () => { if (!document.hidden) symRetry(); });
const symUrl = s => SYM_BASE + encodeURI(s.file);

function symForms(w, lemma){
  const out = [w];
  if (lemma && lemma !== w) out.push(lemma);
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  if (w.endsWith('ied')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) { out.push(w.slice(0, -2)); out.push(w.slice(0, -1)); }
  if (w.endsWith('ing')) { out.push(w.slice(0, -3)); out.push(w.slice(0, -3) + 'e'); }
  return [...new Set(out)];
}
function symLookup(text, lemma){
  const w = symNorm(text);
  if (!w || SYM.state !== 'ready') return null;
  for (const f of symForms(w, lemma)) {
    if (SYM.exact.has(f)) return SYM.exact.get(f);
    if (SYM.alias.has(f)) return SYM.alias.get(f);
  }
  return null;
}
function symSearch(q){
  q = symNorm(q); if (!q) return [];
  const starts = [], has = [];
  SYM.all.forEach(s => {
    const names = [s.word, ...s.aliases].map(symNorm);
    if (names.some(n => n === q || n.startsWith(q))) starts.push(s);
    else if (names.some(n => n.includes(q))) has.push(s);
  });
  return starts.concat(has).slice(0, 24);
}

/* ---------------- sounds for a sound box (phoneme frame) ----------------
 * Longest match over Letters and Sounds graphemes (Phases 2-5), with split digraphs (a-e, i-e…).
 * A suggestion only: the teacher can correct it by tapping the word. */
const MK_GRAPHEMES = ['tch','dge','igh','ear','air','ure','eer','are','ore',
  'ch','sh','th','ng','ck','ff','ll','ss','zz','qu','wh','ph','kn','wr','gn','mb','bb','dd','gg',
  'mm','nn','pp','rr','tt','ai','ay','ee','ea','oa','ow','oe','oo','ar','or','ur','ir','er','ou',
  'oi','oy','ue','ew','ie','aw','au','ey'];
const MK_NOT_SPLIT = new Set(['have','give','live','come','some','done','gone','love','move','were','there',
  'where','one','once','none','whose','lose','are','here','the','more','before','sure']);
function mkSegment(word){
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [word];
  let split = null;
  // a split digraph at the end, also before a plural or past-tense ending (stones, smiled)
  const m = w.match(/^(.*?)([aeiou])([b-df-hj-np-qs-tv-z])e([sd]?)$/);   // not r: hare, more are are / ore
  if (m && !MK_NOT_SPLIT.has(m[1] + m[2] + m[3] + 'e') && !/[aeiou]$/.test(m[1])) split = {at: m[1].length, v: m[2], c: m[3], end: m[4]};
  const body = split ? w.slice(0, split.at) : w;
  const out = [];
  for (let i = 0; i < body.length;) {
    let g = MK_GRAPHEMES.find(g => body.startsWith(g, i)) || body[i];
    // a vowel before a double r is short: c-a-rr-ie-d, not c-ar-r-ie-d
    if (/^[aeiou]r$/.test(g) && body[i + 2] === 'r') g = body[i];
    out.push(g); i += g.length;
  }
  if (split) { out.push(split.v + '-e', split.c); if (split.end) out.push(split.end); }
  return out;
}

/* ---------------- a sentence -> coloured parts with everything resolved ----------------
 * snapshot = {line, ed, anyPic, parts:[{cat, words:[{text, punct, ord, mode, sounds, sym, symAuto}]}]}
 * Saved sentences keep their snapshot, so they show the same pictures and boxes later. */
function mkEd(line){ return mk.edits[line] || (mk.edits[line] = {cats:{}, w:{}}); }
function mkSnapshot(line){
  const ed = mkEd(line);
  let items = [];
  try { items = autoTagSentence(line); } catch(e) { items = [{cat:'lit', text: line}]; }
  let ord = 0;
  const parts = items.map((it, ci) => {
    const words = [];
    String(it.text || '').trim().split(/\s+/).filter(Boolean).forEach(tok => {
      const m = tok.match(/^(.*?)([,.!?;:]*)$/);
      if (!m[1] && words.length) { words[words.length - 1].punct += m[2]; return; }
      words.push({text: m[1], punct: m[2], ord: ord++});
    });
    return {cat: ed.cats[ci] || it.cat || 'lit', words};
  }).filter(p => p.words.length);
  // lemmas (crept -> creep) help find a picture
  let lem = {};
  try {
    if (typeof winkPOSTagger !== 'undefined') {
      const flat = parts.flatMap(p => p.words.map(w => w.text));
      winkPOSTagger.tagRawTokens(flat).forEach((t, i) => { if (t.lemma) lem[i] = t.lemma.toLowerCase(); });
    }
  } catch(e) { lem = {}; }
  parts.forEach(p => p.words.forEach(w => {
    const o = ed.w[w.ord] || {};
    w.mode = o.mode || mk.words;
    w.sounds = o.sounds || mkSegment(w.text);
    w.symAuto = MK_NO_SYMBOL.has(symNorm(w.text)) ? null : symLookup(w.text, lem[w.ord]);
    w.pick = o.pic || null;                       // a picture the teacher chose, or 'none'
    const chosen = o.pic && o.pic !== 'none' ? SYM.byId.get(o.pic) : null;
    w.sym = o.pic === 'none' ? null : (chosen || w.symAuto);
  }));
  // which words show their picture
  const on = mk.pics !== 'off' && SYM.state === 'ready';
  parts.forEach(p => {
    const show = p.words.map(() => false);
    if (on) {
      if (mk.pics === 'all') p.words.forEach((w, i) => { show[i] = !!w.sym; });
      else {
        const picked = p.words.map((w, i) => w.pick && w.pick !== 'none' && w.sym ? i : -1).filter(i => i >= 0);
        if (picked.length) picked.forEach(i => { show[i] = true; });
        else { let last = -1; p.words.forEach((w, i) => { if (w.sym) last = i; }); if (last >= 0) show[last] = true; }
      }
    }
    p.words.forEach((w, i) => { w.showPic = show[i]; w.picFile = show[i] ? w.sym.file : null; w.picWord = show[i] ? w.sym.word : null; });
  });
  return {line, ed: JSON.parse(JSON.stringify(ed)), ks: mk.ks, anyPic: on && parts.some(p => p.words.some(w => w.showPic)), parts};
}
// The sentence as text, with hidden words left blank (the board's last line, saved list).
function mkPlainText(snap){
  return snap.parts.map(p => p.words.map(w =>
    (w.mode === 'boxes' || w.mode === 'line' ? '_'.repeat(Math.max(3, w.text.length)) : w.text) + w.punct).join(' ')).join(' ');
}
function mkItems(snap){ return snap.parts.map(p => ({cat: p.cat, text: p.words.map(w => w.text + w.punct).join(' ')})); }

/* ---------------- drawing a sentence (step 3, the board and the printout share this) ---------------- */
function mkWordBody(w){
  if (w.mode === 'line') return `<span class="mk-line" style="min-width:${Math.max(2.4, w.text.length * 0.6).toFixed(1)}em"></span>`;
  if (w.mode === 'boxes' || w.mode === 'split') {
    return `<span class="mk-frame">` + w.sounds.map(s =>
      `<span class="mk-box">${w.mode === 'split' ? mkEsc(s.replace('-', '–')) : ''}</span>`).join('') + `</span>`;
  }
  return `<span class="mk-t">${mkEsc(w.text)}</span>`;
}
function mkPartHTML(p, ci, snap, edit){
  const def = TYPE[p.cat] || TYPE.lit;
  const label = p.cat === 'lit' ? '' : p.cat === 'aux' ? 'is / was…' : def.label;
  const style = `background:${def.bg};color:${def.fg};${def.border ? 'border:' + def.border + ';' : ''}`;
  let h = `<div class="mk-part mk-c-${p.cat}" style="${style}" data-ci="${ci}">`;
  h += `<${edit ? 'button type="button"' : 'div'} class="mk-role" data-ci="${ci}"${edit ? ' title="Change the colour of this part"' : ''}>` +
    (def.iconSrc ? `<img src="${def.iconSrc}" alt="">` : '') + `<span>${mkEsc(label) || '&nbsp;'}</span>` +
    (edit ? '<i aria-hidden="true">▾</i>' : '') + `</${edit ? 'button' : 'div'}>`;
  h += `<div class="mk-words">`;
  p.words.forEach((w, wi) => {
    const last = wi === p.words.length - 1;
    h += `<${edit ? 'button type="button"' : 'span'} class="mk-word" data-ord="${w.ord}">`;
    if (snap.anyPic) h += w.picFile ? `<span class="mk-pic"><img src="${mkEsc(SYM_BASE + encodeURI(w.picFile))}" alt="${mkEsc(w.picWord)}"></span>` : `<span class="mk-pic mk-nopic"></span>`;
    h += mkWordBody(w) + (w.punct && !last ? `<span class="mk-in-punct">${mkEsc(w.punct)}</span>` : '') + `</${edit ? 'button' : 'span'}>`;
  });
  h += `</div></div>`;
  const end = p.words[p.words.length - 1].punct;
  if (end) h += end.split('').map(c => c === '.' ? '<span class="mk-punct mk-stop" aria-label="full stop"></span>' : `<span class="mk-punct">${mkEsc(c)}</span>`).join('');
  return h;
}
function mkSentenceHTML(snap, edit){
  return `<div class="mk-sentence${snap.anyPic ? ' mk-has-pic' : ''}">` + snap.parts.map((p, ci) => `<div class="mk-unit">${mkPartHTML(p, ci, snap, edit)}</div>`).join('') + `</div>`;
}
function mkMissing(snap){
  if (!snap.anyPic && !(mk.pics !== 'off' && SYM.state === 'ready')) return [];
  return [...new Set(snap.parts.flatMap(p => p.words.filter(w => !w.sym && w.pick !== 'none' && /[a-z]/i.test(w.text) && !MK_NO_SYMBOL.has(symNorm(w.text))).map(w => w.text)))];
}

/* ---------------- the board (Present mode) ---------------- */
// Called by openPresentPlaylist for a sentence made here: one token per coloured part.
function mkPresentFill(snap, row, sentenceEl){
  snap.parts.forEach((p, ci) => {
    const token = document.createElement('div');
    token.className = 'present-token mk-board';
    token.innerHTML = `<div class="mk-sentence${snap.anyPic ? ' mk-has-pic' : ''}"><div class="mk-unit">${mkPartHTML(p, ci, snap, false)}</div></div>`;
    row.appendChild(token);
  });
  sentenceEl.textContent = mkPlainText(snap);
}
function mkPresent(snaps){
  openPresentPlaylist(snaps.map((s, i) => ({items: mkItems(s), title: snaps.length > 1 ? '' : (mk.title || ''), ks: s.ks, autoPunct: false, rich: s})));
}

/* ---------------- print ---------------- */
function mkPrint(snaps){
  let box = document.getElementById('mkPrint');
  if (!box) { box = document.createElement('div'); box.id = 'mkPrint'; document.body.appendChild(box); }
  const any = snaps.some(s => s.anyPic);
  box.style.setProperty('--mk-print', mk.size || '1');
  box.innerHTML = (mk.title.trim() ? `<h1>${mkEsc(mk.title)}</h1>` : '') +
    snaps.map(s => `<div class="mk-strip">${mkSentenceHTML(s, false)}</div>`).join('') +
    (any ? `<p class="mk-credit">${mkEsc(SYM.credit)}</p>` : '');
  const imgs = [...box.querySelectorAll('img')];
  const ready = Promise.race([
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))),
    new Promise(r => setTimeout(r, 5000))]);
  ready.then(() => {
    document.body.classList.add('mk-printing');
    const off = () => { document.body.classList.remove('mk-printing'); window.removeEventListener('afterprint', off); };
    window.addEventListener('afterprint', off);
    window.print();
    setTimeout(off, 1500);
  });
}

/* ---------------- save for later ---------------- */
// Returns true when it replaced the saved sentence opened with "Change".
function mkSaveForLater(snaps){
  const i = mk.editingId ? sentenceBank.findIndex(e => e.id === mk.editingId) : -1;
  mk.editingId = null; mkStore();
  if (i >= 0 && snaps.length === 1) {
    sentenceBank[i] = Object.assign({}, sentenceBank[i], {items: mkItems(snaps[0]), ks: snaps[0].ks, rich: snaps[0]});
    saveSentenceBank(); return true;
  }
  snaps.forEach(s => sentenceBank.push({id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), items: mkItems(s), yearId: null, ks: s.ks, rich: s}));
  saveSentenceBank(); return false;
}
// "Open" on a saved sentence: back into step 1 with its colours, pictures and boxes.
function mkOpenSaved(entry){
  const s = entry.rich;
  if (mk.text.trim() && mk.text.trim() !== s.line &&
      !confirm('This puts the saved sentence into "Type a sentence" instead of what is there now. Carry on?')) return;
  mk.editingId = entry.id;
  mk.text = s.line; mk.edits = {}; mk.edits[s.line] = s.ed || {cats:{}, w:{}};
  if (s.ks !== undefined) mk.ks = s.ks;
  mkStore(); selectMake();
}

/* ---------------- pop-ups: change a colour, a word, a picture ---------------- */
function mkPop(html, anchor){
  let p = document.getElementById('mkPop');
  if (!p) { p = document.createElement('div'); p.id = 'mkPop'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
  p.innerHTML = html; p.hidden = false;
  const small = innerWidth < 640;
  p.classList.toggle('mk-sheet', small);
  if (!small && anchor) {
    const r = anchor.getBoundingClientRect();
    const x = Math.min(Math.max(12, r.left), innerWidth - p.offsetWidth - 12);
    let y = r.bottom + 8;
    if (y + p.offsetHeight > innerHeight - 12) y = Math.max(12, r.top - p.offsetHeight - 8);
    p.style.left = x + 'px'; p.style.top = y + 'px';
  } else { p.style.left = ''; p.style.top = ''; }
  return p;
}
function mkClosePop(){ const p = document.getElementById('mkPop'); if (p) p.hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') mkClosePop(); });
document.addEventListener('mousedown', e => {
  const p = document.getElementById('mkPop');
  if (p && !p.hidden && !p.contains(e.target) && !e.target.closest('.mk-role,.mk-word')) mkClosePop();
});

const MK_ROLE_CHOICES = [
  ['who','who'], ['doing','doing'], ['what','what'], ['where','where'], ['when','when'], ['how','how'],
  ['describe','describe'], ['aux','is / was / has / might…'], ['coord','joining word: and, but, so, or'],
  ['subord','joining word: because, when, if…'], ['relative','extra information (who…, which…)'], ['lit','not coloured'],
];
function mkRoleMenu(line, ci, anchor, snap){
  const p = snap.parts[ci];
  const html = `<h3>“${mkEsc(p.words.map(w => w.text).join(' '))}” is a…</h3><div class="mk-roles">` +
    MK_ROLE_CHOICES.map(([c, lab]) => { const d = TYPE[c];
      return `<button type="button" data-c="${c}" class="${c === p.cat ? 'on' : ''}" style="background:${d.bg};color:${d.fg};${d.border ? 'border:' + d.border : ''}">` +
        (d.iconSrc ? `<img src="${d.iconSrc}" alt="">` : '') + `<span>${mkEsc(lab)}</span></button>`; }).join('') +
    `</div><div class="mk-pop-foot"><button type="button" class="mk-btn" data-x>Close</button></div>`;
  const pop = mkPop(html, anchor);
  pop.onclick = e => {
    if (e.target.closest('[data-x]')) return mkClosePop();
    const b = e.target.closest('[data-c]'); if (!b) return;
    mkEd(line).cats[ci] = b.dataset.c; mkStore(); mkClosePop(); mkRender();
  };
}
function mkWordMenu(line, ord, anchor, snap){
  const w = snap.parts.flatMap(p => p.words).find(x => x.ord === ord); if (!w) return;
  const ed = mkEd(line); const o = ed.w[ord] || {};
  const picsOn = mk.pics !== 'off' && SYM.state === 'ready';
  const html = `<h3>“${mkEsc(w.text)}”</h3>
    <div class="mk-pop-label">Show this word as</div>
    <div class="mk-wmodes">` + Object.entries(MK_WORDS).map(([k, v]) =>
      `<button type="button" data-m="${k}" class="${w.mode === k ? 'on' : ''}"><b>${v.eg}</b><span>${v.one || v.label}</span></button>`).join('') + `</div>
    ${o.mode && o.mode !== mk.words ? `<p class="mk-pop-note">Only this word. <button type="button" class="mk-link" data-m="">Make it like the rest</button></p>` : ''}
    ${w.mode === 'split' || w.mode === 'boxes' ? `<label class="mk-pop-label" for="mkSnd">Sounds, one per box (a space between)</label>
      <div class="mk-snd"><input id="mkSnd" value="${mkEsc(w.sounds.join(' '))}" autocomplete="off" autocapitalize="none"><button type="button" class="mk-btn" data-snd>Use these sounds</button></div>` : ''}
    ${picsOn ? `<div class="mk-pop-label">Picture</div>
      <div class="mk-cur">${w.sym ? `<img src="${mkEsc(symUrl(w.sym))}" alt="">` : '<span class="mk-none">No picture</span>'}
        <button type="button" class="mk-btn" data-pic>Choose a picture</button>
        ${w.sym ? '<button type="button" class="mk-btn ghost" data-nopic>No picture</button>' : ''}</div>` : ''}
    <div class="mk-pop-foot"><button type="button" class="mk-btn" data-x>Done</button></div>`;
  const pop = mkPop(html, anchor);
  const set = patch => { ed.w[ord] = Object.assign({}, ed.w[ord] || {}, patch); Object.keys(ed.w[ord]).forEach(k => { if (ed.w[ord][k] == null || ed.w[ord][k] === '') delete ed.w[ord][k]; }); mkStore(); mkRender(); };
  pop.onclick = e => {
    if (e.target.closest('[data-x]')) return mkClosePop();
    const m = e.target.closest('[data-m]');
    if (m) { set({mode: m.dataset.m || null}); const s = mkFindSnap(line); if (s) mkWordMenu(line, ord, mkAnchor(line, ord) || anchor, s); return; }
    if (e.target.closest('[data-snd]')) {
      const v = pop.querySelector('#mkSnd').value.trim().split(/\s+/).filter(Boolean);
      set({sounds: v.length && v.join(' ') !== mkSegment(w.text).join(' ') ? v : null}); return mkClosePop();
    }
    if (e.target.closest('[data-pic]')) return mkPicMenu(line, ord, anchor, w);
    if (e.target.closest('[data-nopic]')) { set({pic: 'none'}); return mkClosePop(); }
  };
  const snd = pop.querySelector('#mkSnd');
  if (snd) snd.onkeydown = e => { if (e.key === 'Enter') pop.querySelector('[data-snd]').click(); };
}
function mkPicMenu(line, ord, anchor, w){
  const html = `<h3>Picture for “${mkEsc(w.text)}”</h3>
    <input id="mkPicQ" class="mk-q" placeholder="Search the pictures" value="${mkEsc(w.text.replace(/[^\w' -]/g, ''))}" autocomplete="off">
    <div class="mk-choices" id="mkPicRes"></div>
    <div class="mk-pop-foot"><button type="button" class="mk-btn ghost" data-nopic>No picture</button><button type="button" class="mk-btn" data-x>Close</button></div>`;
  const pop = mkPop(html, anchor);
  const fill = () => {
    const hits = symSearch(pop.querySelector('#mkPicQ').value);
    pop.querySelector('#mkPicRes').innerHTML = hits.map(s => `<button type="button" data-id="${mkEsc(s.id)}"><img src="${mkEsc(symUrl(s))}" alt=""><span>${mkEsc(s.word)}</span></button>`).join('') ||
      '<p class="mk-pop-note">No picture found. Try another word that means the same.</p>';
  };
  fill(); pop.querySelector('#mkPicQ').oninput = fill;
  const ed = mkEd(line);
  pop.onclick = e => {
    if (e.target.closest('[data-x]')) return mkClosePop();
    const b = e.target.closest('[data-id]');
    if (b) { ed.w[ord] = Object.assign({}, ed.w[ord] || {}, {pic: b.dataset.id}); mkStore(); mkClosePop(); return mkRender(); }
    if (e.target.closest('[data-nopic]')) { ed.w[ord] = Object.assign({}, ed.w[ord] || {}, {pic: 'none'}); mkStore(); mkClosePop(); mkRender(); }
  };
}

/* ---------------- the screen ---------------- */
let mkSnaps = [];
function mkFindSnap(line){ return mkSnaps.find(s => s.line === line); }
function mkAnchor(line, ord){
  const i = mkSnaps.findIndex(s => s.line === line);
  return document.querySelector(`#mkPreview .mk-row[data-i="${i}"] .mk-word[data-ord="${ord}"]`);
}
function mkSeg(key, choices, extra){
  return `<div class="mk-seg${extra || ''}" role="radiogroup" data-k="${key}">` + Object.entries(choices).map(([v, c]) =>
    `<button type="button" role="radio" aria-checked="${mk[key] === v}" data-v="${v}" class="${mk[key] === v ? 'on' : ''}">` +
    (c.eg ? `<b>${c.eg}</b>` : '') + `<span>${c.label}</span>${c.sub ? `<small>${c.sub}</small>` : ''}</button>`).join('') + `</div>`;
}
function buildMakePanel(){
  const wrap = document.createElement('div');
  wrap.className = 'mk';
  wrap.innerHTML = `
    <section class="mk-step">
      <h2><span class="mk-n">1</span>Type your sentence</h2>
      <textarea id="mkText" rows="2" placeholder="e.g. The hungry fox crept quietly into the dark tunnel.">${mkEsc(mk.text)}</textarea>
      <p class="mk-hint">The colours appear in step 3 as you type. For more than one sentence, start each on a new line.</p>
    </section>
    <section class="mk-step">
      <h2><span class="mk-n">2</span>Add help <small>(you can skip this)</small></h2>
      <div class="mk-opt"><h3>Widgit pictures</h3>${mkSeg('pics', MK_PICS)}<div id="mkPicStatus"></div></div>
      <div class="mk-opt"><h3>How the words look</h3>${mkSeg('words', MK_WORDS, ' mk-seg-eg')}
        <p class="mk-hint">This changes every word. To change one word only, tap it in step 3.</p></div>
    </section>
    <section class="mk-step">
      <h2><span class="mk-n">3</span>Check it</h2>
      <p class="mk-hint" id="mkCheckHint">Wrong colour? Tap the name at the top of the coloured part (who, doing…). To change a word's picture, sounds or boxes, tap the word.</p>
      <div id="mkPreview"></div>
    </section>
    <section class="mk-step">
      <h2><span class="mk-n">4</span>Use it</h2>
      <div class="mk-use">
        <button type="button" class="mk-big" id="mkShowBtn"><b>📺 Show on the board</b><span>Fills the screen. Each click shows the next coloured part, then the whole sentence.</span></button>
        <button type="button" class="mk-big" id="mkPrintBtn"><b>🖨️ Print or save as PDF</b><span>One sentence per strip on A4. To keep a copy, choose "Save as PDF" as the printer.</span></button>
        <button type="button" class="mk-big" id="mkSaveBtn"><b>💾 Save for later</b><span>Keeps it in Saved sentences on this device, to show in the lesson.</span></button>
      </div>
      <details class="mk-more"><summary>More options</summary>
        <label>Handwriting for the whole sentence on the board
          <select id="mkKs"><option value="ks2">Joined (Years 3 to 6)</option><option value="ks1">Printed (Years 1 and 2)</option><option value="">Plain</option></select></label>
        <label>Size on paper
          <select id="mkSize"><option value="0.8">Small</option><option value="1">Medium</option><option value="1.3">Large</option></select></label>
        <label>Heading on the printout <input id="mkTitle" value="${mkEsc(mk.title)}" placeholder="(none)"></label>
        <button type="button" class="mk-btn ghost" id="mkPptBtn">⬇ Download as PowerPoint (colours and icons only: no pictures or boxes)</button>
      </details>
    </section>`;
  const ta = wrap.querySelector('#mkText');
  let t;
  ta.addEventListener('input', () => { mk.text = ta.value; if (!ta.value.trim()) mk.editingId = null; clearTimeout(t); t = setTimeout(() => { mkStore(); mkRender(); }, 250); });
  wrap.querySelectorAll('.mk-seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    mk[seg.dataset.k] = b.dataset.v;
    seg.querySelectorAll('[data-v]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    if (seg.dataset.k === 'pics' && mk.pics !== 'off') symLoad();
    mkStore(); mkRender();
  }));
  const ks = wrap.querySelector('#mkKs'), size = wrap.querySelector('#mkSize'), title = wrap.querySelector('#mkTitle');
  ks.value = mk.ks || ''; size.value = mk.size || '1';
  ks.onchange = () => { mk.ks = ks.value; mkStore(); mkRender(); };
  size.onchange = () => { mk.size = size.value; mkStore(); };
  title.oninput = () => { mk.title = title.value; mkStore(); };
  wrap.querySelector('#mkShowBtn').onclick = () => mkSnaps.length && mkPresent(mkSnaps);
  wrap.querySelector('#mkPrintBtn').onclick = () => mkSnaps.length && mkPrint(mkSnaps);
  wrap.querySelector('#mkSaveBtn').onclick = e => {
    if (!mkSnaps.length) return;
    const replaced = mkSaveForLater(mkSnaps);
    const b = e.currentTarget, old = b.innerHTML;
    b.innerHTML = `<b>✅ Saved</b><span>${replaced ? 'Your changes are saved' : mkSnaps.length > 1 ? mkSnaps.length + ' sentences are' : 'It is'} in the 💾 Saved sentences tab at the top.</span>`;
    b.disabled = true; setTimeout(() => { b.innerHTML = old; b.disabled = false; mkRenderTabs(); }, 2200);
  };
  wrap.querySelector('#mkPptBtn').onclick = () => {
    if (!mkSnaps.length) return;
    const items = mkSnaps.flatMap(mkItems);
    exportItemsToPptx(items, {title: mk.title || '', fileName: slugify(mkSnaps.map(s => s.line).join(' ')), ks: mk.ks || null, yearId: null, autoPunct: false});
  };
  // tap a colour name, a picture or a word in step 3
  wrap.querySelector('#mkPreview').addEventListener('click', e => {
    const row = e.target.closest('.mk-row'); if (!row) return;
    const snap = mkSnaps[+row.dataset.i]; if (!snap) return;
    const role = e.target.closest('.mk-role'), word = e.target.closest('.mk-word');
    if (role) return mkRoleMenu(snap.line, +role.dataset.ci, role, snap);
    if (word) {
      const ord = +word.dataset.ord;
      if (e.target.closest('.mk-pic') && mk.pics !== 'off' && SYM.state === 'ready') {
        const w = snap.parts.flatMap(p => p.words).find(x => x.ord === ord);
        return mkPicMenu(snap.line, ord, word, w);
      }
      return mkWordMenu(snap.line, ord, word, snap);
    }
  });
  return wrap;
}
function mkRender(){
  const prev = document.getElementById('mkPreview'); if (!prev) return;
  if (mk.pics !== 'off' && SYM.state === 'idle') symLoad();
  mkSnaps = mkLines().map(mkSnapshot);
  // picture status, under "Widgit pictures"
  const st = document.getElementById('mkPicStatus');
  if (st) {
    st.className = 'mk-status';
    if (mk.pics === 'off') st.innerHTML = '';
    else if (SYM.state === 'loading') st.innerHTML = 'Getting the pictures…';
    else if (SYM.state === 'signin') { st.className = 'mk-status mk-warn';
      st.innerHTML = `The Widgit pictures are only for school staff, so they need the staff sign-in. <a href="${SYM_SITE}" target="_blank" rel="noopener">Sign in to see the pictures</a> (it opens a new tab). Sign in there, then come back to this tab.`; }
    else st.innerHTML = '';
  }
  if (!mkSnaps.length) {
    prev.innerHTML = '<p class="mk-empty">Your sentence will appear here, in colour.</p>';
  } else {
    prev.innerHTML = mkSnaps.map((s, i) => {
      const miss = mkMissing(s);
      return `<div class="mk-row" data-i="${i}">${mkSentenceHTML(s, true)}` +
        (miss.length ? `<p class="mk-miss">No picture for: ${miss.map(mkEsc).join(', ')}. Tap a word to choose a picture.</p>` : '') + `</div>`;
    }).join('') + (mkSnaps.some(s => s.anyPic) ? `<p class="mk-credit">${mkEsc(SYM.credit)}</p>` : '');
  }
  ['mkShowBtn', 'mkPrintBtn', 'mkSaveBtn', 'mkPptBtn'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = !mkSnaps.length; });
}
function selectMake(){
  setTeachTab('make');
  const content = document.getElementById('yearContent');
  content.innerHTML = '';
  content.appendChild(buildMakePanel());
  mkRender();
  window.scrollTo({top: 0, behavior: 'smooth'});
}
