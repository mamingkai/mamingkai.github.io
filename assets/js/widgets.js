/* Interactive explainers (illustrative, textbook-style models; not experimental data) */
(function () {
  var grid = 'rgba(128,128,128,.2)';
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function el(id) { return document.getElementById(id); }

  /* ---- 1. Sediment dive: oxygen as a lid on phosphorus ---- */
  if (el('sedChart')) {
    var zs = []; for (var i = 0; i <= 120; i++) zs.push(i / 6);
    function prof(d) {
      return {
        O2: zs.map(function (x) { return Math.exp(-x / (d / 3)); }),
        Fe: zs.map(function (x) { return sig((d + 1.5 - x) / 0.8); }),
        S: zs.map(function (x) { return sig((x - (d + 2)) / 1.2); }),
        P: zs.map(function (x) { return 0.12 + 0.88 * sig((x - d) / 1.0) * (1 - 0.35 * sig((x - (d + 6)) / 2)); })
      };
    }
    var defs = [['O2', 'Oxygen', '#4e79a7'], ['Fe', 'Fe(III) oxide (P-binding)', '#d1642f'], ['S', 'Sulfide', '#b6a017'], ['P', 'Dissolved phosphate', '#e15759']];
    var sc = new Chart(el('sedChart'), {
      type: 'line',
      data: { labels: zs.map(function (z) { return z.toFixed(1); }), datasets: defs.map(function (d) { return { label: d[1], borderColor: d[2], borderWidth: 2.5, pointRadius: 0, data: [] }; }) },
      options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
        scales: { x: { title: { display: true, text: 'Depth below sediment surface (cm)' }, ticks: { maxTicksLimit: 11 }, grid: { color: grid } },
          y: { min: 0, max: 1.05, title: { display: true, text: 'Relative amount (schematic)' }, grid: { color: grid } } } }
    });
    var sedLine = { id: 'sl', afterDraw: function (ch) { var z = +el('sedZ').value, idx = Math.round(z * 6), x = ch.scales.x.getPixelForValue(idx), a = ch.chartArea, c = ch.ctx;
      c.save(); c.strokeStyle = '#999'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, a.top); c.lineTo(x, a.bottom); c.stroke(); c.restore(); } };
    sc.config.plugins = [sedLine];
    function sedUpdate() {
      var o = +el('sedO').value / 100, d = 0.2 + 1.8 * o, z = +el('sedZ').value, p = prof(d);
      defs.forEach(function (k, i) { sc.data.datasets[i].data = p[k[0]]; });
      sc.update();
      var zone = z < d ? 'oxic zone: iron oxides are intact and hold phosphate tightly' :
        z < d + 2 ? 'iron-reducing zone: oxides dissolve and bound phosphate is set free' :
        'sulfidic zone: sulfide reacts with iron, and phosphate may be re-trapped as minerals such as vivianite';
      var risk = Math.max(5, Math.min(100, Math.round(100 * (2.2 - d) / 2.0)));
      el('sedO_v').textContent = Math.round(o * 100) + '%';
      el('sedZ_v').textContent = z.toFixed(1) + ' cm';
      el('sedTxt').innerHTML = '<strong>At ' + z.toFixed(1) + ' cm:</strong> ' + zone + '.';
      el('sedRisk').style.width = risk + '%';
      el('sedRiskT').textContent = risk + '% (the shallower the oxic lid, the easier phosphate escapes to the lake)';
    }
    el('sedO').addEventListener('input', sedUpdate); el('sedZ').addEventListener('input', sedUpdate); sedUpdate();
  }

  /* ---- 2. Adsorption edge of metals on iron oxide ---- */
  if (el('edgeChart')) {
    var metals = { Pb: { c: '#e63946', ph: 4.5, n: 1.8 }, Cu: { c: '#2ec4b6', ph: 5.2, n: 1.6 }, Cd: { c: '#edc948', ph: 6.5, n: 1.5 } };
    var phs = []; for (var j = 20; j <= 100; j++) phs.push(j / 10);
    var ec = new Chart(el('edgeChart'), {
      type: 'line',
      data: { labels: phs, datasets: Object.keys(metals).map(function (m) { return { label: m + '(II)', borderColor: metals[m].c, borderWidth: 2.5, pointRadius: 0, data: [] }; }) },
      options: { maintainAspectRatio: false, animation: false,
        scales: { x: { title: { display: true, text: 'pH' }, ticks: { maxTicksLimit: 9 }, grid: { color: grid } }, y: { min: 0, max: 100, title: { display: true, text: '% of metal adsorbed' }, grid: { color: grid } } } }
    });
    var edgeLine = { id: 'el', afterDraw: function (ch) { var x = ch.scales.x.getPixelForValue((+el('edgePH').value - 2) * 10), a = ch.chartArea, c = ch.ctx;
      c.save(); c.strokeStyle = '#999'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, a.top); c.lineTo(x, a.bottom); c.stroke(); c.restore(); } };
    ec.config.plugins = [edgeLine];
    function edgeUpdate() {
      var sites = +el('edgeS').value, shift = Math.log10(sites / 5) * 0.6, pH = +el('edgePH').value, out = [];
      Object.keys(metals).forEach(function (m, i) { var M = metals[m];
        ec.data.datasets[i].data = phs.map(function (x) { return 100 / (1 + Math.pow(10, M.n * (M.ph - shift - x))); });
        out.push('<span style="color:' + M.c + '"><strong>' + m + '</strong></span> ' + Math.round(100 / (1 + Math.pow(10, M.n * (M.ph - shift - pH)))) + '%'); });
      ec.update();
      el('edgePH_v').textContent = pH.toFixed(1); el('edgeS_v').textContent = sites + '×';
      el('edgeTxt').innerHTML = 'At pH ' + pH.toFixed(1) + ' the iron oxide holds: ' + out.join(' · ');
    }
    el('edgePH').addEventListener('input', edgeUpdate); el('edgeS').addEventListener('input', edgeUpdate); edgeUpdate();
  }

  /* ---- 3. AFM force curve ---- */
  if (el('afmChart')) {
    var afc = new Chart(el('afmChart'), {
      type: 'scatter',
      data: { datasets: [{ label: 'Approach', borderColor: '#4e79a7', showLine: true, pointRadius: 0, borderWidth: 2.5, data: [] }, { label: 'Retract (pull-off)', borderColor: '#e15759', showLine: true, pointRadius: 0, borderWidth: 2.5, data: [] }] },
      options: { maintainAspectRatio: false, animation: false,
        scales: { x: { reverse: false, title: { display: true, text: 'Tip–surface separation (nm) → further from mineral' }, min: -50, max: 400, grid: { color: grid } },
          y: { title: { display: true, text: 'Force (nN)  [+ push, − pull]' }, min: -3, max: 2, grid: { color: grid } } } }
    });
    function afmUpdate() {
      var A = +el('afmA').value / 10, N = +el('afmN').value, ap = [], rt = [], x;
      for (x = 400; x >= -50; x -= 3) ap.push({ x: x, y: x > 0 ? -0.02 * Math.exp(-x / 25) * 0 : Math.min(2, -x * 0.04) });
      for (x = -50; x <= 400; x += 3) { var y = x < 0 ? Math.min(2, -x * 0.04) : 0; rt.push({ x: x, y: y }); }
      var span = 40 + 50 * N, out = [];
      rt.forEach(function (p) { if (p.x >= 0 && p.x <= span) { var u = p.x / span; p.y = -A * (1 - 0.5 * u) * (0.55 + 0.45 * Math.abs(Math.cos(Math.PI * N * u))); } });
      afc.data.datasets[0].data = ap; afc.data.datasets[1].data = rt; afc.update();
      el('afmA_v').textContent = A.toFixed(1) + ' nN'; el('afmN_v').textContent = N;
      el('afmTxt').innerHTML = 'The deepest dip in the red curve is the <strong>adhesion force</strong> (' + A.toFixed(1) + ' nN, a few billionths of a newton). A longer, stepped pull-off means more molecules on the cell surface were stretched before letting go.';
    }
    el('afmA').addEventListener('input', afmUpdate); el('afmN').addEventListener('input', afmUpdate); afmUpdate();
  }
})();

