/* Sentence Builder — Sound it out: phoneme frames.
 * Moved in from Spelling Games' Phoneme Frame Builder (25.11.26) so children stay in one tool.
 * Hear the word, count the sounds, tap between letters to split it into one sound per box.
 * Same word lists and recorded audio (Piper, Jenny en_GB) as Spelling Games; no sign-in, no
 * scores kept. Loaded before app.js; uses app.js helpers only inside functions.
 *
 * Only phonetically decodable words belong in frames: one chunk per sound, matching taught
 * graphemes. Split digraphs (cake, kite) are left out: their two letters for one sound aren't
 * next to each other, so a tap between letters can't show that honestly.
 */
const SOUND_LISTS = {
  p23: [
    { w: "cat",   g: ["c","a","t"] },
    { w: "dog",   g: ["d","o","g"] },
    { w: "hen",   g: ["h","e","n"] },
    { w: "map",   g: ["m","a","p"] },
    { w: "sun",   g: ["s","u","n"] },
    { w: "pig",   g: ["p","i","g"] },
    { w: "bed",   g: ["b","e","d"] },
    { w: "leg",   g: ["l","e","g"] },
    { w: "jam",   g: ["j","a","m"] },
    { w: "box",   g: ["b","o","x"] },
    { w: "ship",  g: ["sh","i","p"] },
    { w: "chip",  g: ["ch","i","p"] },
    { w: "shed",  g: ["sh","e","d"] },
    { w: "shop",  g: ["sh","o","p"] },
    { w: "fish",  g: ["f","i","sh"] },
    { w: "ring",  g: ["r","i","ng"] },
    { w: "king",  g: ["k","i","ng"] },
    { w: "sing",  g: ["s","i","ng"] },
    { w: "thin",  g: ["th","i","n"] },
    { w: "moon",  g: ["m","oo","n"] },
    { w: "boot",  g: ["b","oo","t"] },
    { w: "feet",  g: ["f","ee","t"] },
    { w: "seed",  g: ["s","ee","d"] },
    { w: "car",   g: ["c","ar"] },
    { w: "farm",  g: ["f","ar","m"] },
    { w: "star",  g: ["s","t","ar"] },
    { w: "fork",  g: ["f","or","k"] },
    { w: "horn",  g: ["h","or","n"] },
    { w: "rain",  g: ["r","ai","n"] },
    { w: "tail",  g: ["t","ai","l"] },
    { w: "boat",  g: ["b","oa","t"] },
    { w: "soap",  g: ["s","oa","p"] },
    { w: "goat",  g: ["g","oa","t"] },
    { w: "coat",  g: ["c","oa","t"] },
    { w: "hair",  g: ["h","ai","r"] },
    { w: "queen", g: ["q","ue","en"] }
  ],
  p45: [
    { w: "frog",   g: ["f","r","o","g"] },
    { w: "hand",   g: ["h","a","n","d"] },
    { w: "tent",   g: ["t","e","n","t"] },
    { w: "help",   g: ["h","e","l","p"] },
    { w: "stop",   g: ["s","t","o","p"] },
    { w: "plan",   g: ["p","l","a","n"] },
    { w: "flag",   g: ["f","l","a","g"] },
    { w: "drum",   g: ["d","r","u","m"] },
    { w: "plum",   g: ["p","l","u","m"] },
    { w: "crisp",  g: ["c","r","i","s","p"] },
    { w: "play",   g: ["p","l","ay"] },
    { w: "sleep",  g: ["s","l","ee","p"] },
    { w: "green",  g: ["g","r","ee","n"] },
    { w: "cream",  g: ["c","r","ea","m"] },
    { w: "clean",  g: ["c","l","ea","n"] },
    { w: "spoon",  g: ["s","p","oo","n"] },
    { w: "tooth",  g: ["t","oo","th"] },
    { w: "book",   g: ["b","oo","k"] },
    { w: "cloud",  g: ["c","l","ou","d"] },
    { w: "clown",  g: ["c","l","ow","n"] },
    { w: "brown",  g: ["b","r","ow","n"] },
    { w: "light",  g: ["l","igh","t"] },
    { w: "night",  g: ["n","igh","t"] },
    { w: "coach",  g: ["c","oa","ch"] },
    { w: "toast",  g: ["t","oa","s","t"] },
    { w: "teeth",  g: ["t","ee","th"] },
    { w: "stick",  g: ["s","t","i","ck"] },
    { w: "block",  g: ["b","l","o","ck"] },
    { w: "black",  g: ["b","l","a","ck"] },
    { w: "glass",  g: ["g","l","a","ss"] },
    { w: "chest",  g: ["ch","e","s","t"] },
    { w: "crust",  g: ["c","r","u","s","t"] },
    { w: "spring", g: ["s","p","r","i","ng"] },
    { w: "street", g: ["s","t","r","ee","t"] }
  ]
};

