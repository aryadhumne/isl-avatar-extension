import { textToSigns } from './isl.js';
import { Avatar } from './avatar.js';

const $ = s => document.querySelector(s);
const settings = { speed: 1, source: 'captions' };
chrome.storage.sync.get(settings).then(v => Object.assign(settings, v));
chrome.storage.onChanged.addListener(ch => { for (const k in ch) settings[k] = ch[k].newValue; });

const avatar = new Avatar($('#stage'));
let queue = [], busy = false;

function setStatus(t) { $('#status').textContent = t; }

function renderChips(signs) {
  const box = $('#chips'); box.textContent = '';
  let group = null, wrap = null;
  for (const s of signs) {
    s.el = document.createElement('span');
    s.el.textContent = s.label.replace('_', ' ');
    if (s.kind === 'word') { s.el.className = 'chip'; box.append(s.el); group = null; continue; }
    if (s.group !== group) { wrap = document.createElement('span'); wrap.className = 'spell'; wrap.title = 'Fingerspelled'; box.append(wrap); group = s.group; }
    s.el.className = 'letter'; wrap.append(s.el);
  }
}

function submit(text) {
  text = text.trim(); if (!text) return;
  const { signs } = textToSigns(text);
  $('#caption').textContent = text;
  if (!signs.length) return;
  renderChips(signs); queue.push(...signs);
  if (queue.length > 60) queue.splice(0, queue.length - 60);
  pump();
}

async function pump() {
  if (busy) return; busy = true;
  while (queue.length) {
    const s = queue.shift();
    s.el?.classList.add('on');
    $('#now').textContent = s.label.replace('_', ' ');
    $('#now').dataset.kind = s.kind;
    await avatar.play(s.clip, settings.speed * (queue.length > 10 ? 1.6 : 1), s.kind);
    s.el?.classList.remove('on'); s.el?.classList.add('done');
  }
  busy = false; $('#now').textContent = 'Ready'; $('#now').dataset.kind = 'idle';
}

$('#form').addEventListener('submit', e => { e.preventDefault(); submit($('#text').value); $('#text').value = ''; });
$('#demo').addEventListener('change', e => { if (e.target.value) submit(e.target.value); e.target.value = ''; });

window.addEventListener('message', e => {
  if (e.source !== window.parent || e.data?.source !== 'isl-ext') return;
  if (e.data.type === 'text') submit(e.data.text);
  if (e.data.type === 'status') setStatus(e.data.text);
});

avatar.load(chrome.runtime.getURL('models/isl_hands.glb')).then(mode => {
  setStatus(mode === 'glb' ? 'Avatar model loaded' : 'Preview hands. Add models/isl_hands.glb for real signs.');
  window.parent.postMessage({ source: 'isl-panel', type: 'ready' }, '*');
});
