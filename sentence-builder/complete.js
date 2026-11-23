/* Sentence Builder — Complete it (for children who write incomplete sentences).
 *   Fill the gap:      an incomplete sentence from the picture. The child listens, names the
 *                      missing colour (who, doing or what), fills it from the word cards, reads
 *                      it back and judges it.
 *   Sentence or not?:  six word strings, some complete and some not. The child sorts each one;
 *                      the colours are then shown, with a dashed gap where a part is missing.
 * Building a complete sentence from a picture is the existing Build a sentence (Step 2).
 * Loaded before app.js; uses app.js helpers only inside functions. Nothing about the child is stored.
 */
const COMPLETE = {
  gap: {title:'Fill the missing colour', icon:'🧩', sub:'Something is missing. Find which colour, then fill the gap.'},
  sort:{title:'Sentence or not?',        icon:'✅', sub:'Is it a complete sentence, or not yet? Sort them, then see the colours.'}
};
const SORT_ROUND = 6;
let cx = null;   // {type:'gap', f, st, stage:'find'|'fill'|'judge'|'done', tries, showCols} | {type:'sort', items, i, said, right}

function startComplete(type, p, frag){
  mode = 'complete';
  p = p || rnd(topic.pictures);
  heard = false; covered = false; coachMsg = null; problemSlot = null; stripped = false;
  if (type === 'gap'){
    const f = frag || genFragment(p, ['who','doing','who','doing','what']);
    cx = {type, f, st:{...f.clause, [f.miss]:null}, stage: frag ? 'fill' : 'find', tries:0, showCols: !!frag};
  } else {
    const items = shuffle([
      ...Array.from({length:SORT_ROUND / 2}, () => ({clause:genClause(p)})),
      ...shuffle(['who','doing','what','idea','join']).slice(0, SORT_ROUND / 2).map(k => ({f:genFragment(p, [k]) || genFragment(p, ['who','doing','idea'])}))
    ]).filter(x => x.clause || x.f);
    cx = {type, items, i:0, said:null, right:0};
  }
  showBuildScreen(p, `<b>${COMPLETE[type].icon} Complete it</b><span class="sub">: ${esc(COMPLETE[type].title)}</span>`);
  go(`?complete=${type}&pic=${topic.id}.${p.id}`);
  render();
}

/* ---------- shared drawing ---------- */
const GAP_ORDER = ['who','doing','what','where'];
const partText = (k, card) => k === 'who' ? np(card) : card.t;
function gapChip(kind, opts = {}){
  const c = chipEl(kind, opts.text || kind + '?', null, {empty:true, active:!!opts.active, label:opts.label || kind + ' missing'});
  c.classList.add('gap');
  return c;
}
function mainGapChip(){
  const c = el('span', 'chip empty gap gap-main', '<span class="w">main idea?</span><span class="lab">who + doing missing</span>');
  return c;
}
// Plain words (no colours): what the child would see in their own writing.
function plainLine(line, tokens){
  tokens.forEach((p, i) => {
    p.t.split(' ').forEach((w, j) => {
      const s = el('span', 'word', esc(i === 0 && j === 0 ? cap(w) : w));
      s.dataset.i = i; line.appendChild(s);
    });
  });
  line.appendChild(el('span', 'stop', '.'));
}
// Colours, with a dashed gap where a part is missing.
function colourLine(line, items){
  let capNext = true, i = -1;
  items.forEach(it => {
    if (!it.gap) i++;
    if (it.gap){ line.appendChild(it.gap === 'main' ? mainGapChip() : gapChip(it.gap, it)); capNext = false; return; }
    const t = capNext ? cap(it.t) : it.t; capNext = false;
    if (it.kind === 'join'){ const b = joinEl(it.t, i, {onTap:false}); line.appendChild(b); return; }
    line.appendChild(chipEl(it.kind, t, i, {locked:false, extra:false, onTap: it.onTap || false}));
  });
  line.appendChild(el('span', 'stop', '.'));
}
function fragItems(f){
  if (f.miss === 'idea') return [{gap:'who'}, {gap:'doing'}, ...fragParts(f)];
  if (f.miss === 'join') return [{gap:'main'}, ...fragParts(f)];
  return parts(f.clause).map(x => x.kind === f.miss ? {gap:f.miss} : x);
}

