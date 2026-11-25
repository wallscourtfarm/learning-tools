/* Sentence Builder — the Teacher page (?go=teacher). One place for staff:
 *   Send a child to an activity: choose the activity and pictures, get a link and QR code.
 *     "Keep them on it" adds lock=1: the menu is hidden, so the child stays on that activity.
 *   Teach on the board (teach/), printables, reference guide, settings.
 * Loaded before app.js; uses app.js helpers only inside functions. Nothing is stored.
 */
function teacherActivities(){
  const g = [];
  g.push(['🧱 Build a sentence', Object.entries(STEPS).filter(([n]) => n !== 'F').map(([n, st]) => [`step:${n}`, `${st.title}: ${st.sub}`])
    .concat([['step:F', 'Free build: start simple, then add anything']])]);
  g.push(['🧩 Complete it', Object.entries(COMPLETE).map(([id, c]) => [`complete:${id}`, c.title])]);
  g.push(['🔧 Fix it', Object.entries(FIXES).map(([id, f]) => [`fix:${id}`, f.title])]);
  g.push(['🔤 Sound it out', Object.entries(SOUND_META).map(([id, m]) => [`sounds:${id}`, m.label])]);
  g.push(['📝 Check my writing', [['write', 'Check my writing (the child types their own sentence)']]]);
  return g;
}

let tchoice = {act:'complete:gap', pics:null, lock:true};
function teacherLink(){
  const [kind, val] = tchoice.act.split(':');
  const q = [];
  if (kind === 'step') q.push(`step=${val}`);
  else if (kind === 'complete') q.push(`complete=${val}`);
  else if (kind === 'fix') q.push(`fix=${val}`);
  else if (kind === 'sounds') q.push(`sounds=${val}`);
  else q.push('mode=write');
  const pics = tchoice.pics || `topic:${topic.id}`;
  if (kind !== 'sounds'){
    if (pics.startsWith('pic:')) q.push(`pic=${pics.slice(4)}`);
    else if (kind !== 'write') q.push(`topic=${pics.slice(6)}`);
  }
  if (tchoice.lock) q.push('lock=1');
  return location.origin + location.pathname + '?' + q.join('&');
}

function teacherPanel(){
  const box = document.getElementById('teacherBox'); if (!box) return;
  const actOpts = teacherActivities().map(([lab, items]) =>
    `<optgroup label="${esc(lab)}">${items.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</optgroup>`).join('');
  const picOpts = `<optgroup label="Any picture from a set (a new one each time)">${TOPICS.map(t => `<option value="topic:${t.id}">${esc(t.label)} (${esc(t.years)})</option>`).join('')}</optgroup>` +
    TOPICS.map(t => `<optgroup label="One picture · ${esc(t.label)}">${t.pictures.map(p => `<option value="pic:${t.id}.${p.id}">${esc(p.title)}</option>`).join('')}</optgroup>`).join('');
  box.innerHTML = `
    <div class="t-card t-send">
      <h3>📲 Send a child to an activity</h3>
      <div class="t-form">
        <label>Activity<select id="tAct">${actOpts}</select></label>
        <label id="tPicWrap">Pictures<select id="tPics">${picOpts}</select></label>
        <label class="t-check"><input type="checkbox" id="tLock"> Keep them on this activity (hides the menu)</label>
      </div>
      <div class="t-out">
        <div class="t-qr" id="tQr"></div>
        <div class="t-linkbox">
          <input id="tLink" readonly>
          <div class="t-btns">
            <button class="btn primary" id="tCopy">📋 Copy link</button>
            <button class="btn" id="tOpen">▶ Open it on this device</button>
          </div>
          <p class="note">Scan the QR code on the child's iPad, or save the link to its home screen. Nothing about the child is stored.</p>
        </div>
      </div>
    </div>
    <div class="step-cards t-more">
      <a class="step-card fix-card" href="teach/index.html"><h3>📺 Teach on the board</h3><p>Each year group's colour-coded sentence structures. Present block by block, type your own words, export to PowerPoint.</p></a>
      <a class="step-card fix-card" href="print.html" target="_blank" rel="noopener"><h3>🖨️ Printables</h3><p>Desk mat, word cards, sentence strips, Fix it and Complete it sheets.</p></a>
      <a class="step-card fix-card" href="teach/reference-guide.pdf" target="_blank" rel="noopener"><h3>📄 Reference guide</h3><p>The colour-coded sentence progression, Year 1 to Year 6.</p></a>
      <button class="step-card fix-card" id="tSettings"><h3>⚙️ Settings</h3><p>Extras allowed, read aloud on or off, reading speed. Saved on this device.</p></button>
    </div>
    <div class="t-card t-how">
      <h3>How the parts fit together</h3>
      <ul>
        <li><b>You teach</b> a sentence structure on the board with <b>Teach on the board</b>.</li>
        <li><b>Children practise</b> it here: <b>Build</b> (make a sentence from a picture), <b>Complete it</b> (spot and fill a missing who, doing or what), <b>Fix it</b> (mend run-ons and overloaded sentences), <b>Sound it out</b> (split a word into its sounds).</li>
        <li><b>You choose</b> which activity each child does with <b>Send a child to an activity</b> above. Same colours everywhere: <span class="t-key c-who">who</span> <span class="t-key c-doing">doing</span> <span class="t-key c-what">what</span> <span class="t-key c-where">where</span> <span class="t-key c-when">when</span> <span class="t-key c-how">how</span> <span class="t-key c-describe">describe</span></li>
      </ul>
    </div>`;
  const act = $('#tAct'), pics = $('#tPics'), lock = $('#tLock');
  act.value = tchoice.act; pics.value = tchoice.pics || `topic:${topic.id}`; lock.checked = tchoice.lock;
  const update = () => {
    tchoice = {act:act.value, pics:pics.value, lock:lock.checked};
    $('#tPicWrap').hidden = act.value.startsWith('sounds:');
    const url = teacherLink();
    $('#tLink').value = url;
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); $('#tQr').innerHTML = q.createSvgTag({cellSize:5, margin:2, scalable:true}); }
    catch(e){ $('#tQr').innerHTML = ''; }
  };
  act.onchange = pics.onchange = lock.onchange = update;
  $('#tCopy').onclick = async () => {
    try { await navigator.clipboard.writeText($('#tLink').value); $('#tCopy').textContent = '✅ Copied'; }
    catch(e){ $('#tLink').select(); document.execCommand('copy'); $('#tCopy').textContent = '✅ Copied'; }
    setTimeout(() => { const b = $('#tCopy'); if (b) b.textContent = '📋 Copy link'; }, 1600);
  };
  $('#tOpen').onclick = () => { location.href = $('#tLink').value; };
  $('#tSettings').onclick = openSettings;
  update();
}
