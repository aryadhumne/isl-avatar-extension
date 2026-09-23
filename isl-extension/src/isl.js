// Rule-based English -> ISL-style gloss. Limited prototype, not full ISL grammar.
// Every name here must match an animation clip name in isl_hands.glb.
export const VOCAB = [
  'HELLO','THANK_YOU','PLEASE','SORRY','YES','NO','NOT','HELP',
  'I','YOU','MY','NAME','FATHER','MOTHER','FRIEND','TEACHER','STUDENT',
  'HAVE','WANT','GO','COME','SEE','LIKE','LOVE','LEARN','WORK','EAT','DRINK','VISIT',
  'SCHOOL','OFFICE','HOME','COMPUTER','SCIENCE','BOOK','WATER','FOOD',
  'GOOD','MORNING','TODAY','TOMORROW','WHAT','WHERE','HOW','WHY'
];
const V = new Set(VOCAB);
const STOP = new Set(('is am are was were be been being to the a an of at in on for with and or ' +
  'that this it as by from do does did will would').split(' '));
const IRREGULAR = { me: 'I', i: 'I', mine: 'MY', went: 'GO', gone: 'GO', goes: 'GO',
  ate: 'EAT', drank: 'DRINK', saw: 'SEE', came: 'COME', thanks: 'THANK_YOU' };

function normalize(text) {
  return text.toLowerCase()
    .replace(/\bcan['’]t\b/g, 'can not').replace(/\bwon['’]t\b/g, 'will not')
    .replace(/n['’]t\b/g, ' not').replace(/['’]m\b/g, ' am')
    .replace(/['’](re|s|ve|ll|d)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function lookup(w) {
  if (IRREGULAR[w]) return IRREGULAR[w];
  const up = w.toUpperCase();
  const tries = [up];
  if (w.length < 4) return V.has(up) ? up : null;
  if (w.endsWith('ing')) tries.push(up.slice(0, -3), up.slice(0, -3) + 'E');
  if (w.endsWith('es')) tries.push(up.slice(0, -2));
  if (w.endsWith('s')) tries.push(up.slice(0, -1));
  if (w.endsWith('ed')) tries.push(up.slice(0, -2), up.slice(0, -1));
  return tries.find(t => V.has(t)) || null;
}

function spell(word) {
  return [...word.toUpperCase()].map(c => ({
    kind: /\d/.test(c) ? 'digit' : 'letter', label: c, clip: c, group: word.toUpperCase()
  }));
}

export function textToSigns(text) {
  const tokens = normalize(text), signs = [];
  for (let i = 0; i < tokens.length;) {
    let hit = null;
    for (const n of [3, 2]) {
      const key = tokens.slice(i, i + n).join('_').toUpperCase();
      if (i + n <= tokens.length && V.has(key)) { hit = { key, n }; break; }
    }
    if (hit) { signs.push({ kind: 'word', label: hit.key, clip: hit.key }); i += hit.n; continue; }
    const t = tokens[i++];
    if (STOP.has(t)) continue;
    const known = lookup(t);
    if (known) signs.push({ kind: 'word', label: known, clip: known });
    else signs.push(...spell(t));
  }
  return { signs, gloss: signs.map(s => s.group || s.label).filter((g, i, a) => g !== a[i - 1]).join(' ') };
}