function renderComplete(){
  const line = $('#line'); line.innerHTML = '';
  line.classList.toggle('covered', covered);
  if (cx.type === 'gap') renderGap(line); else renderSort(line);
}

/* ================= Fill the missing colour ================= */
function gapTokens(){
  const out = [];
  GAP_ORDER.forEach(k => { if (cx.st[k]) out.push({kind:k, card:cx.st[k], t:partText(k, cx.st[k])}); });
  return [...out, {t:'.'}];
}
function renderGap(line){
  const f = cx.f;
  if (cx.stage === 'find' && !cx.showCols) plainLine(line, fragParts(f));
  else {
    const items = [];
    GAP_ORDER.forEach(k => {
      if (k === f.miss && !cx.st[k]) items.push({gap:k, active: cx.stage === 'fill', label: cx.stage === 'find' ? 'missing' : k + ' missing', text: cx.stage === 'find' ? '?' : k + '?'});
      else if (cx.st[k]) items.push({kind:k, t:partText(k, cx.st[k]),
        onTap: k === f.miss && cx.stage !== 'done' ? () => { cx.stage = 'fill'; heard = false; coachMsg = null; render(); } : false});
    });
    // before the child has named the missing colour, the gap is grey
    colourLine(line, items);
    if (cx.stage === 'find') line.querySelectorAll('.gap').forEach(g => g.style.setProperty('--slot', 'var(--muted)'));
    if (cx.stage !== 'find' && cx.stage !== 'done' && cx.st[f.miss]) line.querySelector(`.c-${f.miss}`)?.classList.add('tappable');
  }
  renderGapTools(); renderGapCoach(); renderGapBank();
}

function nameMissing(k){
  const f = cx.f;
  if (k === f.miss){
    cx.stage = 'fill'; cx.showCols = true;
    coachMsg = {cls:'good', ic:'🌟', html:
      f.miss === 'what' ? `Yes! <q>${esc(cap(np(f.clause.who)))} ${esc(f.clause.doing.t)}…</q> ${esc(f.clause.doing.t)} <b>what</b>? Choose a <b>what</b> to fill the gap.`
      : f.miss === 'who' ? 'Yes! There is no <b>who</b>. Who is doing it? Choose a <b>who</b> to fill the gap.'
      : `Yes! There is no <b>doing</b> word. What is ${esc(np(f.clause.who))} doing? Choose a <b>doing</b> word to fill the gap.`};
    if (settings.readCards && canSpeak()) say(`Yes! The ${k} is missing.`);
  } else {
    cx.tries++;
    const here = f.clause[k] && k !== f.miss;
    let html;
    if (here) html = `<q>${esc(partText(k, f.clause[k]))}</q> is the <b>${k}</b>. It is there. Which colour can you <b>not</b> see?`;
    else if (k === 'what') html = 'There is no what, but this sentence does not need one. Something more important is missing: every sentence needs a <b>who</b> and a <b>doing</b> word.';
    else html = 'Listen again. Which part is missing?';
    if (cx.tries >= 2 && !cx.showCols){ cx.showCols = true; html += ' Look at the colours now.'; }
    coachMsg = {cls:'think', ic:'👂', html};
  }
  render();
}

function fillGap(card){
  const k = cx.f.miss;
  if (settings.readCards && canSpeak()) say(partText(k, card));
  cx.st[k] = card; heard = false; coachMsg = null;
  if (check(cx.st, 'core', 2)){
    // never "wrong": read it back and ask
    const txt = textOf(gapTokens()).text;
    cx.stage = 'fill';
    coachMsg = {cls:'think', ic:'👂', html:`Listen: <q>${esc(txt)}</q> Does that make sense? Try a different <b>${k === 'doing' ? 'doing word' : k}</b>.`};
    render();
    if (canSpeak()) setTimeout(() => speakTokens(gapTokens()), 600);
    return;
  }
  cx.stage = 'judge';
  render();
}