(function () {
  var grid = 'rgba(128,128,128,.2)';
  function el(id) { return document.getElementById(id); }

  /* ---- 4. Redox ladder ---- */
  if (el('ladder')) {
    var Z = [
      { n: 'Oxygen respiration', c: '#4e79a7', b: 0.8, dG: 475, t: 'Microbes use dissolved oxygen first; it gives the most energy. Iron oxides stay intact and keep phosphate bound.' },
      { n: 'Nitrate reduction', c: '#59a14f', b: 0.8, dG: 448, t: 'When oxygen is gone, nitrate is next. Still plenty of energy, and no iron is touched yet.' },
      { n: 'Manganese oxide reduction', c: '#8c6bb1', b: 1.5, dG: 349, t: 'Manganese oxides dissolve and release the trace elements they carried.' },
      { n: 'Iron oxide reduction', c: '#d1642f', b: 3, dG: 114, t: 'Rusty iron(III) oxides are dissolved by microbes. Phosphate and metals bound to them can be set free. This is the zone my PhD research is about.' },
      { n: 'Sulfate reduction', c: '#b6a017', b: 6, dG: 77, t: 'Sulfate is turned into sulfide (the rotten-egg smell), which reacts with iron and can form iron sulfides.' },
      { n: 'Methane production', c: '#7f7f7f', b: 99, dG: 58, t: 'The last resort of microbes, with the least energy. Methane bubbles up from deep, sulfate-free mud.' }
    ];
    var lc = new Chart(el('ladderChart'), {
      type: 'bar',
      data: { labels: Z.map(function (z) { return z.n; }), datasets: [{ data: Z.map(function (z) { return z.dG; }), backgroundColor: Z.map(function (z) { return z.c; }) }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { title: { display: true, text: 'Energy gained per mole of organic carbon (kJ), textbook values' }, grid: { color: grid } }, y: { grid: { display: false } } } }
    });
    function ladderUpdate() {
      var om = +el('ladderOM').value, depth = 30, d = 0, html = '', hit = -1, z = +el('ladderZ').value, i;
      for (i = 0; i < Z.length; i++) {
        var th = Math.min(depth - d, Z[i].b / Math.sqrt(om / 3));
        if (th <= 0) break;
        if (z >= d && z < d + th) hit = i;
        html += '<div style="height:' + (th / depth * 100) + '%;background:' + Z[i].c + ';opacity:' + (i === hit ? 1 : .55) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:.72em;overflow:hidden">' + (th > 1.3 ? Z[i].n : '') + '</div>';
        d += th;
      }
      el('ladder').innerHTML = html;
      el('ladderOM_v').textContent = om; el('ladderZ_v').textContent = z.toFixed(0) + ' cm';
      if (hit < 0) hit = Z.length - 1;
      el('ladderTxt').innerHTML = '<strong>' + Z[hit].n + ':</strong> ' + Z[hit].t;
    }
    el('ladderOM').addEventListener('input', ladderUpdate); el('ladderZ').addEventListener('input', ladderUpdate); ladderUpdate();
  }

  /* ---- 5. Diffusion through clay ---- */
  if (el('diffChart')) {
    function erfc(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? 1 - y : 1 + y; }
    var Dp = 1e-10, yr = 3.156e7, xs = []; for (var k = 0; k <= 200; k++) xs.push(k * 0.2);
    function C(x, t, R) { return 100 * erfc(x / (2 * Math.sqrt(Dp / R * t * yr))); }
    function reach(t, R) { return 2 * Math.sqrt(Dp / R * t * yr) * 1.8214; } // erfc(u)=0.01 -> u=1.8214
    var dc = new Chart(el('diffChart'), {
      type: 'line',
      data: { labels: xs, datasets: [{ label: 'Non-sorbing element (travels freely)', borderColor: '#4e79a7', borderWidth: 2.5, pointRadius: 0, data: [] }, { label: 'Your element', borderColor: '#e15759', borderWidth: 2.5, pointRadius: 0, data: [] }] },
      options: { maintainAspectRatio: false, animation: false,
        scales: { x: { title: { display: true, text: 'Distance into the clay (m)' }, ticks: { maxTicksLimit: 9 }, grid: { color: grid } }, y: { min: 0, max: 100, title: { display: true, text: 'Concentration (% of source)' }, grid: { color: grid } } } }
    });
    function diffUpdate() {
      var t = Math.pow(10, +el('diffT').value), kd = Math.pow(10, +el('diffK').value), R = 1 + 5.7 * kd;
      dc.data.datasets[0].data = xs.map(function (x) { return C(x, t, 1); });
      dc.data.datasets[1].data = xs.map(function (x) { return C(x, t, R); });
      dc.update();
      var r0 = reach(t, 1), r1 = reach(t, R);
      function f(m) { return m >= 1 ? m.toFixed(1) + ' m' : (m * 100).toFixed(1) + ' cm'; }
      el('diffT_v').textContent = Math.round(t).toLocaleString() + ' years';
      el('diffK_v').textContent = 'Kd = ' + kd.toPrecision(2) + ' L/kg (retardation ×' + R.toFixed(R < 10 ? 1 : 0) + ')';
      el('diffTxt').innerHTML = 'After ' + Math.round(t).toLocaleString() + ' years, 1% of the source concentration has reached <strong>' + f(r0) + '</strong> for a non-sorbing element, but only <strong>' + f(r1) + '</strong> for your element. Sticking to clay slows migration by a factor of about ' + Math.round(Math.sqrt(R)) + ' in distance.';
    }
    el('diffT').addEventListener('input', diffUpdate); el('diffK').addEventListener('input', diffUpdate); diffUpdate();
  }
})();
