// Taller de CIDR · lògica dels exercicis
(() => {
  const $ = s => document.querySelector(s);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const W = [128, 64, 32, 16, 8, 4, 2, 1];
  const bin8 = n => n.toString(2).padStart(8, '0');
  const fmt = n => n.toLocaleString('ca-ES');
  const toInt = o => (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
  const toOct = x => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255];
  const dotted = x => toOct(x).join('.');
  const maskOf = p => p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;

  function bits(x, p) {
    let s = '';
    for (let i = 0; i < 32; i++) {
      s += `<span class="${i < p ? 'n' : 'h'}">${(x >>> (31 - i)) & 1}</span>`;
      if (i % 8 === 7 && i < 31) s += '<span class="dot">.</span>';
    }
    return `<div class="scroll"><code class="bits">${s}</code></div>`;
  }
  function octBits(v, k) { // un octet partit: k bits de xarxa
    const b = bin8(v);
    return `<span class="n">${b.slice(0, k)}</span><span class="h">${b.slice(k)}</span>`;
  }
  const parseDotted = s => {
    const parts = String(s).trim().split('.');
    if (parts.length !== 4) return null;
    const o = parts.map(t => /^\d{1,3}$/.test(t.trim()) ? +t : NaN);
    return o.every(n => n >= 0 && n <= 255) ? o.join('.') : null;
  };
  const parseNum = s => { const t = String(s).replace(/[\s.,]/g, ''); return /^\d+$/.test(t) ? +t : null; };
  const parsePrefix = s => { const t = String(s).trim().replace(/^\//, ''); return /^\d{1,2}$/.test(t) ? +t : null; };

  // ---------- Estat i marcador ----------
  const state = { mode: 'ip', level: { ip: 'facil', crea: 'facil' }, dir: 'd2b', ex: null, shown: 0, counted: false };
  let score = { ok: 0, tot: 0, streak: 0 };
  try { const s = JSON.parse(localStorage.getItem('cidr-score') || 'null'); if (s) score = s; } catch (e) {}
  function saveScore() {
    $('#sOk').textContent = score.ok; $('#sTot').textContent = score.tot; $('#sStreak').textContent = score.streak;
    try { localStorage.setItem('cidr-score', JSON.stringify(score)); } catch (e) {}
  }
  function record(allOk) {
    if (state.counted) return;
    state.counted = true; score.tot++;
    if (allOk) { score.ok++; score.streak++; } else score.streak = 0;
    saveScore();
  }

  // ---------- Generadors ----------
  function genBinari() {
    const n = rand(1, 255);
    if (state.dir === 'd2b') return { kind: 'd2b', n, user: Array(8).fill(0), steps: stepsD2B(n) };
    return { kind: 'b2d', n, steps: stepsB2D(n) };
  }

  function randomIP(p) {
    for (;;) {
      let o;
      if (p < 16) o = [10, rand(0, 255), rand(0, 255), rand(1, 254)];
      else if (p < 24) o = pick([[172, rand(16, 31), rand(0, 255), rand(1, 254)], [10, rand(0, 255), rand(0, 255), rand(1, 254)]]);
      else o = pick([[192, 168, rand(0, 255), rand(1, 254)], [10, rand(0, 255), rand(0, 255), rand(1, 254)], [172, rand(16, 31), rand(0, 255), rand(1, 254)]]);
      const ip = toInt(o), m = maskOf(p);
      const hostPart = (ip & ~m) >>> 0, all = (~m) >>> 0;
      if (hostPart !== 0 && hostPart !== all) return ip; // evitem que la IP sigui la xarxa o el broadcast
    }
  }
  function genIP() {
    const lvl = state.level.ip;
    const p = lvl === 'facil' ? pick([8, 16, 24, 24]) : lvl === 'mitja' ? rand(25, 30) : rand(17, 30);
    const ip = randomIP(p), m = maskOf(p);
    const net = (ip & m) >>> 0, bc = (net | (~m >>> 0)) >>> 0, h = 32 - p, hosts = 2 ** h - 2;
    return { kind: 'ip', ip, p, mask: dotted(m), net: dotted(net), bc: dotted(bc), hosts, steps: stepsIP(ip, p, m, net, bc, h, hosts) };
  }
  function genCrea() {
    const need = state.level.crea === 'facil' ? rand(2, 250) : rand(251, 4000);
    let h = 2; while (2 ** h - 2 < need) h++;
    const p = 32 - h;
    return { kind: 'crea', need, h, p, mask: dotted(maskOf(p)), cap: 2 ** h - 2, steps: stepsCrea(need, h, p) };
  }

  // ---------- Solucions pas a pas ----------
  function stepsD2B(n) {
    let rem = n, rows = '';
    for (const w of W) {
      const fits = rem >= w; if (fits) rem -= w;
      rows += `<tr><td>${w}</td><td class="${fits ? 'yes' : 'no'}">${fits ? 'hi cap' : 'no hi cap'}</td><td class="${fits ? 'yes' : 'no'}">${fits ? 1 : 0}</td><td>queden ${rem}</td></tr>`;
    }
    let q = n, div = '', res = [];
    while (q >= 2) { const nq = Math.floor(q / 2), r = q % 2; res.push(r); div += `<tr><td>${q} : 2 = ${nq}</td><td>residu <b class="h">${r}</b></td></tr>`; q = nq; }
    const read = '1' + res.slice().reverse().join('');
    const sum = W.filter((w, i) => bin8(n)[i] === '1').join(' + ');
    return [
      { t: 'Mètode 1 · L’escala de pesos', h: `<p>Comencem pel 128. Si el que queda hi cap, posem un 1 i el restem; si no, un 0.</p><div class="scroll"><table class="mini"><tr><th>Pes</th><th>Hi cap?</th><th>Bit</th><th>Resta</th></tr>${rows}</table></div>` },
      { t: 'Mètode 2 · Dividir per 2', h: n < 2 ? '<p>L’1 ja és l’últim quocient: no cal dividir.</p>' : `<p>Dividim per 2 fins que el quocient és 1 i apuntem els residus.</p><div class="scroll"><table class="mini">${div}</table></div><p>Llegim de baix a dalt: primer l’últim quocient (1) i després els residus → <span class="res">${read}</span></p>` },
      { t: 'Resultat amb 8 bits', h: `<p>Completem amb zeros a l’esquerra: <span class="res n">${bin8(n)}</span></p><p>Comprovació: ${sum} = ${n}</p>` }
    ];
  }
  function stepsB2D(n) {
    const b = bin8(n);
    const cells = W.map((w, i) => `<td class="${b[i] === '1' ? 'yes' : 'no'}">${w}</td>`).join('');
    const bitsRow = W.map((w, i) => `<td class="${b[i] === '1' ? 'yes' : 'no'}">${b[i]}</td>`).join('');
    const sum = W.filter((w, i) => b[i] === '1');
    return [
      { t: 'Posa cada bit sota el seu pes', h: `<div class="scroll"><table class="mini"><tr><th>Pes</th>${cells}</tr><tr><th>Bit</th>${bitsRow}</tr></table></div>` },
      { t: 'Suma els pesos dels 1', h: `<p class="mono">${sum.join(' + ')} = <span class="res n">${n}</span></p>` }
    ];
  }
  function stepsIP(ip, p, m, net, bc, h, hosts) {
    const k = p % 8, oi = Math.floor(p / 8), o = toOct(ip);
    let sep;
    if (k === 0) {
      const a = o.slice(0, oi).join('.'), b = o.slice(oi).join('.');
      sep = `<p>${p} bits de xarxa = ${oi} octets sencers. No cal passar res a binari:</p><p class="res"><span class="n">${a}</span> | <span class="h">${b}</span></p>`;
    } else {
      sep = `<p>${p} = ${oi * 8} + ${k}: els ${oi} primers octets són xarxa i l’octet ${oi + 1} queda partit (${k} bits de xarxa, ${8 - k} de host).</p><p class="res">${o[oi]} = ${bin8(o[oi])} → ${octBits(o[oi], k)}</p>${bits(ip, p)}`;
    }
    const first = dotted(net + 1), last = dotted(bc - 1);
    const mOct = toOct(m)[oi];
    return [
      { t: '1 · Màscara', h: `<p>/${p} = ${p} uns i ${h} zeros.</p>${bits(m, p)}<p>${k ? `L’octet partit: ${octBits(mOct, k)} = ${W.slice(0, k).join(' + ')} = ${mOct}. ` : ''}Màscara: <span class="res">${dotted(m)}</span></p>` },
      { t: '2 · Separa xarxa i host', h: sep },
      { t: '3 · Adreça de xarxa (bits de host a 0)', h: `${bits(net, p)}<p>Xarxa: <span class="res">${dotted(net)}</span></p>` },
      { t: '4 · Broadcast (bits de host a 1)', h: `${bits(bc, p)}<p>Broadcast: <span class="res">${dotted(bc)}</span></p>` },
      { t: '5 · Hosts', h: `<p>${h} bits de host → 2<sup>${h}</sup> − 2 = <span class="res">${fmt(hosts)}</span></p><p>Adreces útils: de ${first} a ${last}</p>` }
    ];
  }
  function stepsCrea(need, h, p) {
    let tries = '';
    for (let n = Math.max(2, h - 3); n <= h; n++) {
      const v = 2 ** n - 2, good = n === h;
      tries += `<span class="try ${good ? 'good' : ''}">2<sup>${n}</sup> − 2 = ${fmt(v)} ${good ? '→ sí' : '→ no arriba'}</span>`;
    }
    const m = maskOf(p), k = p % 8, oi = Math.floor(p / 8), mo = toOct(m)[oi];
    return [
      { t: '1 · Quants bits de host necessito?', h: `<p>Busquem la potència de 2 més petita que, restant-ne 2, arribi a ${fmt(need)} ordinadors.</p><div class="tries">${tries}</div><p>Calen <b>${h} bits de host</b>.</p>` },
      { t: '2 · Prefix', h: `<p class="mono">32 − ${h} = ${p} → <span class="res">/${p}</span></p>` },
      { t: '3 · Màscara', h: `${bits(m, p)}<p>${k ? `Octet partit: ${octBits(mo, k)} = ${mo}. ` : ''}Màscara: <span class="res">${dotted(m)}</span></p>` },
      { t: '4 · Comprovació', h: `<p>Hi caben ${fmt(2 ** h - 2)} ordinadors: en necessitem ${fmt(need)} i en sobren ${fmt(2 ** h - 2 - need)}.</p>` }
    ];
  }

  // ---------- Pintar ----------
  function toolbar() {
    const tb = $('#toolbar');
    if (state.mode === 'binari') {
      tb.innerHTML = `<div class="seg" role="group" aria-label="Direcció"><span class="seg-label">Direcció</span>
        <button type="button" data-dir="d2b" aria-pressed="${state.dir === 'd2b'}">Decimal → binari</button>
        <button type="button" data-dir="b2d" aria-pressed="${state.dir === 'b2d'}">Binari → decimal</button></div>`;
    } else {
      const lv = state.level[state.mode];
      const opts = state.mode === 'ip'
        ? [['facil', 'Fàcil · /8 /16 /24'], ['mitja', 'Mitjà · /25 a /30'], ['repte', 'Repte · /17 a /30']]
        : [['facil', 'Fins a 250 ordinadors'], ['repte', 'De 251 a 4.000']];
      tb.innerHTML = `<div class="seg" role="group" aria-label="Nivell"><span class="seg-label">Nivell</span>${opts.map(([v, l]) => `<button type="button" data-level="${v}" aria-pressed="${lv === v}">${l}</button>`).join('')}</div>`;
    }
  }
  function field(key, label, ph) {
    return `<div class="field" id="w-${key}"><label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" inputmode="decimal" placeholder="${ph}" spellcheck="false"><span class="fb" id="fb-${key}"></span></div>`;
  }
  function render() {
    const ex = state.ex;
    toolbar();
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.mode === state.mode));
    let prompt = '', inputs = '';
    if (ex.kind === 'd2b') {
      prompt = `<p class="q">Passa a binari (8 bits). Clica els bits per posar-los a 1.</p><div class="big">${ex.n}</div>`;
      inputs = `<div class="bitboard">${W.map((w, i) => `<div class="bitcol"><span class="w">${w}</span><button type="button" class="bit" data-i="${i}" aria-pressed="false" aria-label="Bit de pes ${w}">0</button></div>`).join('')}</div><p class="bitfb" id="bitfb" hidden></p>`;
    } else if (ex.kind === 'b2d') {
      prompt = `<p class="q">Quin número decimal és?</p><div class="big">${bin8(ex.n)}</div>`;
      inputs = `<div class="fields">${field('dec', 'En decimal', 'p. ex. 100')}</div>`;
    } else if (ex.kind === 'ip') {
      prompt = `<p class="q">Troba la màscara, l’adreça de xarxa, el broadcast i quants ordinadors hi caben.</p><div class="big">${dotted(ex.ip)}/${ex.p}</div>`;
      inputs = `<div class="fields">${field('mask', 'Màscara', '255.255.255.0')}${field('net', 'Adreça de xarxa', 'a.b.c.d')}${field('bc', 'Broadcast', 'a.b.c.d')}${field('hosts', 'Hosts (ordinadors)', 'p. ex. 254')}</div>`;
    } else {
      prompt = `<p class="q">Necessites una xarxa on hi càpiguen aquests ordinadors. Quina és la més petita possible?</p><div class="big">${fmt(ex.need)} ordinadors</div>`;
      inputs = `<div class="fields">${field('pre', 'Prefix', '/N')}${field('mask', 'Màscara', '255.255.255.0')}${field('cap', 'Quants hi caben', 'p. ex. 30')}</div>`;
    }
    $('#prompt').innerHTML = prompt;
    $('#inputs').innerHTML = inputs;
    $('#steps').innerHTML = '';
    $('#solution').hidden = true;
    $('#showStep').disabled = false;
    $('#showStep').textContent = 'Mostra un pas';
  }

  function setFb(key, ok, msg) {
    const w = $('#w-' + key); if (!w) return;
    w.classList.toggle('ok', ok); w.classList.toggle('ko', !ok);
    $('#fb-' + key).textContent = msg || (ok ? 'Correcte' : 'No és correcte');
  }
  function check() {
    const ex = state.ex; let all = true;
    const val = k => ($('#f-' + k) || {}).value || '';
    if (ex.kind === 'd2b') {
      const v = ex.user.reduce((s, b, i) => s + b * W[i], 0), ok = v === ex.n;
      const fb = $('#bitfb'); fb.hidden = false; fb.className = 'bitfb ' + (ok ? 'ok' : 'ko');
      fb.textContent = ok ? `Correcte: ${bin8(ex.n)} = ${ex.n}` : `Els teus bits sumen ${v}, i havies d’arribar a ${ex.n}. Revisa’ls.`;
      all = ok;
    } else if (ex.kind === 'b2d') {
      const ok = parseNum(val('dec')) === ex.n; setFb('dec', ok); all = ok;
    } else if (ex.kind === 'ip') {
      [['mask', ex.mask], ['net', ex.net], ['bc', ex.bc]].forEach(([k, a]) => {
        const v = parseDotted(val(k)); const ok = v === a;
        setFb(k, ok, v === null && val(k).trim() ? 'Escriu-ho com a.b.c.d' : null); all = all && ok;
      });
      const okH = parseNum(val('hosts')) === ex.hosts; setFb('hosts', okH); all = all && okH;
    } else {
      const okP = parsePrefix(val('pre')) === ex.p; setFb('pre', okP); all = all && okP;
      const vm = parseDotted(val('mask')), okM = vm === ex.mask; setFb('mask', okM, vm === null && val('mask').trim() ? 'Escriu-ho com a.b.c.d' : null); all = all && okM;
      const okC = parseNum(val('cap')) === ex.cap; setFb('cap', okC); all = all && okC;
    }
    record(all);
  }
  function showStep(all) {
    const ex = state.ex; if (state.shown === 0) record(false) ; // veure la solució abans d'encertar compta com a intent
    $('#solution').hidden = false;
    const target = all ? ex.steps.length : Math.min(state.shown + 1, ex.steps.length);
    const ol = $('#steps');
    for (let i = state.shown; i < target; i++) {
      const li = document.createElement('li'); li.className = 'step';
      li.innerHTML = `<h3>${ex.steps[i].t}</h3>${ex.steps[i].h}`;
      ol.appendChild(li);
    }
    if (state.shown === 0 && (ex.kind === 'ip' || ex.kind === 'crea')) {
      const lg = document.createElement('div'); lg.className = 'legend';
      lg.innerHTML = '<span class="n">Blau = bits de xarxa</span><span class="h">Taronja = bits de host</span>';
      ol.before(lg); lg.dataset.legend = '1';
    }
    state.shown = target;
    const done = state.shown >= ex.steps.length;
    $('#showStep').disabled = done; $('#showStep').textContent = done ? 'Solució completa' : 'Mostra el següent pas';
  }
  function newExercise() {
    document.querySelectorAll('[data-legend]').forEach(e => e.remove());
    state.shown = 0; state.counted = false;
    state.ex = state.mode === 'binari' ? genBinari() : state.mode === 'ip' ? genIP() : genCrea();
    render();
  }
  function setMode(m) {
    state.mode = m;
    try { history.replaceState(null, '', '#' + m); } catch (e) {}
    newExercise();
  }

  // ---------- Esdeveniments ----------
  document.querySelector('.tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setMode(t.dataset.mode); });
  $('#toolbar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.dir) state.dir = b.dataset.dir;
    if (b.dataset.level) state.level[state.mode] = b.dataset.level;
    newExercise();
  });
  $('#inputs').addEventListener('click', e => {
    const b = e.target.closest('.bit'); if (!b) return;
    const i = +b.dataset.i; state.ex.user[i] ^= 1;
    b.setAttribute('aria-pressed', !!state.ex.user[i]); b.textContent = state.ex.user[i];
  });
  $('#form').addEventListener('submit', e => { e.preventDefault(); check(); });
  $('#newEx').addEventListener('click', newExercise);
  $('#showStep').addEventListener('click', () => showStep(false));
  $('#showAll').addEventListener('click', () => showStep(true));
  $('#reset').addEventListener('click', () => { score = { ok: 0, tot: 0, streak: 0 }; saveScore(); });

  const start = (location.hash || '').slice(1);
  saveScore();
  setMode(['binari', 'ip', 'crea'].includes(start) ? start : 'ip');
})();