function gapJudge(yes){
  if (yes){
    cx.stage = 'done'; made.complete = (made.complete || 0) + 1;
    const extra = cx.f.miss === 'what' ? ' and a what' : '';
    coachMsg = {cls:'good', ic:'🌟', html:`Now it is a complete sentence. It has a <b>who</b>, a <b>doing</b> word${extra}, and it makes sense on its own. ✏️ Write it in your book.`};
  } else {
    heard = false;
    coachMsg = {cls:'think', ic:'👍', html:`Good thinking. Tap the <b>${cx.f.miss}</b> block and choose a different one.`};
  }
  render();
}

function renderGapTools(){
  const t = $('#lineTools'); t.innerHTML = '';
  const add = (html, cls, fn, dis) => { const b = el('button', 'btn ' + (cls || ''), html); b.onclick = fn; b.disabled = !!dis; t.appendChild(b); return b; };
  const readFrag = () => speakTokens([...fragParts(cx.f), {t:'.'}]);
  const read = () => speakTokens(gapTokens(), () => { heard = true; render(); });
  if (cx.stage === 'find' || cx.stage === 'fill'){
    if (canSpeak()) add('🔊 Read it to me', cx.stage === 'find' ? 'primary' : '', readFrag);
    if (cx.stage === 'find' && !cx.showCols) add('🎨 Show the colours', '', () => { cx.showCols = true; render(); });
  } else if (cx.stage === 'judge'){
    if (canSpeak()) add('🔊 Read it to me', heard ? '' : 'primary pulse', read);
    add('✅ It makes sense now', 'good', () => gapJudge(true), canSpeak() && !heard);
    add('🤔 Not yet', 'think', () => gapJudge(false), canSpeak() && !heard);
  } else {
    if (canSpeak()) add('🔊 Read it to me', '', read);
    add(covered ? '👀 Show me again' : '🙈 Cover it and write', '', () => { covered = !covered; render(); });
    add('➕ Another one', 'primary', () => startComplete('gap', pic));
    add('📺 Show on the board', '', () => showOnBoard(gapTokens(), 'Complete sentence'));
    add('🖼️ Next picture', '', () => { const ps = topic.pictures; startComplete('gap', ps[(ps.indexOf(pic) + 1) % ps.length]); });
  }
  if (cx.stage !== 'done') add('↺ A different one', '', () => startComplete('gap', pic));
}

function renderGapCoach(){
  const c = $('#coach');
  let m = coachMsg;
  if (!m){
    if (cx.stage === 'find') m = {ic:'🔎', html:`This is <b>not a complete sentence</b> yet. ${canSpeak() ? 'Listen to it.' : 'Read it aloud quietly.'} Which colour is missing?`};
    else if (cx.stage === 'fill') m = {ic:'👉', html:`Choose a <b>${cx.f.miss}</b> to fill the gap.`};
    else m = {ic:'🔊', html: canSpeak() ? 'Press <b>Read it to me</b>. Is it a complete sentence now? Does it make sense?' : 'Read it aloud quietly. Is it a complete sentence now?'};
  }
  if (cx.stage === 'done'){
    const n = made.complete || 0;
    m = {...m, html: m.html + `<div class="stars">${'⭐'.repeat(Math.min(n, GOAL))}${'☆'.repeat(Math.max(0, GOAL - n))}</div>`};
  }
  c.className = 'coach ' + (m.cls || '');
  c.innerHTML = `<span class="ic">${m.ic}</span><div>${m.html}</div>`;
  c.hidden = false;
}

function renderGapBank(){
  const b = $('#bank'); b.innerHTML = '';
  if (cx.stage === 'find'){
    cardGroup(b, '🎨', 'Which colour is missing?', ['who','doing','what'].map(k =>
      plainCard(`c-${k} pick-col`, `${icon(k)}<span>${k}</span>`, () => nameMissing(k))));
  } else if (cx.stage === 'fill' || cx.stage === 'judge'){
    const k = cx.f.miss;
    // every card in the picture's bank; one that does not fit gets a gentle "does that make sense?"
    const fitsHere = pic[k].filter(card => k !== 'what' || !check({...cx.st, [k]:card}, 'core', 2));
    cardGroup(b, icon(CAT[k].icon), k === 'who' ? 'Who or what is doing it?' : k === 'doing' ? `What is ${esc(np(cx.st.who))} doing?` : 'What?',
      fitsHere.map(card => wordCard(k, card, cx.st[k] === card, () => fillGap(card))));
  }
}