const SOUND_META = {
  p23:{icon:'🌱', label:'First sounds', sub:'Short words, plus sh, ch, th, ng, oo, ar, or, ai, ee, oa'},
  p45:{icon:'🌿', label:'Next sounds',  sub:'Blends (st, cr, cl…), plus ay, ea, ou, ow, igh'}
};
const SOUND_ROUND = 8;
let so = null;   // {list, order, idx, cuts:Set, tries, clean, done:bool, solved:bool}

function soundCards(){
  const box = document.getElementById('soundCards'); if (!box) return;
  box.innerHTML = '';
  Object.entries(SOUND_META).forEach(([id, m]) => {
    const b = el('button', 'step-card fix-card', `<h3>${m.icon} ${esc(m.label)}</h3><p>${esc(m.sub)}</p><div class="pf-minis">${
      SOUND_LISTS[id].slice(0, 3).map(e => `<span class="pf-mini">${e.g.map(esc).join('<i></i>')}</span>`).join('')}</div>`);
    b.onclick = () => startSounds(id);
    box.appendChild(b);
  });
}

function startSounds(list){
  mode = 'sounds'; pic = null;
  so = {list, order: shuffle(SOUND_LISTS[list]).slice(0, SOUND_ROUND), idx:0, cuts:new Set(), tries:0, clean:0, done:false, solved:false};
  coachMsg = null; covered = false;
  $('#home').hidden = true; $('#build').hidden = false;
  document.querySelector('.pic-panel').hidden = true;
  document.getElementById('build').classList.add('nopic');
  setCrumbs(`<b>🔤 Sound it out</b><span class="sub">: ${esc(SOUND_META[list].label)}</span>`, '');
  go(`?sounds=${list}`);
  render();
  sayWordSound();
  window.scrollTo(0, 0);
}
const soWord = () => so.order[so.idx];

// The recorded clip says "How many sounds can you hear in the word X? X."; the browser voice is the fallback.
function sayWordSound(){
  const w = soWord(); if (!w || !settings.voice) return;
  if (window.speechSynthesis) speechSynthesis.cancel();
  const clip = new Audio(`audio-phonemes/${w.w.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp3`);
  let fell = false;
  const fallback = () => { if (!fell){ fell = true; say(w.w); } };
  clip.addEventListener('error', fallback);
  Promise.resolve(clip.play()).catch(fallback);
  setTimeout(() => { if (clip.readyState < 2) fallback(); }, 2500);
}

function soundTarget(w){
  const cuts = new Set(); let pos = 0;
  w.g.slice(0, -1).forEach(g => { pos += g.length; cuts.add(pos); });
  return cuts;
}
function toggleCut(i){
  if (so.solved) return;
  so.cuts.has(i) ? so.cuts.delete(i) : so.cuts.add(i);
  coachMsg = null; render();
}
function checkSounds(){
  const w = soWord(), t = soundTarget(w);
  const same = t.size === so.cuts.size && [...t].every(i => so.cuts.has(i));
  if (same){
    so.solved = true;
    if (!so.tries) so.clean++;
    coachMsg = {cls:'good', ic:'🌟', html:`Yes! <b>${w.g.length}</b> sounds: ${w.g.map(g => `<b>${esc(g)}</b>`).join(' · ')}`};
  } else {
    so.tries++;
    so.cuts = new Set();
    coachMsg = {cls:'think', ic:'👂', html: so.tries >= 2
      ? `Listen again and count. This word has <b>${w.g.length}</b> sounds, so it needs <b>${w.g.length}</b> boxes.`
      : 'Not those breaks yet. Say the sounds slowly and try again.'};
    sayWordSound();
  }
  render();
}
function nextSound(){
  so.idx++; so.cuts = new Set(); so.tries = 0; so.solved = false; coachMsg = null;
  if (so.idx >= so.order.length) so.done = true;
  render();
  if (!so.done) sayWordSound();
}

