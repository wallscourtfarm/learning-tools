// Every who + doing pair the cards allow must be finishable:
//   - a doing that needs a what must have at least one what card that fits both the who and the doing;
//   - at Steps 2-3 the child needs a what OR a where, so every pair needs at least one of them.
// Usage: node tests/check-pairs.js  (prints the gaps; exits 1 if any)
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = path.join(__dirname, '..');
const ctx = {}; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^const TOPICS/m, 'var TOPICS'), ctx);
load(path.join(D, 'content.js'));
const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
[...html.matchAll(/topics\/([\w-]+)\.js/g)].forEach(m => load(path.join(D, 'topics', m[1] + '.js')));
const fits = (card, key, val) => !card[key] || card[key].includes(val.id);
let gaps = 0;
for (const tp of ctx.TOPICS) for (const p of tp.pictures){
  for (const w of p.who) for (const d of p.doing){
    if (!fits(d, 'who', w)) continue;
    const whats = p.what.filter(x => fits(x, 'doing', d) && fits(x, 'who', w));
    const wheres = p.where.filter(x => fits(x, 'doing', d) && fits(x, 'who', w));
    if (d.needs === 'what' && !whats.length){ gaps++; console.log(`${tp.id}.${p.id}: "${w.t} ${d.t}…" needs a what, none fits`); }
    else if (d.needs !== 'what' && !whats.length && !wheres.length && d.needs === 'none'){ gaps++; console.log(`${tp.id}.${p.id}: "${w.t} ${d.t}" has no where card that fits (Step 2 needs one)`); }
    else if (d.needs !== 'what' && d.needs !== 'none' && !whats.length && !wheres.length){ gaps++; console.log(`${tp.id}.${p.id}: "${w.t} ${d.t}" has no what or where that fits`); }
  }
}
console.log(gaps ? `\n${gaps} gap(s)` : 'NO GAPS');
process.exit(gaps ? 1 : 0);
