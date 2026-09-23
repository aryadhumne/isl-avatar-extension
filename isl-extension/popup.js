const $ = id => document.getElementById(id);
chrome.storage.sync.get({ speed: 1, source: 'captions' }).then(v => {
  $('speed').value = v.speed; $('source').value = v.source; $('speedOut').textContent = `${(+v.speed).toFixed(1)}x`;
});
$('speed').oninput = e => { $('speedOut').textContent = `${(+e.target.value).toFixed(1)}x`; chrome.storage.sync.set({ speed: +e.target.value }); };
$('source').onchange = e => chrome.storage.sync.set({ source: e.target.value });
$('toggle').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] });
    window.close();
  } catch {
    $('msg').textContent = 'Chrome does not allow extensions on this page. Open a normal website.';
  }
};