function renderSounds(){
  const line = $('#line'); line.innerHTML = '';
  line.classList.remove('covered');
  const t = $('#lineTools'); t.innerHTML = '';
  const add = (html, cls, fn, dis) => { const b = el('button', 'btn ' + (cls || ''), html); b.onclick = fn; b.disabled = !!dis; t.appendChild(b); return b; };
  const bank = $('#bank'); bank.innerHTML = '';
  const c = $('#coach');
  if (so.done){
    line.appendChild(el('div', 'sort-done', `You split <b>${so.order.length}</b> words. <b>${so.clean}</b> right first time.`));
    add('🔄 Play again', 'primary', () => startSounds(so.list));
    if (!locked) add('🔤 Other words', '', () => navTo('sounds'));
    c.className = 'coach good'; c.hidden = false;
    c.innerHTML = `<span class="ic">🌟</span><div>Super sounding out! When you write a sentence, say each word slowly and write one sound at a time.<div class="stars">${'⭐'.repeat(so.clean)}${'☆'.repeat(so.order.length - so.clean)}</div></div>`;
    return;
  }
  const w = soWord(), letters = w.w.split('');
  line.appendChild(el('div', 'sort-count', `Word ${so.idx + 1} of ${so.order.length}`));
  const row = el('div', 'pf-letters');
  // after a correct answer, colour each sound's letters
  const chunkOf = []; w.g.forEach((g, gi) => { for (let k = 0; k < g.length; k++) chunkOf.push(gi); });
  letters.forEach((ch, i) => {
    if (i > 0){
      const gap = el('button', 'pf-gap' + (so.cuts.has(i) || (so.solved && soundTarget(w).has(i)) ? ' cut' : ''), so.cuts.has(i) || so.solved && soundTarget(w).has(i) ? '✂' : '•');
      gap.setAttribute('aria-label', 'Split here'); gap.onclick = () => toggleCut(i);
      row.appendChild(gap);
    }
    const L = el(i ? 'button' : 'span', 'pf-letter' + (so.solved ? ` chunk-${'abcde'[chunkOf[i] % 5]}` : ''), esc(ch));
    if (i) L.onclick = () => toggleCut(i);
    row.appendChild(L);
  });
  line.appendChild(row);
  if (so.solved){
    const fr = el('div', 'pf-frames');
    w.g.forEach(g => fr.appendChild(el('div', 'pf-frame', esc(g))));
    line.appendChild(fr);
  } else {
    // empty boxes, one per split piece so far, to count against
    const fr = el('div', 'pf-frames empty');
    for (let k = 0; k <= so.cuts.size; k++) fr.appendChild(el('div', 'pf-frame', ''));
    line.appendChild(fr);
  }
  add('🔊 Hear the word', so.solved ? '' : 'primary', sayWordSound);
  if (!so.solved) add('✅ Check', 'good', checkSounds, so.cuts.size === 0);
  else add(so.idx + 1 < so.order.length ? 'Next word ➜' : 'Finish ➜', 'primary', nextSound);
  const m = coachMsg || {ic:'🔎', html:'Say the word slowly. How many sounds? Tap <b>between the letters</b> to split it, one sound in each box.'};
  c.className = 'coach ' + (m.cls || ''); c.hidden = false;
  c.innerHTML = `<span class="ic">${m.ic}</span><div>${m.html}</div>`;
}