/* ================= Sentence or not? ================= */
const sortItem = () => cx.items[cx.i];
const itemTokens = it => [...(it.f ? fragParts(it.f) : parts(it.clause)), {t:'.'}];
function renderSort(line){
  if (cx.i >= cx.items.length){
    line.appendChild(el('div', 'sort-done', `You sorted <b>${cx.right}</b> out of <b>${cx.items.length}</b> correctly.`));
    renderSortTools(); renderSortCoach(); $('#bank').innerHTML = '';
    return;
  }
  const it = sortItem();
  const count = el('div', 'sort-count', `${cx.i + 1} of ${cx.items.length}`);
  line.appendChild(count);
  if (cx.said == null) plainLine(line, itemTokens(it).slice(0, -1));
  else colourLine(line, it.f ? fragItems(it.f) : parts(it.clause));
  renderSortTools(); renderSortCoach(); renderSortBank();
}

function sortAnswer(saysComplete){
  const it = sortItem();
  cx.said = saysComplete;
  const right = saysComplete === !it.f;
  if (right) cx.right++;
  if (settings.readCards && canSpeak()) say(right ? 'Yes!' : 'Look again.');
  render();
}

function sortExplain(it){
  if (!it.f){
    const st = it.clause;
    return `It has a <b>who</b> (<q>${esc(np(st.who))}</q>) and a <b>doing</b> word (<q>${esc(st.doing.t)}</q>), and it makes sense on its own.` +
      (!st.what && !st.where ? ' Short sentences can be complete too!' : '');
  }
  const f = it.f, st = f.clause;
  const why = f.miss === 'who' ? `There is no <b>who</b>. Who ${esc(st.doing.t)}?`
    : f.miss === 'doing' ? `There is no <b>doing</b> word. What is ${esc(np(st.who))} doing?`
    : f.miss === 'what' ? `<q>${esc(cap(np(st.who)))} ${esc(st.doing.t)}…</q> ${esc(st.doing.t)} <b>what</b>? This doing word needs a what.`
    : f.miss === 'idea' ? 'It only tells you <b>where</b>. There is no <b>who</b> and no <b>doing</b> word.'
    : `A <b>${esc(f.join)}</b> idea cannot stand on its own. It needs a <b>main idea</b> in front, with a who and a doing word: <q>${esc(textOf([...fragFixed(f), {t:'.'}]).text)}</q>`;
  return f.miss === 'join' ? why : `${why} It could be: <q>${esc(textOf([...fragFixed(f), {t:'.'}]).text)}</q>`;
}

function renderSortTools(){
  const t = $('#lineTools'); t.innerHTML = '';
  const add = (html, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), html); b.onclick = fn; t.appendChild(b); return b; };
  if (cx.i >= cx.items.length){
    add('🔄 Play again', 'primary', () => startComplete('sort', pic));
    add('🧩 Fill the missing colour', '', () => startComplete('gap', pic));
    add('🖼️ Next picture', '', () => { const ps = topic.pictures; startComplete('sort', ps[(ps.indexOf(pic) + 1) % ps.length]); });
    return;
  }
  const it = sortItem();
  if (canSpeak()) add('🔊 Read it to me', cx.said == null ? 'primary' : '', () => speakTokens(itemTokens(it)));
  if (cx.said != null){
    add(cx.i + 1 < cx.items.length ? 'Next ➜' : 'Finish ➜', 'primary', () => { cx.i++; cx.said = null; coachMsg = null; render(); });
    if (it.f && ['who','doing','what'].includes(it.f.miss)) add('🧩 Fix this one', '', () => startComplete('gap', pic, it.f));
  }
}

