/* GDroid · editorial interactions (no WebGL here). Exposes window.GD for the 3D module. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const brl = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const GD = window.GD = { bus: new EventTarget(), emit(t, d) { this.bus.dispatchEvent(new CustomEvent(t, { detail: d })) }, on(t, f) { this.bus.addEventListener(t, e => f(e.detail)) } };
  gsap.registerPlugin(ScrollTrigger);

  // ---- smooth scroll
  let lenis = null;
  if (!RM && window.Lenis) { lenis = new Lenis({ lerp: .11, smoothWheel: true }); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0) }
  GD.lenis = lenis;
  const goto = id => { const el = document.getElementById(id); if (!el) return; lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.4 }) : el.scrollIntoView({ behavior: 'smooth' }) };

  // ---- split words for headline reveals
  function splitWords(el) { const walk = n => [...n.childNodes].forEach(c => { if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.append(' '); return } const o = document.createElement('span'); o.className = 'w'; const i = document.createElement('span'); i.textContent = w; o.append(i); f.append(o) }); c.replaceWith(f) } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c) }); walk(el) }
  $$('.split').forEach(splitWords);
  { const m = $('#manifesto'); splitWords(m); m.classList.remove('split') }

  // ---- reveal on view (IntersectionObserver, robust to layout changes)
  const REV = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); const f = REV.get(e.target); REV.delete(e.target); f && f() }), { rootMargin: '0px 0px -8% 0px' });
  const onView = (el, hide, show) => { if (!el) return; if (RM) { show && show(); return } hide && hide(); let done = false; const go = () => { if (done) return; done = true; show && show() }; REV.set(el, go); io.observe(el); ScrollTrigger.create({ trigger: el, start: 'top 94%', once: true, onEnter: go }) };
  GD.onView = onView;
  $$('.split').forEach(el => { const w = $$('.w>span', el); onView(el, () => gsap.set(w, { yPercent: 110 }), () => gsap.to(w, { yPercent: 0, duration: 1.1, stagger: .045, ease: 'expo.out' })) });
  setTimeout(() => $$('.split .w>span').forEach(s => { if (gsap.getProperty(s, 'yPercent') > 100 && s.getBoundingClientRect().top < innerHeight) gsap.to(s, { yPercent: 0, duration: .6 }) }), 2600);
  $$('.card, .stat, .pola, .post, .si-card, .yr-card, .steps .card').forEach(el => { if (el.closest('.chap')) return; onView(el, () => gsap.set(el, { y: 40, opacity: 0 }), () => gsap.to(el, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' })) });
  $$('[data-count]').forEach(el => { const v = +el.dataset.count, o = { n: 0 }; onView(el, () => el.textContent = '0', () => gsap.to(o, { n: v, duration: 1.8, ease: 'power3.out', onUpdate: () => el.textContent = brl(Math.round(o.n)) })) });
  gsap.to($$('#manifesto .w'), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '#manifesto', start: 'top 82%', end: 'bottom 45%', scrub: true } });
  $$('.band img.bg').forEach(img => gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.to('#prog', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  // ---- menu + chapter label
  const NAMED = $$('main [data-name]');
  $('#menuList').innerHTML = NAMED.map((s, i) => `<li><a href="#${s.id}" data-goto="${s.id}"><span>${String(i + 1).padStart(2, '0')}</span>${s.dataset.name}</a></li>`).join('');
  const menu = $('#menu'), mb = $('#menuBtn');
  const setMenu = o => { menu.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); if (lenis) o ? lenis.stop() : lenis.start() };
  mb.onclick = () => setMenu(true); $('#menuClose').onclick = () => setMenu(false);
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false) });
  document.addEventListener('click', e => { const a = e.target.closest('[data-goto]'); if (!a) return; e.preventDefault(); setMenu(false); goto(a.dataset.goto) });
  $('.brand').onclick = e => { e.preventDefault(); goto('c-hero') };
  NAMED.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: e => { if (e.isActive) $('#chapLabel').textContent = `${String(i + 1).padStart(2, '0')} · ${s.dataset.name}` } }));
  $('#toTop').onclick = () => goto('c-hero');
  $$('[data-copy]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = 'Copiado ✓'; setTimeout(() => b.textContent = t, 1600) } catch (e) { } });

  // ---- members ring (CSS 3D, rotating, draggable)
  const MEMBERS = [['Henrique Ribas Vieira Esper', 'Líder geral de Tecnologia', ['TEC', 'DP'], 'henrique'], ['Priscilla Gabriely de Oliveira', 'Líder geral de Organização', ['MC', 'ORG'], 'priscilla'], ['Lorenzo Rodrigues Quireli', 'Operador de Mesa', ['TEC', 'DP'], 'lorenzo'], ['Carlos Henrique Cavalcanti Robertson Schmitz', 'Redator TEC', ['TEC'], 'carlos'], ['Valentina Barbosa Marcellini', 'Gestora de ORG', ['MC', 'ORG'], 'valentina'], ['José Levy de Lacerda de Oliveira', 'Gestor de Mérito', ['MC'], 'jose'], ['Daniel Ferreira Olimpio', 'Apoio Técnico', ['TEC', 'DP'], 'daniel'], ['Ana Júlia Matos Fernandes', 'Redatora ORG', ['ORG'], 'ana'], ['Mariana Ramos Pedroso', 'Marketing', ['ORG'], 'mariana'], ['Clara Salomon', 'Pesquisadora', ['MC'], 'clara']];
  const ring = $('#ring'), stage = $('#ringStage'), N = MEMBERS.length;
  ring.innerHTML = MEMBERS.map(([n, r, a, img], i) => `<article class="mcard" data-a="${a.join(' ')}" data-i="${i}" tabindex="0" aria-label="${n}, ${r}"><div class="ar">${a.map(x => `<i class="${x}">${x}</i>`).join('')}</div><div class="av"><img src="img/m-${img}.webp" alt="" loading="lazy"></div><h4>${n.split(' ').slice(0, 2).join(' ')}</h4><span class="role">${r}</span></article>`).join('');
  const cards = $$('.mcard', ring);
  let rot = 0, rotT = 0, vel = 0, dragging = false, lastX = 0, idle = 0;
  const R = () => Math.max(330, Math.min(560, innerWidth * .42));
  function layout() { const r = R(); cards.forEach((c, i) => { const a = i / N * 360; c.style.transform = `rotateY(${a}deg) translateZ(${r}px)` }) }
  layout(); addEventListener('resize', layout);
  const front = () => { let best = 0, bd = 1e9; cards.forEach((c, i) => { const a = ((i / N * 360 + rot) % 360 + 360) % 360, d = Math.min(a, 360 - a); if (d < bd) { bd = d; best = i } }); return best };
  (function tick() { if (!dragging) { idle++; if (idle > 120 && !RM) rotT -= .06; rot += (rotT - rot) * .08 } ring.style.transform = `translateZ(${-R()}px) rotateY(${rot}deg)`; const f = front(); cards.forEach((c, i) => c.classList.toggle('on', i === f)); requestAnimationFrame(tick) })();
  stage.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; stage.classList.add('drag'); stage.setPointerCapture(e.pointerId); idle = 0 });
  stage.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; rot += dx * .25; rotT = rot });
  const end = () => { if (!dragging) return; dragging = false; stage.classList.remove('drag'); rotT = Math.round(rot / (360 / N)) * (360 / N) };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  const step = d => { idle = 0; rotT = Math.round(rotT / (360 / N)) * (360 / N) + d * 360 / N };
  $('#ringPrev').onclick = () => step(1); $('#ringNext').onclick = () => step(-1);
  $$('#ringFilter button').forEach(b => b.onclick = () => { $$('#ringFilter button').forEach(x => x.setAttribute('aria-pressed', x === b)); const f = b.dataset.f; cards.forEach(c => c.classList.toggle('dim', f !== 'all' && !c.dataset.a.split(' ').includes(f))); const first = cards.findIndex(c => !c.classList.contains('dim')); if (first >= 0) { idle = 0; rotT = -first * 360 / N } });

  // ---- trajetória (horizontal scroll on desktop)
  const HIST = [
    { y: '2018', pl: 'Belo Horizonte · MG', th: 'Ação pelo Trânsito Seguro', r: [['1º', 'Geral na Etapa Regional'], ['3º', 'Geral na Etapa Nacional']] },
    { photo: 'equipe-campus.webp', alt: 'Equipe GDroid reunida no pátio' },
    { y: '2019', pl: 'Guarulhos · SP', th: 'Água para o Desenvolvimento Sustentável', r: [['1º', 'Geral na Etapa Regional'], ['4º', 'Geral na Etapa Nacional']] },
    { y: '2020', pl: 'Torneio virtual', th: 'Fitossanidade', r: [['1º', 'Geral na Etapa Regional'], ['1º', 'Geral na Etapa Nacional']], gold: 1 },
    { y: '2021', pl: 'Torneio virtual', th: 'Eliminação do Trabalho Infantil', r: [['1º', 'Geral na Etapa Regional'], ['4º', 'Organização e Método na Nacional']] },
    { y: '2022', pl: 'Rio de Janeiro · RJ', th: 'Ciências Básicas', r: [['1º', 'Geral na Etapa Regional'], ['1º', 'Tecnologia e Engenharia na Nacional']] },
    { photo: 'meninas.webp', alt: 'Cinco integrantes da GDroid lado a lado', cut: 1 },
    { y: '2024', pl: 'Vila Velha · ES', th: 'Universalizar o Acesso', r: [['2º', 'Geral na Etapa Regional'], ['1º', 'Geral na Etapa Nacional']], gold: 1 },
    { y: '2025', pl: 'Belo Horizonte · MG', th: 'Vida Terrestre', r: [['2º', 'Geral na Etapa Regional'], ['1º', 'Geral na Etapa Nacional']], gold: 1 },
    { y: '2026', pl: 'Lavras · MG → nacional', th: 'Educação, Trabalho e Sustentabilidade', r: [['→', 'Em busca do quarto título nacional']], next: 1 }];
  $('#hz').innerHTML = HIST.map(h => h.photo ? `<article class="yr-card photo"${h.cut ? ' style="background:linear-gradient(160deg,#6B0F1A,#24070D)"' : ''}><img src="img/${h.photo}" alt="${h.alt}" loading="lazy"${h.cut ? ' style="object-fit:contain;object-position:bottom"' : ''}></article>` : `<article class="yr-card${h.gold ? ' gold' : ''}"${h.next ? ' style="background:var(--red);border-color:var(--red)"' : ''}>${h.gold ? '<span class="crown">Campeã nacional</span>' : ''}<span class="y big"${h.next ? ' style="color:#fff"' : ''}>${h.y}</span><span class="pl">${h.pl}</span><span class="th">${h.th}</span><ul>${h.r.map(([a, b]) => `<li><b>${a}</b>${b}</li>`).join('')}</ul></article>`).join('');
  gsap.matchMedia().add('(min-width:901px)', () => { const hz = $('#hz'); const dist = () => hz.scrollWidth - innerWidth; const st = gsap.to(hz, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#trajetoria', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: s => gsap.set('#hzBar', { scaleX: s.progress }) } }); return () => st.scrollTrigger && st.scrollTrigger.kill() });

  // ---- garras info (chips → 3D)
  const GARRAS = [
    { k: 'Saída 3 · garra principal', t: 'Hastes paralelas em semicírculo', p: 'Na subida, o motor gira a pinça até o limite mecânico e a estrutura se eleva. Na descida, ao chegar ao ponto mais baixo, a pinça se abre. O motor traseiro coleta o triângulo dourado.', m: ['Edificação do Campus', 'Acesso Seguro', 'Acessibilidade', 'Ingresso na Universidade'] },
    { k: 'Versão anterior', t: 'Sem o motor traseiro', p: 'A garra de hastes paralelas já mantinha as peças perto do centro de massa, mas não alcançava o triângulo dourado sobre o pátio da universidade.', m: ['Edificação do Campus'] },
    { k: 'Saída 1 · coleta', t: 'Uma haste simples', p: 'Recolhe o triângulo, o quadrado e o hexágono do Ajuste Geométrico e volta para a base, onde os blocos são encaixados na garra de entrega.', m: ['Ajuste Geométrico'] },
    { k: 'Saída 2 · entrega', t: 'Elásticos no lugar de motor', p: 'Os elásticos seguram as peças com as medidas exatas. No local certo, uma engrenagem central empurra trilhos que esticam os elásticos e soltam os blocos.', m: ['Ajuste Geométrico'] }];
  function gInfo(i) { const g = GARRAS[i]; $('#gInfo').innerHTML = `<span class="mono">${g.k}</span><h3>${g.t}</h3><p>${g.p}</p><div class="chips">${g.m.map(x => `<span>${x}</span>`).join('')}</div>` }
  gInfo(0);
  $$('#gChips .g-chip').forEach(b => b.onclick = () => { $$('#gChips .g-chip').forEach(x => x.setAttribute('aria-pressed', x === b)); const i = +b.dataset.g; gInfo(i); GD.emit('garra', i) });

  // ---- before/after sliders
  $$('.si-card .ba').forEach(ba => { const inp = $('input', ba), a = $('.after', ba), h = $('.handle', ba); const set = () => { const v = inp.value; a.style.clipPath = `inset(0 0 0 ${v}%)`; h.style.left = v + '%' }; inp.oninput = set; set() });

  // ---- mission calculator
  const calc = { 1: 85, 2: 50, 4: 25, 5: 100 }; let blk = 2, fac = 4;
  const NAMES = { 1: 'Ajuste', 2: 'Acesso', 3: 'Edificação', 4: 'Acessib.', 5: 'Ingresso' };
  function recalc() { const ed = Math.round(blk * 10 * fac); const parts = { ...calc, 3: ed }; const tot = Object.values(parts).reduce((a, b) => a + b, 0); $('#cTot').textContent = tot; $('#cBlk').textContent = blk; $('#cBars').innerHTML = [1, 2, 3, 4, 5].map(k => `<div><span>${NAMES[k]}</span><i><u style="width:${Math.min(100, parts[k] / 2)}%"></u></i><b>${parts[k]}</b></div>`).join('') }
  $$('#calc .seg').forEach(s => $$('button', s).forEach(b => b.onclick = () => { $$('button', s).forEach(x => x.setAttribute('aria-pressed', x === b)); calc[s.dataset.m] = +b.dataset.v; recalc() }));
  $$('#calc .stepper button').forEach(b => b.onclick = () => { blk = Math.max(0, Math.min(5, blk + +b.dataset.d)); recalc() });
  $$('#calc .mult button').forEach(b => b.onclick = () => { $$('#calc .mult button').forEach(x => x.setAttribute('aria-pressed', x === b)); fac = +b.dataset.f; recalc() });
  recalc();

  // ---- PID gyro simulation
  { const cv = $('#pidCv'), ctx = cv.getContext('2d'); let W, H, dpr; const size = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }; size(); addEventListener('resize', size);
    let k1 = 1.2, k2 = 2.6, mode = 'pid', y = 0, ang = 0, prevP = 0, dist = 0, trail = [], vis = false, last = 0;
    const k1i = $('#k1'), k2i = $('#k2'); k1i.oninput = () => { k1 = +k1i.value; $('#k1o').textContent = k1.toFixed(2).replace('.', ',') }; k2i.oninput = () => { k2 = +k2i.value; $('#k2o').textContent = k2.toFixed(2).replace('.', ',') };
    $$('#pid .seg button').forEach(b => b.onclick = () => { $$('#pid .seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); mode = b.dataset.pm });
    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); const yy = (e.clientY - r.top) / r.height; ang += (yy < .5 ? 1 : -1) * .45 });
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { last = performance.now(); requestAnimationFrame(loop) } }).observe(cv);
    let kick = 0;
    function loop(now) { if (!vis) return; const dt = Math.min(.04, (now - last) / 1000); last = now; kick += dt; if (kick > 3.2) { kick = 0; ang += (Math.random() - .5) * .5 }
      const v = 120; const p = -ang; const dp = (p - prevP) / Math.max(dt, 1e-3); prevP = p;
      if (mode === 'pid') ang += (k1 * p + k2 * .12 * dp) * dt * 1.6;
      ang += (Math.random() - .5) * .02; y += Math.sin(ang) * v * dt; dist += v * dt;
      if (Math.abs(y) > H * .45) { y = 0; ang = 0 }
      trail.push(y); if (trail.length > 260) trail.shift();
      ctx.clearRect(0, 0, W, H); const cy = H / 2, rx = W * .72;
      ctx.strokeStyle = 'rgba(255,201,204,.08)'; for (let x = (-(dist) % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      ctx.setLineDash([10, 10]); ctx.lineDashOffset = dist; ctx.strokeStyle = 'rgba(255,201,204,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,201,204,.6)'; ctx.font = '500 11px "Geist Mono",monospace'; ctx.fillText('LINHA IMAGINÁRIA · ÂNGULO INICIAL', 14, cy - 10);
      ctx.strokeStyle = '#FF4A52'; ctx.lineWidth = 3; ctx.beginPath(); trail.forEach((t, i) => { const x = rx - (trail.length - 1 - i) * (v / 60) * .9; i ? ctx.lineTo(x, cy + t) : ctx.moveTo(x, cy + t) }); ctx.stroke();
      ctx.save(); ctx.translate(rx, cy + y); ctx.rotate(ang); ctx.fillStyle = '#36AEBF'; ctx.beginPath(); ctx.roundRect(-26, -20, 52, 40, 8); ctx.fill(); ctx.fillStyle = '#FFE7A8'; ctx.fillRect(-12, -12, 24, 24); ctx.fillStyle = '#111'; ctx.fillRect(-20, -26, 22, 7); ctx.fillRect(-20, 19, 22, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(44, 0); ctx.stroke(); ctx.restore();
      if (mode === 'pid') { ctx.strokeStyle = 'rgba(242,179,61,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, cy + y); ctx.lineTo(rx, cy); ctx.stroke() }
      $('#pErr').textContent = (ang * 57.3).toFixed(1).replace('.', ',') + '°'; $('#pDist').textContent = brl(Math.round(dist / 10)) + ' cm';
      requestAnimationFrame(loop) } }

  // ---- results timeline
  { const EV = [['Ajuste Geométrico', 85, 20], ['Edificação', 80, 84], ['Acesso Seguro', 50, 97], ['Acessibilidade', 25, 113], ['Ingresso', 100, 118]];
    const tr = $('#tlTrack'); tr.innerHTML = EV.map(([n, p, t]) => `<div class="tl-ev" style="left:${t / 120 * 100}%"><div class="bar" style="height:${p * 1.6}px"></div><span class="lb" style="bottom:${p * 1.6 + 6}px">+${p}</span><span class="t">${t}s · ${n}</span></div>`).join('');
    onView(tr, null, () => gsap.to($$('.tl-ev .bar', tr), { scaleY: 1, duration: 1, stagger: .12, ease: 'back.out(1.6)' }));
    onView($('#accRing'), null, () => gsap.to('#accRing', { strokeDashoffset: 339.3 * (1 - .96), duration: 1.8, ease: 'power3.out' })) }

  // ---- gantts
  function gantt(sel, rows, M) { const el = $(sel), N = M.length; el.style.gridTemplateColumns = `minmax(200px,1.5fr) repeat(${N},1fr)`; let h = '<span class="mh" style="text-align:left">Atividade</span>' + M.map(m => `<span class="mh">${m}</span>`).join(''); rows.forEach(([l, s, sp, ev]) => { h += `<div class="row"><span class="lab">${l}</span>${s ? `<span style="grid-column:span ${s}"></span>` : ''}<span class="bar${ev ? ' ev' : ''}" style="grid-column:span ${sp}">${M[s]}${sp > 1 ? '–' + M[s + sp - 1] : ''}</span>${N - s - sp ? `<span style="grid-column:span ${N - s - sp}"></span>` : ''}</div>` }); el.innerHTML = h; const b = $$('.bar', el); onView(el, () => gsap.set(b, { scaleX: 0 }), () => gsap.to(b, { scaleX: 1, duration: 1, stagger: .06, ease: 'power3.out' })) }
  const M12 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  gantt('#ganttOM', [['Definição dos membros', 1, 1], ['Estudo das regras da temporada', 1, 3], ['Estratégias do Mérito Científico', 1, 4], ['Estratégias de Tecnologia e Engenharia', 2, 4], ['Leitura de referenciais teóricos', 3, 4], ['Ativação das redes sociais', 2, 5], ['Planejamento da arrecadação', 3, 2], ['Arrecadação · Festa do Curso G9', 5, 2], ['Revisão dos relatórios para o TBR', 6, 2], ['Etapa Regional · Lavras (MG)', 8, 1, 1], ['Adaptações para a etapa nacional', 8, 4], ['Etapa Nacional', 11, 1, 1]], M12);
  gantt('#ganttMC', [['Revisão bibliográfica e definição do problema', 0, 5], ['Roteiros para coleta de dados', 2, 3], ['Sistematização e estudo de soluções', 3, 3], ['Caderno com resultados parciais', 3, 4], ['Resultados parciais nas redes', 4, 4], ['Revisão da norma culta e da metodologia', 6, 4], ['Redação da versão final', 7, 3], ['Resultados finais nas redes', 7, 4], ['Apresentação para a comunidade', 8, 3, 1], ['Apresentação em eventos', 10, 1, 1]], M12.slice(1));
  $$('.ctable i').forEach(i => { i.style.width = (+i.dataset.w / 500 * 100) + '%'; onView(i, () => gsap.set(i, { scaleX: 0 }), () => gsap.to(i, { scaleX: 1, duration: 1, ease: 'power3.out' })) });

  // ---- PDCA
  const PD = [
    ['Definição dos membros', ['Identificar competências necessárias e abrir seleção.', 'Convocar reuniões para escolher e oficializar os membros.', 'Confirmar se a equipe está completa e cobre todas as áreas.', 'Realizar ajustes no time, se necessário.']],
    ['Estudo das regras', ['Obter o manual de regras e dividir os tópicos entre os membros.', 'Estudar as regras, discutir dúvidas e criar resumos.', 'Verificar a compreensão geral com quizzes ou simulações.', 'Reforçar áreas com dificuldade ou revisar pontos críticos.']],
    ['Marketing', ['Planejar campanhas de marketing e definir papéis.', 'Implementar as ações: vídeos, artes e campanhas.', 'Monitorar resultados e adesão às campanhas.', 'Ajustar estratégias e testar novos formatos.']],
    ['Custos e arrecadação', ['Identificar custos do torneio e potenciais patrocinadores.', 'Realizar arrecadações, buscar parcerias e organizar eventos.', 'Verificar se o valor arrecadado cobre os custos.', 'Revisar metas e reorganizar as ações de arrecadação.']]];
  const PH = [['P', 'Planejar', '#E3262F'], ['D', 'Fazer', '#F2B33D'], ['C', 'Verificar', '#36AEBF'], ['A', 'Agir', '#5BC27A']];
  { const svg = $('#wheel svg'), cx = 190, r1 = 80, r2 = 186; let h = '';
    PH.forEach(([l, n, c], i) => { const a0 = (i * 90 - 90) * Math.PI / 180, a1 = ((i + 1) * 90 - 90) * Math.PI / 180, g = .03; const p = (r, a) => [cx + r * Math.cos(a), cx + r * Math.sin(a)]; const [x0, y0] = p(r2, a0 + g), [x1, y1] = p(r2, a1 - g), [x2, y2] = p(r1, a1 - g), [x3, y3] = p(r1, a0 + g); const am = (a0 + a1) / 2, [tx, ty] = p(134, am); h += `<path d="M${x0},${y0} A${r2},${r2} 0 0 1 ${x1},${y1} L${x2},${y2} A${r1},${r1} 0 0 0 ${x3},${y3} Z" fill="${c}" data-p="${i}"/><text x="${tx}" y="${ty + 12}" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="38" fill="#fff" pointer-events="none">${l}</text>` });
    svg.innerHTML = h; let ex = 0, ph = 0;
    const draw = () => { $('#pdcaGrid').innerHTML = PH.map(([l, n], i) => `<div class="card${i === ph ? ' on' : ''}"><span class="mono">${l} · ${n}</span><p style="color:var(--tx);font-size:15.5px">${PD[ex][1][i]}</p></div>`).join(''); $$('path', svg).forEach((p, i) => p.classList.toggle('off', i !== ph)); $('#wheelCore').textContent = PH[ph][1] };
    $('#pdcaEx').innerHTML = PD.map((d, i) => `<button aria-pressed="${i === 0}" data-e="${i}">${d[0]}</button>`).join('');
    $$('#pdcaEx button').forEach(b => b.onclick = () => { $$('#pdcaEx button').forEach(x => x.setAttribute('aria-pressed', x === b)); ex = +b.dataset.e; draw() });
    $$('path', svg).forEach(p => p.onclick = () => { ph = +p.dataset.p; draw() });
    let auto = setInterval(() => { ph = (ph + 1) % 4; draw() }, 2600); $('#wheel').addEventListener('pointerdown', () => clearInterval(auto), { once: true });
    draw();
  }

  // ---- social feed
  const POSTS = [['28/02', 'A temporada 2026 começou', 'O tema deste ano é Educação, Trabalho e Sustentabilidade. Agora é foco, planejamento e trabalho.', 'equipe-campus2.webp'], ['20/03', 'Espaço é aprendizado', 'Aliados aos ODS 4, 8 e 12: uma estrutura que acolhe é o primeiro passo para o sucesso real.', 'trio.webp'], ['14/04', 'Regras da temporada', 'Venha conhecer as regras da temporada 2026 da categoria High.', 'robo-tapete.webp'], ['13/05', 'Além do robô', 'O&M, Mérito Científico e T&E unidos para transformar ideias em soluções reais.', 'dupla-a.webp'], ['29/05', 'Figurinha difícil? Aqui não!', 'GTEeN e GDroid montaram um álbum da Copa juntas e seguiram com a oficina de programação.', 'meninas.webp'], ['12/06', 'Sensor giroscópio', 'Como o robô se orienta sem seguidor de linha? Giroscópio + PID. Menos oscilações, mais precisão.', 'dupla-b.webp'], ['03/07', 'Inclusão e acessibilidade', 'O Mérito Científico vai investigar como tornar a escola mais acessível para pessoas com deficiência visual.', 'dupla-mesa.webp'], ['04/08', 'Festa Agostina', 'Bingo, cadeia, fondue, correio elegante e muita diversão. 08/08, a partir das 14h.', 'garoto-mesa.webp']];
  $('#feed').innerHTML = POSTS.map(([d, t, p, img]) => `<article class="post"><div class="top"><img src="img/logo-branco.webp" alt=""><b>@equipegdroid</b><span>${d}</span></div><div class="ph"><img src="img/${img}" alt="" loading="lazy" style="object-fit:contain;object-position:bottom"><b>${t}</b></div><p>${p}</p></article>`).join('');

  // ---- finances
  { const C = [['Viagem para a regional', 3300, '#E3262F'], ['Inscrição na regional', 1600, '#F2B33D'], ['Tapete de missões', 1350, '#36AEBF'], ['Materiais gerais', 400, '#8C6BE8'], ['Bottons de divulgação', 300, '#FFC9CC']];
    const tot = C.reduce((a, c) => a + c[1], 0), svg = $('#donut'); let a = -Math.PI / 2, h = '';
    C.forEach(([n, v, c], i) => { const da = v / tot * Math.PI * 2, r = 90, r0 = 58, cx = 110; const p = (rr, aa) => `${cx + rr * Math.cos(aa)},${cx + rr * Math.sin(aa)}`; const lg = da > Math.PI ? 1 : 0; h += `<path data-i="${i}" d="M${p(r, a)} A${r},${r} 0 ${lg} 1 ${p(r, a + da)} L${p(r0, a + da)} A${r0},${r0} 0 ${lg} 0 ${p(r0, a)}Z" fill="${c}" stroke="#24070D" stroke-width="2"><title>${n}: R$ ${brl(v)}</title></path>`; a += da });
    svg.innerHTML = h + `<text x="110" y="106" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="30" fill="#FFF3F2">R$ 6.950</text><text x="110" y="128" text-anchor="middle" font-family="Geist Mono" font-size="10" fill="#E3AEB2">PLANEJADO</text>`;
    $('#donutLeg').innerHTML = C.map(([n, v, c], i) => `<li data-i="${i}"><i style="background:${c}"></i><span>${n}</span><b>R$ ${brl(v)}</b></li>`).join('');
    const hl = i => { $$('#donut path').forEach((p, j) => p.style.opacity = i == null || i === j ? 1 : .25) };
    $$('#donut path, #donutLeg li').forEach(el => { el.onmouseenter = () => hl(+el.dataset.i); el.onmouseleave = () => hl(null) });
    const F = [['Caixa inicial', 400, 1], ['Rifas', 2200, 1], ['Bingo', 1860, 1], ['Fondue no copo', 1110, 1], ['Cadeia', 753, 1], ['Correio elegante', 320, 1], ['Viagem, inscrição e materiais', 3250, 0], ['Tapete da temporada', 1350, 0], ['Bottons', 300, 0]];
    $('#flow').innerHTML = F.map(([n, v, inn]) => `<div><span>${n}</span><i class="${inn ? 'in' : 'out'}" style="width:${v / 3300 * 100}%"></i><b style="color:${inn ? 'var(--leaf)' : 'var(--hot)'}">${inn ? '+' : '−'}${brl(v)}</b></div>`).join('');
    const fi = $$('#flow i'); onView($('#flow'), () => gsap.set(fi, { scaleX: 0 }), () => gsap.to(fi, { scaleX: 1, duration: .9, stagger: .07, ease: 'power3.out' })) }

  // ---- mesa tátil UI → 3D
  $$('#mesaMode button').forEach(b => b.onclick = () => { $$('#mesaMode button').forEach(x => x.setAttribute('aria-pressed', x === b)); GD.emit('mesa', b.dataset.m) });
  $$('#mesaRes button').forEach(b => b.onclick = () => { $$('#mesaRes button').forEach(x => x.setAttribute('aria-pressed', x === b)); GD.emit('mesaRes', b.dataset.r) });
  { const COLS = ['#3D7BEA', '#3FB86A', '#F09A2B', '#9A64E0'], MSG = ['pediu ajuda', 'tem uma dúvida', 'pediu uma pausa', 'não compreendeu o conteúdo'], lamps = $$('#lamps i'); const log = [];
    const clock = () => { const d = new Date(); return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }; setInterval(() => $('#tpClock').textContent = clock(), 1000);
    $$('#btn4 button').forEach(b => b.onclick = () => { const i = +b.dataset.b; b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 250); lamps.forEach((l, j) => { if (j === i) { l.style.background = COLS[i]; l.style.boxShadow = `0 0 24px ${COLS[i]}` } }); setTimeout(() => { lamps[i].style.background = ''; lamps[i].style.boxShadow = '' }, 4000); log.unshift(`<span>${clock()} · Mesa 2 ${MSG[i]}</span>`); $('#tpLog').innerHTML = log.slice(0, 3).join(''); GD.emit('btn', i) }) }

  // ---- refresh after media
  const soft = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 200) } })();
  addEventListener('load', soft); $$('img').forEach(i => i.complete || i.addEventListener('load', soft, { once: true })); document.fonts && document.fonts.ready.then(soft);
})();
