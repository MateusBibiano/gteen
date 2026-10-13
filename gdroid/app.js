/* GDroid · WebGL stage: the team's SPIKE Prime robot (BrickLink Studio models), its four claws,
   the 2026 High mat with the three saídas, and the Sala Inclusiva tactile table. Driven by scroll. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const GD = window.GD, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = THREE.MathUtils.lerp, ease = t => t * t * (3 - 2 * t);
const isMobile = () => innerWidth < 820;

// ---------------- renderer / scene
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 200);
const key = new THREE.DirectionalLight(0xfff1e8, 2.2); key.position.set(5, 9, 7); scene.add(key);
const rim = new THREE.DirectionalLight(0xff3344, 2.6); rim.position.set(-7, 4, -6); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffe3e3, 0x2a0508, .55));
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() });

// ---------------- helpers
const LDU = 1 / 150;
const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer };
const matCache = {};
const matFor = (c, trans) => matCache[c + '|' + trans] ||= new THREE.MeshStandardMaterial({ color: c, roughness: c === 0x1B2A34 ? .5 : .36, metalness: 0, side: THREE.DoubleSide, transparent: !!trans, opacity: trans ? .55 : 1 });
function buildMeshes(meshes, parent, own) {
  const box = new THREE.Box3();
  for (const m of meshes) {
    const q = new Int16Array(b64(m.pos)), f = new Float32Array(q.length); for (let i = 0; i < q.length; i++) f[i] = q[i] / 20 * LDU;
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(f, 3));
    g.setIndex(new THREE.BufferAttribute(m.u32 ? new Uint32Array(b64(m.idx)) : new Uint16Array(b64(m.idx)), 1));
    g = toCreasedNormals(g, Math.PI / 5); g.computeBoundingBox(); box.union(g.boundingBox);
    const mat = own ? matFor(m.color, m.trans).clone() : matFor(m.color, m.trans);
    const mesh = new THREE.Mesh(g, mat); parent.add(mesh);
  }
  return box;
}
async function fetchJSON(url, onp) {
  const res = await fetch(url); const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) { const j = await res.json(); onp(1); return j }
  const rd = res.body.getReader(), chunks = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onp(got / total) }
  return JSON.parse(await new Blob(chunks).text());
}

// ---------------- stage: pedestal, glow, particles
const pedestal = new THREE.Group(); scene.add(pedestal);
{ const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.55, .22, 96), new THREE.MeshStandardMaterial({ color: 0x1a0508, roughness: .55, metalness: .2 })); disc.position.y = -.11; pedestal.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.42, .025, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff3a45, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = .005; pedestal.add(ring);
  for (let i = 1; i <= 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(i * .95, i * .95 + .012, 128), new THREE.MeshBasicMaterial({ color: 0xff6b73, transparent: true, opacity: .22, toneMapped: false })); r.rotation.x = -Math.PI / 2; r.position.y = .006; pedestal.add(r) } }
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c) })();
const dust = (() => { const n = 260, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 22; p[i * 3 + 1] = Math.random() * 9; p[i * 3 + 2] = (Math.random() - .5) * 16 } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff5560, size: .045, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(m); return m })();

// ---------------- robot + claws
const robot = new THREE.Group(); scene.add(robot);
const body = new THREE.Group(); robot.add(body);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; robot.add(shadow);
const PARTS = {};             // key -> {g, home, off}
const OFF = { brick: V(0, 1.7, -.2), lmotorL: V(-1.5, .35, -.4), lmotorR: V(1.5, .35, -.4), wheelL: V(-2.3, .05, .2), wheelR: V(2.3, .05, .2), csensorL: V(0, -.25, 1.9), frame: V(0, 0, 0) };
const CLAWS = [];             // {g, file}
const CLAW_FILES = ['garra_pronta', 'garra_prontav1', 'haste', 'garra_ajuse'];
const CLAW_FIX = [V(0, 0, 0), V(0, 0, 0), V(0, -.37, 0), V(0, .3, 0)];
const engateRing = new THREE.Mesh(new THREE.TorusGeometry(.62, .03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff4a52, transparent: true, opacity: 0, toneMapped: false })); engateRing.rotation.x = Math.PI / 2; engateRing.position.set(0, 1.62, .15); robot.add(engateRing);

let loaded = false;
async function loadAll() {
  const files = ['models/robot.json', ...CLAW_FILES.map(f => `models/${f}.json`)], w = [2.7, 4.4, .8, .1, 1.1], prog = files.map(() => 0);
  const upd = () => { const p = prog.reduce((a, v, i) => a + v * w[i], 0) / w.reduce((a, b) => a + b); $('#ldBar').style.width = (p * 100).toFixed(0) + '%'; $('#ldTxt').textContent = `montando o robô · ${Math.round(p * 100)}%` };
  const data = await Promise.all(files.map((f, i) => fetchJSON(f, p => { prog[i] = p; upd() })));
  const R = data[0];
  for (const [k, g] of Object.entries(R.groups)) {
    const grp = new THREE.Group(); body.add(grp);
    const holder = new THREE.Group(); grp.add(holder);
    const box = buildMeshes(g.meshes, holder, true);
    const c = box.getCenter(V()); const home = k === 'frame' ? V() : c.clone();
    holder.position.copy(home).multiplyScalar(-1); grp.position.copy(home);
    PARTS[k] = { g: grp, holder, home, off: OFF[k] || V(), c };
  }
  data.slice(1).forEach((d, i) => { const g = new THREE.Group(); g.visible = false; robot.add(g); const inner = new THREE.Group(); inner.position.copy(CLAW_FIX[i]); g.add(inner); buildMeshes(d.groups.garra.meshes, inner); CLAWS.push({ g }) });
  loaded = true; $('#loader').classList.add('done'); buildLabels();
  setTimeout(() => ScrollTrigger.refresh(), 300);
}
loadAll().catch(e => { console.error(e); $('#ldTxt').textContent = 'não foi possível carregar o 3D'; setTimeout(() => $('#loader').classList.add('done'), 1500) });

// ---------------- labels for anatomy
const LAB = [['brick', 'Hub SPIKE Prime'], ['lmotorR', 'Motor grande · tração'], ['csensorL', 'Sensor de cor'], ['wheelL', 'Roda'], ['brick', 'Giroscópio (no hub)']];
let labEls = [];
function buildLabels() { const host = $('#plabels'); host.innerHTML = LAB.map(([, t]) => `<div class="plab"><i></i><span>${t}</span></div>`).join(''); labEls = $$('.plab', host) }

// ---------------- mat (round)
const mat = new THREE.Group(); mat.visible = false; scene.add(mat);
const MW = 14, MD = 14 / 2.16;
const uv = ([u, v], y = 0) => V((u - .5) * MW, y, (v - .5) * MD);
{ const tex = new THREE.TextureLoader().load('img/tapete.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(MW, MD), new THREE.MeshStandardMaterial({ map: tex, roughness: .85 })); plane.rotation.x = -Math.PI / 2; mat.add(plane);
  const bm = new THREE.MeshStandardMaterial({ color: 0x170306, roughness: .6 });
  [[0, -MD / 2 - .15, MW + .6, .3], [0, MD / 2 + .15, MW + .6, .3]].forEach(([x, z, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .4, d), bm); b.position.set(x, .2, z); mat.add(b) });
  [[-MW / 2 - .15, 0], [MW / 2 + .15, 0]].forEach(([x, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.3, .4, MD), bm); b.position.set(x, .2, z); mat.add(b) }); }
const SAIDAS = [
  { pts: [[.06, .6], [.085, .72], [.1, .84], [.13, .885], [.165, .82], [.12, .68], [.065, .6]], claw: 2, t0: 0, t1: 9, title: 'Coleta', num: 'Saída 1 · haste de coleta', text: 'O robô recolhe o triângulo, o quadrado e o hexágono do Ajuste Geométrico e volta para a base, onde os blocos são encaixados na garra.', ev: [] },
  { pts: [[.06, .6], [.12, .7], [.2, .8], [.27, .865]], claw: 3, t0: 9, t1: 20, title: 'Entrega', num: 'Saída 2 · garra de entrega', text: 'Os blocos são entregues no lugar exato para garantir a pontuação máxima. Depois, o robô é trazido de volta à base para a troca de garra.', ev: [[1, 'Ajuste Geométrico', 85]] },
  { pts: [[.06, .6], [.2, .585], [.36, .57], [.49, .56], [.6, .63], [.67, .8], [.8, .83], [.915, .66], [.87, .5], [.73, .4], [.6, .27], [.72, .41], [.86, .46]], claw: 0, t0: 20, t1: 118, title: 'A grande volta', num: 'Saída 3 · garra principal', text: 'Acesso Seguro, bloco quadricular, alinhamento na rampa da universidade, triângulos (incluindo o dourado), entrega no campus e, por fim, o pátio da universidade.', ev: [[.26, 'Acesso Seguro', 50], [.6, 'Acessibilidade', 25], [.83, 'Edificação do Campus', 80], [1, 'Ingresso na Universidade', 100]] }];
const CURVES = SAIDAS.map(s => new THREE.CatmullRomCurve3(s.pts.map(p => uv(p, .03)), false, 'centripetal', .5));
const trails = CURVES.map((c, i) => { const g = new THREE.TubeGeometry(c, 260, .035, 6); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: [0xff4a52, 0xf2b33d, 0x36aebf][i], transparent: true, opacity: .95, toneMapped: false })); m.position.y = .02; g.setDrawRange(0, 0); m.userData.n = g.index.count; mat.add(m); return m });
const pm = c => new THREE.MeshStandardMaterial({ color: c, roughness: .45 });
const props = {};
{ // Ajuste geométrico shapes
  const tri = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 3), pm(0xd9a21b)), sq = new THREE.Mesh(new THREE.BoxGeometry(.24, .1, .24), pm(0x2e9a55)), hex = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .1, 6), pm(0x3d7bea));
  props.shapes = [tri, sq, hex]; const st = [[.095, .89], [.135, .875], [.06, .86]]; props.shapes.forEach((m, i) => { m.position.copy(uv(st[i], .05)); m.userData.start = m.position.clone(); mat.add(m) });
  props.drop = [[.25, .85], [.27, .87], [.29, .85]].map(p => uv(p, .05));
  // carrinho
  const car = new THREE.Group(); const cb = new THREE.Mesh(new THREE.BoxGeometry(.5, .16, .28), pm(0xd8352f)); cb.position.y = .14; car.add(cb); const cab = new THREE.Mesh(new THREE.BoxGeometry(.24, .13, .24), pm(0xf4f4f4)); cab.position.set(-.05, .28, 0); car.add(cab); [-.16, .16].forEach(x => [-.15, .15].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .05, 14), pm(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, .06, z); car.add(w) }));
  car.position.copy(uv([.4, .56])); mat.add(car); props.car = car; props.carA = uv([.4, .56]); props.carB = uv([.49, .56]);
  // rampa
  const ramp = new THREE.Group(); const rp = new THREE.Mesh(new THREE.BoxGeometry(.7, .04, .5), pm(0xe8d9c0)); rp.position.x = .35; ramp.add(rp); ramp.position.copy(uv([.9, .74], .02)); ramp.rotation.z = 1.1; mat.add(ramp); props.ramp = ramp;
  // triângulo dourado
  const gold = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .12, 3), new THREE.MeshStandardMaterial({ color: 0xf2b33d, metalness: .7, roughness: .25 })); gold.position.copy(uv([.87, .48], .1)); mat.add(gold); props.gold = gold; props.goldA = gold.position.clone(); props.goldB = uv([.6, .27], .1);
  // checkpoint rings
  props.rings = []; SAIDAS.forEach((s, si) => s.ev.forEach(([f]) => { const r = new THREE.Mesh(new THREE.RingGeometry(.35, .42, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false })); r.rotation.x = -Math.PI / 2; r.position.copy(CURVES[si].getPointAt(Math.min(.999, f))).setY(.04); mat.add(r); props.rings.push({ r, si, f }) })) }

// ---------------- tactile table (Mérito Científico)
const mesa = new THREE.Group(); mesa.visible = false; scene.add(mesa);
const PW = 30, PH = 20, PIN = new THREE.CylinderGeometry(.075, .075, 1, 10); PIN.translate(0, .5, 0);
const pinMat = new THREE.MeshStandardMaterial({ color: 0xd8c39b, metalness: .55, roughness: .32 });
const pins = new THREE.InstancedMesh(PIN, pinMat, PW * PH); mesa.add(pins);
const PROTO = 5, pinsP = new THREE.InstancedMesh(new THREE.CylinderGeometry(.34, .34, 1, 24).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: 0xd8c39b, metalness: .5, roughness: .3 }), PROTO * PROTO); mesa.add(pinsP);
const FIELD = { w: 5.2, d: 3.5, x: -.6 };
const hCur = new Float32Array(PW * PH), hTgt = new Float32Array(PW * PH), hDelay = new Float32Array(PW * PH), pCur = new Float32Array(25), pTgt = new Float32Array(25);
const btns = [];
{ const top = new THREE.Mesh(new THREE.BoxGeometry(7.4, .32, 4.6), new THREE.MeshStandardMaterial({ color: 0x141012, roughness: .5 })); top.position.y = 2.2; mesa.add(top);
  const band = new THREE.Mesh(new THREE.BoxGeometry(7.5, .12, 4.7), new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: .6 })); band.position.y = 2.0; mesa.add(band);
  const well = new THREE.Mesh(new THREE.BoxGeometry(FIELD.w + .3, .05, FIELD.d + .3), new THREE.MeshStandardMaterial({ color: 0x050304, roughness: .9 })); well.position.set(FIELD.x, 2.37, 0); mesa.add(well);
  const lm = new THREE.MeshStandardMaterial({ color: 0x141012, roughness: .55 }); [[-3.4, -2], [3.4, -2], [-3.4, 2], [3.4, 2]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.32, 2, .32), lm); l.position.set(x, 1, z); mesa.add(l) });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, 3.4), new THREE.MeshStandardMaterial({ color: 0x0c0a0b, roughness: .4 })); strip.position.set(2.9, 2.38, 0); mesa.add(strip);
  [0x3d7bea, 0x3fb86a, 0xf09a2b, 0x9a64e0].forEach((c, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .14, 28), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .25, roughness: .3 })); b.position.set(2.9, 2.45, -1.05 + i * .7); mesa.add(b); btns.push({ b, t: 0 }) });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .01; mesa.add(sh) }
const pinXZ = (i, j, n, m) => [FIELD.x + (i + .5) / n * FIELD.w - FIELD.w / 2, (j + .5) / m * FIELD.d - FIELD.d / 2];
const PAT = {
  graf: (u, v) => { const bars = [.35, .7, .5, .95, .62]; const k = Math.floor(u * 5.999), fu = u * 5 - k; const inBar = fu > .18 && fu < .82; const hb = bars[k]; const axis = (u < .04 || v > .94) ? .25 : 0; return Math.max(axis, inBar && (1 - v) < hb + .05 ? .25 + .75 * hb : 0) },
  mapa: (u, v) => { const g = (x, y, s) => Math.exp(-((u - x) ** 2 + ((v - y) * 1.3) ** 2) / s); const land = g(.4, .45, .05) + .8 * g(.62, .55, .03) + .6 * g(.3, .7, .02) + .5 * g(.7, .3, .015); const ridge = .6 * g(.45, .42, .006) + .5 * g(.6, .5, .004); const h = land * .55 + ridge; return h > .18 ? Math.min(1, h) : 0 },
  tri: (u, v) => { const x = u - .5, y = v - .55; const a = (y > -.38) && (y < .3) && (Math.abs(x) < (y + .38) * .62); const edge = a && (y > .25 || Math.abs(x) > (y + .38) * .62 - .05); return edge ? 1 : a ? .3 : 0 },
  onda: (u, v) => { const yc = .5 - .32 * Math.sin(u * Math.PI * 2.2); const d = Math.abs(v - yc); return d < .05 ? 1 : (Math.abs(v - .5) < .02 || u < .03) ? .28 : 0 } };
let mesaMode = 'graf', mesaRes = 'full';
function setPattern(m) { mesaMode = m; for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) { const k = j * PW + i; hTgt[k] = PAT[m]((i + .5) / PW, (j + .5) / PH); hDelay[k] = performance.now() + (Math.hypot(i - PW / 2, j - PH / 2)) * 28 } for (let j = 0; j < PROTO; j++) for (let i = 0; i < PROTO; i++) pTgt[j * PROTO + i] = PAT[m]((i + .5) / PROTO, (j + .5) / PROTO) }
setPattern('graf');
GD.on('mesa', setPattern); GD.on('mesaRes', r => { mesaRes = r });
GD.on('btn', i => { btns[i].t = 1 });
const dummy = new THREE.Object3D();

// ---------------- claw selection (garras chapter)
let clawSel = 0, clawAnim = { from: -1, to: 0, t: 1 };
GD.on('garra', i => { if (i === clawSel) return; clawAnim = { from: clawSel, to: i, t: 0 }; clawSel = i });

// ---------------- chapter keyframes
// state: tx,ty,tz target · dist, el (elevation rad), az (azimuth rad) · yaw · ex explode · sc robot scale · ped (pedestal) · m mat · me mesa
const KF = {
  hero: p => ({ tx: isMobile() ? 0 : -2.5, ty: isMobile() ? 3.4 : 1.75, tz: 0, dist: isMobile() ? 21 : 13.5, el: .2 + p * .12, az: -.25 + p * .5, yaw: p * Math.PI * 1.15, ex: 0, sc: 1, ped: 1, m: 0, me: 0, claw: 0 }),
  anat: p => ({ tx: 0, ty: 1.15 + .3 * ease(clamp((p - .1) / .3)), tz: 0, dist: isMobile() ? 15 : lerp(10.5, 12, ease(clamp((p - .1) / .3))), el: .3, az: lerp(-.7, .55, p), yaw: .25, ex: ease(clamp((p - .08) / .3)) * (1 - ease(clamp((p - .9) / .09))), sc: 1, ped: 1, m: 0, me: 0, claw: p > .97 ? 0 : -1, hi: p < .3 || p > .9 ? -1 : Math.min(4, Math.floor((p - .3) / .12)) }),
  garras: p => ({ tx: isMobile() ? 0 : .4, ty: isMobile() ? -.4 : 1.9, tz: 0, dist: isMobile() ? 20 : 13.5, el: .22, az: .55, yaw: 0, ex: 0, sc: 1, ped: 1, m: 0, me: 0, claw: 'sel' }),
  round: p => ({ D: clamp((p - .06) / .88) * 3, tx: 0, ty: 0, tz: .3, dist: isMobile() ? 19 : 14.5, el: .95, az: 0, yaw: 0, ex: 0, sc: .36, ped: 0, m: 1, me: 0, claw: 'round', cine: 1 }),
  mesa: p => ({ tx: isMobile() ? 0 : .2, ty: isMobile() ? -2.2 : 2.6, tz: 0, dist: isMobile() ? 28 : 12.5, el: .62, az: -.35, yaw: 0, ex: 0, sc: 1, ped: 0, m: 0, me: 1, claw: -1 }) };
const CHAPS = $$('.chap').map(el => ({ el, seg: el.dataset.seg }));
const S = { tx: 0, ty: 1.4, tz: 0, dist: 10.5, el: .2, az: 0, yaw: 0, ex: 0, sc: 1, ped: 1, m: 0, me: 0 };
let T = KF.hero(0), active = 'hero', snap = true;
function pickChapter() {
  const H = innerHeight; let best = null;
  for (const c of CHAPS) { const r = c.el.getBoundingClientRect(); if (r.top < H && r.bottom > 0) { const p = clamp(-r.top / Math.max(1, r.height - H)); return { c, p, covered: false } } }
  let bd = 1e9; for (const c of CHAPS) { const r = c.el.getBoundingClientRect(); const d = r.top > 0 ? r.top : -r.bottom; if (d < bd) { bd = d; best = { c, p: r.top > 0 ? 0 : 1, covered: true } } }
  return best;
}

// ---------------- pointer: rotate robot (hero / garras)
let userYaw = 0, userYawT = 0, drag = null, mx = 0, my = 0;
canvas.addEventListener('pointerdown', e => { if (active !== 'hero' && active !== 'garras' && active !== 'anat') return; drag = { x: e.clientX, y0: userYawT }; canvas.setPointerCapture(e.pointerId) });
canvas.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; if (drag) userYawT = drag.y0 + (e.clientX - drag.x) * .012 });
const up = () => drag = null; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

// ---------------- round state
let lastPts = -1, lastSaida = -1, toastT = 0;
const toast = $('#toast');
function roundAt(D) {
  const si = Math.min(2, Math.floor(D)), f = clamp(D - si), s = SAIDAS[si];
  const pos = CURVES[si].getPointAt(Math.min(.999, f)), tan = CURVES[si].getTangentAt(Math.min(.999, f));
  // points & time
  let pts = 0; SAIDAS.forEach((ss, k) => ss.ev.forEach(([ef, , p]) => { if (k < si || (k === si && f >= ef - .001)) pts += p }));
  const sec = Math.round(lerp(s.t0, s.t1, f));
  return { si, f, pos, tan, pts, sec };
}

// ---------------- frame loop
const tmp = V(), tmp2 = V(), clock = new THREE.Clock();
let ldone = false;
function frame() {
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  const pk = pickChapter();
  if (pk) { if (pk.c.seg !== active) snap = true; active = pk.c.seg; T = KF[active](pk.p); if (pk.covered) snap = true }
  const k = snap ? 1 : 1 - Math.exp(-dt * 5.5); snap = false;
  for (const key of ['tx', 'ty', 'tz', 'dist', 'el', 'az', 'ex', 'sc', 'ped', 'm', 'me']) S[key] += (T[key] - S[key]) * k;
  // yaw: wrap-safe
  const yawT = (T.yaw || 0) + (active === 'hero' && !RM ? t * .18 : 0);
  S.yaw += (yawT - S.yaw) * k;
  userYaw += (userYawT - userYaw) * (1 - Math.exp(-dt * 8));
  if (!drag && active !== 'hero') userYawT *= .985;

  // visibility
  pedestal.visible = S.ped > .02 && S.m < .5 && S.me < .5; pedestal.scale.setScalar(.6 + .4 * S.ped);
  mat.visible = S.m > .02; mesa.visible = S.me > .02;
  robot.visible = loaded && S.me < .5;
  dust.visible = active !== 'round'; dust.rotation.y = t * .02; dust.position.y = Math.sin(t * .3) * .2;

  // robot pose
  robot.scale.setScalar(S.sc);
  if (active === 'round' && T.D != null) {
    const R = roundAt(T.D);
    robot.position.copy(R.pos).setY(.02);
    const yawPath = Math.atan2(R.tan.x, R.tan.z);
    robot.rotation.y = yawPath;
    // claw for this saída
    CLAWS.forEach((c, i) => c.g.visible = i === SAIDAS[R.si].claw);
    // trails
    trails.forEach((m, i) => m.geometry.setDrawRange(0, i < R.si ? m.userData.n : i === R.si ? Math.floor(m.userData.n * R.f / 6) * 6 : 0));
    // props
    const s1 = R.si > 0 ? 1 : R.f; const pick = clamp((s1 - .45) / .15); const fw = tmp.set(Math.sin(yawPath), 0, Math.cos(yawPath));
    props.shapes.forEach((m, i) => { if (R.si === 0) { const carry = tmp2.copy(robot.position).addScaledVector(fw, .55).add(V((i - 1) * .22, .1, 0)); m.position.copy(m.userData.start).lerp(carry, pick) } else if (R.si === 1) { const carry = tmp2.copy(robot.position).addScaledVector(fw, .5).add(V((i - 1) * .2, .14, 0)); m.position.copy(carry).lerp(props.drop[i], clamp((R.f - .85) / .15)) } else m.position.copy(props.drop[i]) });
    const carK = R.si < 2 ? 0 : clamp((R.f - .16) / .1); props.car.position.copy(props.carA).lerp(props.carB, carK);
    props.ramp.rotation.z = R.si < 2 ? 1.1 : lerp(1.1, 0, clamp((R.f - .55) / .06));
    const gk = R.si < 2 ? 0 : clamp((R.f - .66) / .05), gd = R.si < 2 ? 0 : clamp((R.f - .8) / .04);
    if (gk > 0 && gd < 1) props.gold.position.copy(robot.position).addScaledVector(fw, .5).setY(.35); else props.gold.position.copy(gd >= 1 ? props.goldB : props.goldA);
    props.rings.forEach(o => { const lv = o.si < R.si ? 2 : o.si === R.si ? (R.f - o.f) / .06 : -1; const kk = clamp(lv); o.r.material.opacity = lv > 0 && lv < 1 ? (1 - kk) * .9 : 0; o.r.scale.setScalar(.6 + kk * 1.8) });
    // HUD
    if (R.pts !== lastPts) { if (lastPts >= 0 && R.pts > lastPts) { const ev = SAIDAS.flatMap(s => s.ev).find(e => e[2] === R.pts - lastPts); toast.textContent = `+${R.pts - lastPts} · ${ev ? ev[1] : ''}`; gsap.fromTo(toast, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 1.6, ease: 'power2.out' }) } lastPts = R.pts; $('#hP').textContent = String(R.pts).padStart(3, '0') }
    $('#hT').innerHTML = String(R.sec).padStart(3, '0') + '<small>s</small>';
    if (R.si !== lastSaida) { lastSaida = R.si; const s = SAIDAS[R.si]; $('#hS').innerHTML = (R.si + 1) + '<small>/3</small>'; $('#sNum').textContent = s.num; $('#sTitle').textContent = s.title; $('#sText').textContent = s.text; $$('#sDots i').forEach((d, j) => d.classList.toggle('on', j <= R.si)) }
    // camera follows loosely
    S.tx += (lerp(0, robot.position.x, .45) - S.tx) * k; S.tz += (lerp(.3, robot.position.z, .35) - S.tz) * k;
  } else {
    robot.position.set(0, 0, 0);
    robot.rotation.y = S.yaw + userYaw;
    // claws
    if (T.claw === 'sel') {
      clawAnim.t = Math.min(1, clawAnim.t + dt * 1.6);
      CLAWS.forEach((c, i) => { const isTo = i === clawAnim.to, isFrom = i === clawAnim.from; c.g.visible = isTo || (isFrom && clawAnim.t < .5); if (isFrom) { const a = ease(clamp(clawAnim.t * 2)); c.g.position.set(0, a * 3.2, 0); c.g.rotation.x = -a * .3 } if (isTo) { const a = 1 - ease(clamp(clawAnim.t * 2 - .6)); c.g.position.set(0, a * 3.6, 0); c.g.rotation.x = a * .25 } });
      engateRing.material.opacity = clawAnim.t < 1 ? .9 * Math.sin(clawAnim.t * Math.PI) : .25 + .2 * Math.sin(t * 3);
    } else {
      CLAWS.forEach((c, i) => { c.g.visible = T.claw === i && S.ex < .05; c.g.position.set(0, 0, 0); c.g.rotation.x = 0 });
      engateRing.material.opacity = 0;
    }
  }
  // explode + highlight
  const hi = T.hi ?? -1, hiKeys = [['brick'], ['lmotorL', 'lmotorR'], ['csensorL'], ['wheelL', 'wheelR'], ['brick']][hi] || [];
  for (const [key, P] of Object.entries(PARTS)) {
    const e = ease(clamp(S.ex * 1.15 - (key === 'frame' ? 0 : .08)));
    P.g.position.copy(P.home).addScaledVector(P.off, e); P.g.position.y += Math.sin(t * 1.3 + P.home.x) * .05 * e;
    const on = hiKeys.includes(key); P.g.traverse(o => { if (o.isMesh) { o.material.emissive.setHex(0xff2030); o.material.emissiveIntensity = on ? .25 + .2 * Math.sin(t * 5) : 0 } });
  }
  // labels
  if (labEls.length) labEls.forEach((el, i) => { const [key] = LAB[i]; const P = PARTS[key]; const show = active === 'anat' && S.ex > .6 && (hi === i || hi < 0) && P; el.style.opacity = show ? 1 : 0; if (show) { P.g.getWorldPosition(tmp); tmp.y += i === 4 ? .9 : .55; tmp.project(camera); el.style.transform = `translate(${((tmp.x * .5 + .5) * innerWidth).toFixed(1)}px,${((-tmp.y * .5 + .5) * innerHeight).toFixed(1)}px)` } });
  $$('#anatList .panel').forEach((p, i) => p.classList.toggle('on', i === hi));

  // tactile table
  if (mesa.visible) {
    const now = performance.now(), full = mesaRes === 'full'; pins.visible = full; pinsP.visible = !full;
    if (full) { for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) { const kk = j * PW + i; if (now > hDelay[kk]) hCur[kk] += (hTgt[kk] - hCur[kk]) * (1 - Math.exp(-dt * 9)); const [x, z] = pinXZ(i, j, PW, PH); dummy.position.set(x, 2.38, z); dummy.scale.set(1, .06 + hCur[kk] * .55, 1); dummy.updateMatrix(); pins.setMatrixAt(kk, dummy.matrix) } pins.instanceMatrix.needsUpdate = true }
    else { for (let j = 0; j < PROTO; j++) for (let i = 0; i < PROTO; i++) { const kk = j * PROTO + i; pCur[kk] += (pTgt[kk] - pCur[kk]) * (1 - Math.exp(-dt * 6)); const [x, z] = pinXZ(i, j, PROTO, PROTO); dummy.position.set(x, 2.38, z); dummy.scale.set(1, .08 + pCur[kk] * .6, 1); dummy.updateMatrix(); pinsP.setMatrixAt(kk, dummy.matrix) } pinsP.instanceMatrix.needsUpdate = true }
    btns.forEach(o => { o.t = Math.max(0, o.t - dt * .6); o.b.position.y = 2.45 - (o.t > .85 ? .06 : 0); o.b.material.emissiveIntensity = .25 + o.t * 2.2 });
    mesa.rotation.y = Math.sin(t * .15) * .08;
  }

  // camera (spherical around target) + mouse parallax
  const az = S.az + (RM ? 0 : mx * .12), el = S.el + (RM ? 0 : my * .05);
  camera.position.set(S.tx + S.dist * Math.cos(el) * Math.sin(az), S.ty + S.dist * Math.sin(el), S.tz + S.dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(S.tx, S.ty, S.tz);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