function renderSortCoach(){
  const c = $('#coach');
  let m;
  if (cx.i >= cx.items.length){
    const all = cx.right === cx.items.length;
    m = {cls: all ? 'good' : '', ic: all ? '🌟' : '👍', html: (all ? 'Every one right! ' : 'Good sorting. ') + 'Remember: a complete sentence has a <b>who</b> and a <b>doing</b> word, and makes sense on its own.' +
      `<div class="stars">${'⭐'.repeat(cx.right)}${'☆'.repeat(cx.items.length - cx.right)}</div>`};
  } else if (cx.said == null){
    m = {ic:'🤔', html:`${canSpeak() ? 'Listen' : 'Read it aloud quietly'}. Is it a <b>complete sentence</b>, or <b>not yet</b>?`};
  } else {
    const it = sortItem(), right = cx.said === !it.f;
    m = {cls: right ? 'good' : 'think', ic: right ? '🌟' : '👀',
      html: (right ? (it.f ? 'Yes, it is <b>not complete</b> yet. ' : 'Yes, it is a <b>complete sentence</b>. ')
                   : (it.f ? 'Look again: it is <b>not complete</b> yet. ' : 'Look again: it <b>is</b> a complete sentence. ')) + sortExplain(it)};
  }
  c.className = 'coach ' + (m.cls || '');
  c.innerHTML = `<span class="ic">${m.ic}</span><div>${m.html}</div>`;
  c.hidden = false;
}

function renderSortBank(){
  const b = $('#bank'); b.innerHTML = '';
  if (cx.said != null) return;
  const g = el('div', 'bank-group sort-choice');
  const yes = el('button', 'btn good big', '✅ Complete sentence'); yes.onclick = () => sortAnswer(true);
  const no = el('button', 'btn think big', '🧩 Not complete yet'); no.onclick = () => sortAnswer(false);
  g.append(yes, no); b.appendChild(g);
}

/* ---------- menus ---------- */
function chooseCompleteModal(){
  openModal('<h2>🧩 Complete it</h2><div class="step-cards" id="mComplete"></div>');
  Object.entries(COMPLETE).forEach(([id, c]) => {
    const b = el('button', 'step-card fix-card', `<h3>${c.icon} ${esc(c.title)}</h3><p>${esc(c.sub)}</p>`);
    b.onclick = () => { $('#modal').hidden = true; startComplete(id, pic); };
    $('#mComplete').appendChild(b);
  });
  const bb = el('button', 'step-card fix-card', '<h3>🧱 Build a complete sentence</h3><p>Who + doing + what or where, from a picture (Build a sentence, Step 2).</p>');
  bb.onclick = () => { $('#modal').hidden = true; buildComplete(pic); };
  $('#mComplete').appendChild(bb);
}
// The picture builder already exists: Build a sentence at Step 2 (who + doing + what or where).
function buildComplete(p){
  step = 2; settings.step = 2; saveSettings();
  if (p) start(p); else choosePictureModal(q => start(q));
}
function completeCards(){
  const cc = document.getElementById('completeCards'); if (!cc) return;
  cc.innerHTML = '';
  const add = (html, fn) => { const b = el('button', 'step-card fix-card', html); b.onclick = fn; cc.appendChild(b); };
  add('<h3>🧱 Build a complete sentence</h3><p>Choose a picture. Build who + doing + what or where, then read it back.</p>', () => buildComplete(null));
  Object.entries(COMPLETE).forEach(([id, c]) => add(`<h3>${c.icon} ${esc(c.title)}</h3><p>${esc(c.sub)}</p>`, () => startComplete(id)));
  const a = el('a', 'step-card fix-card', '<h3>🖨️ Printable cards</h3><p>Fill-the-gap cards and a Sentence or not? sheet for any picture, with answers.</p>');
  a.href = 'print.html?kind=complete'; a.target = '_blank'; a.rel = 'noopener';
  cc.appendChild(a);
  const n = document.getElementById('completeNote');
  if (n) n.textContent = `Complete it uses the ${topic.label} pictures (change the topic under Build a sentence).`;
}
