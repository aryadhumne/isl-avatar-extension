// ISL Number Sign Dictionary (0-10)
// Maps English number words, ordinals, and digits (0-10) directly to ISL number clips.
// Ignores non-number words to keep the avatar focused exclusively on numerical signs.

export const VOCAB = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'
];

const WORD_TO_NUM = {
  zero: '0', '0': '0',
  one: '1', first: '1', '1': '1',
  two: '2', second: '2', '2': '2',
  three: '3', third: '3', '3': '3',
  four: '4', fourth: '4', '4': '4',
  five: '5', fifth: '5', '5': '5',
  six: '6', sixth: '6', '6': '6',
  seven: '7', seventh: '7', '7': '7',
  eight: '8', eighth: '8', '8': '8',
  nine: '9', ninth: '9', '9': '9',
  ten: '10', tenth: '10', '10': '10'
};

function normalize(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function textToSigns(text) {
  const tokens = normalize(text);
  const signs = [];
  for (const t of tokens) {
    if (WORD_TO_NUM[t] !== undefined) {
      const num = WORD_TO_NUM[t];
      signs.push({ kind: 'digit', label: num, clip: num });
    } else if (/^\d+$/.test(t)) {
      // Multi-digit numbers split into constituent 0-9 digits
      for (const d of t) {
        if (WORD_TO_NUM[d] !== undefined) {
          signs.push({ kind: 'digit', label: d, clip: d });
        }
      }
    }
  }
  return {
    signs,
    gloss: signs.map(s => s.label).join(' ')
  };
}
