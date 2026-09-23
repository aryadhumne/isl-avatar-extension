import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const norm = n => n.toUpperCase().replace(/[\s-]+/g, '_');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function rng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

export class Avatar {
  constructor(canvas) {
    this.canvas = canvas; this.mode = 'none'; this.clips = new Map();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0.3, 4.4); this.camera.lookAt(0, 0.3, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7f86, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 3, 4); this.scene.add(key);
    this.clock = new THREE.Clock();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      const dt = this.clock.getDelta();
      this.mixer?.update(dt); this.tickPlaceholder?.(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }
  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  async load(url) {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      this.scene.add(gltf.scene);
      const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const dist = (Math.max(size.y, size.x / this.camera.aspect) / 2) / Math.tan(THREE.MathUtils.degToRad(17.5)) * 1.25;
      this.camera.position.set(c.x, c.y, c.z + dist); this.camera.lookAt(c);
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach(a => this.clips.set(norm(a.name), a));
      this.mode = 'glb';
    } catch { this.buildPlaceholder(); this.mode = 'placeholder'; }
    return this.mode;
  }
  has(clip) { return this.mode === 'placeholder' || this.clips.has(norm(clip)); }

  play(clip, speed = 1, kind = 'word') {
    return this.mode === 'glb' ? this.playClip(clip, speed) : this.playPlaceholder(clip, speed, kind);
  }
  async playClip(name, speed) {
    const clip = this.clips.get(norm(name));
    if (!clip) { await sleep(400); return false; }
    this.mixer.stopAllAction();
    const a = this.mixer.clipAction(clip);
    a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = speed; a.fadeIn(0.1).play();
    await Promise.race([
      new Promise(res => { const done = e => { if (e.action === a) { this.mixer.removeEventListener('finished', done); res(); } }; this.mixer.addEventListener('finished', done); }),
      sleep((clip.duration / speed) * 1000 + 600)
    ]);
    return true;
  }

  // ---- Placeholder hands (used until isl_hands.glb exists) ----
  buildPlaceholder() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe0a987, roughness: 0.65 });
    const make = sgn => {
      const g = new THREE.Group(), fingers = [];
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.16), skin));
      const seg = (len) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 10), skin); m.position.y = len / 2; return m; };
      [0.3, 0.34, 0.36, 0.32].forEach((len, i) => {
        const p1 = new THREE.Group(); p1.position.set(-0.18 + i * 0.12, 0.275, 0); p1.add(seg(len));
        const p2 = new THREE.Group(); p2.position.y = len; p2.add(seg(len * 0.8)); p1.add(p2); g.add(p1); fingers.push([p1, p2]);
      });
      const t1 = new THREE.Group(); t1.position.set(0.28 * sgn, -0.12, 0); t1.add(seg(0.26));
      const t2 = new THREE.Group(); t2.position.y = 0.26; t2.add(seg(0.2)); t1.add(t2); g.add(t1); fingers.push([t1, t2]);
      this.scene.add(g); return { g, fingers, sgn };
    };
    this.hands = [make(1), make(-1)];
    this.hands.forEach(h => {
      h.cur = { pos: [0.9 * h.sgn, -0.6, 0], rot: 0, curl: [0.2, 0.2, 0.2, 0.2, 0.2] };
      h.tgt = structuredClone(h.cur);
    });
    this.tickPlaceholder = dt => {
      const k = 1 - Math.exp(-dt * 9);
      for (const h of this.hands) {
        for (let i = 0; i < 3; i++) h.cur.pos[i] += (h.tgt.pos[i] - h.cur.pos[i]) * k;
        h.cur.rot += (h.tgt.rot - h.cur.rot) * k;
        h.g.position.set(...h.cur.pos); h.g.rotation.z = h.cur.rot;
        h.fingers.forEach(([a, b], i) => {
          h.cur.curl[i] += (h.tgt.curl[i] - h.cur.curl[i]) * k; const c = h.cur.curl[i];
          if (i < 4) { a.rotation.x = c * 1.4; b.rotation.x = c * 1.2; } else { a.rotation.z = h.sgn * (-0.3 - c * 0.9); b.rotation.z = h.sgn * -c * 0.6; }
        });
      }
    };
  }
  async playPlaceholder(name, speed, kind) {
    const r = rng(name);
    this.hands.forEach(h => {
      h.tgt.pos = [h.sgn * (0.55 + r() * 0.5), -0.2 + r() * 0.9, r() * 0.4];
      h.tgt.rot = h.sgn * (r() - 0.5) * 1.2;
      h.tgt.curl = h.tgt.curl.map(() => (r() > 0.5 ? 0.85 : 0.05));
    });
    await sleep((kind === 'word' ? 1100 : 650) / speed);
    return true;
  }
}
