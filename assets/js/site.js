(function () {
  'use strict';
  var root = document.documentElement;

  /* ---- open other sites and PDFs in a new tab ---- */
  var home = document.querySelector('.wordmark');
  var base = home ? home.pathname.replace(/\/?$/, '/') : '/';
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href)) return;
    var external = a.hostname && (a.hostname !== location.hostname || (a.pathname + '/').indexOf(base) !== 0);
    var pdf = /\.pdf($|[?#])/i.test(a.pathname || href);
    if (external || pdf) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });

  /* ---- colour theme ---- */
  var themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---- mobile menu ---- */
  var navBtn = document.querySelector('.nav__toggle');
  var navList = document.getElementById('nav-list');
  if (navBtn && navList) {
    navBtn.addEventListener('click', function () {
      var open = navList.classList.toggle('is-open');
      navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      navBtn.textContent = open ? 'Close' : 'Menu';
    });
  }

  /* ---- abstract / bibtex toggles ---- */
  document.querySelectorAll('.chip--toggle[aria-controls]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
    });
  });

  /* ---- copy bibtex ---- */
  document.querySelectorAll('.pub__panel--bib .copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.parentNode.querySelector('code').textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy BibTeX'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  /* ---- project demo videos, loaded only on request ---- */
  document.querySelectorAll('.chip--video').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.project').querySelector('.project__video');
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Hide demo' : 'Watch demo';
      if (open && !box.firstChild) {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.video + '?rel=0';
        f.title = btn.dataset.title || 'Project demo';
        f.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        box.appendChild(f);
      }
      box.hidden = !open;
    });
  });

  /* ---- publications: highlight the year in view ---- */
  var yearLinks = document.querySelectorAll('.year-nav a');
  if (yearLinks.length && 'IntersectionObserver' in window) {
    var setCurrent = function (id) {
      yearLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.id); });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('.year-group').forEach(function (g) { io.observe(g); });
  }

  /* ---- home: topographic contour field behind the portrait ----
     A smooth height field (a summit under the photo plus drifting waves)
     traced with marching squares. Every fifth line is an index contour,
     as on a survey map. The cursor raises a small rise that bends the lines. */
  var canvas = document.querySelector('.portrait__field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 80, LEVELS = 34, W = 0, H = 0, dpr = 1;
  var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
  var field = new Float32Array((N + 1) * (N + 1));

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function height(x, y, t) {
    var dx = x - 0.5, dy = y - 0.5;
    var summit = Math.exp(-(dx * dx + dy * dy) / 0.14) * 1.05;
    var waves = 0.3 * Math.sin(x * 7.1 + t * 0.9 + Math.sin(y * 3.3 + t * 0.4))
              + 0.26 * Math.sin(y * 6.3 - t * 0.7 + Math.cos(x * 2.7 - t * 0.3))
              + 0.12 * Math.sin((x + y) * 9.5 + t * 0.55);
    var mx = x - mouse.x, my = y - mouse.y;
    var bump = mouse.on * 0.55 * Math.exp(-(mx * mx + my * my) / 0.012);
    return summit + waves + bump;
  }
  function draw(t) {
    var styles = getComputedStyle(document.documentElement);
    var minor = styles.getPropertyValue('--rule-strong').trim();
    var major = styles.getPropertyValue('--accent').trim();
    var i, j, k, lo = Infinity, hi = -Infinity;
    for (j = 0; j <= N; j++) for (i = 0; i <= N; i++) {
      var v = height(i / N, j / N, t);
      field[j * (N + 1) + i] = v;
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var cw = W / N, ch = H / N;
    for (k = 1; k < LEVELS; k++) {
      var level = lo + (hi - lo) * k / LEVELS;
      var isMajor = k % 5 === 0;
      ctx.beginPath();
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
        var a = field[j * (N + 1) + i], b = field[j * (N + 1) + i + 1];
        var c = field[(j + 1) * (N + 1) + i + 1], d = field[(j + 1) * (N + 1) + i];
        var code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (code === 0 || code === 15) continue;
        var x = i * cw, y = j * ch;
        var top = [x + cw * (level - a) / (b - a), y];
        var right = [x + cw, y + ch * (level - b) / (c - b)];
        var bottom = [x + cw * (level - d) / (c - d), y + ch];
        var left = [x, y + ch * (level - a) / (d - a)];
        var segs;
        switch (code) {
          case 1: case 14: segs = [left, bottom]; break;
          case 2: case 13: segs = [bottom, right]; break;
          case 3: case 12: segs = [left, right]; break;
          case 4: case 11: segs = [top, right]; break;
          case 5: segs = [left, top, bottom, right]; break;
          case 6: case 9: segs = [top, bottom]; break;
          case 7: case 8: segs = [left, top]; break;
          case 10: segs = [left, bottom, top, right]; break;
        }
        for (var s2 = 0; s2 < segs.length; s2 += 2) {
          ctx.moveTo(segs[s2][0], segs[s2][1]); ctx.lineTo(segs[s2 + 1][0], segs[s2 + 1][1]);
        }
      }
      ctx.strokeStyle = isMajor ? major : minor;
      ctx.lineWidth = isMajor ? 1.3 : 0.8;
      ctx.globalAlpha = isMajor ? 0.9 : 0.75;
      ctx.stroke();
    }
    // soften the outer edge
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    var g = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) draw(0); });

  var wrap = canvas.parentNode;
  wrap.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height; mouse.ton = 1;
  });
  wrap.addEventListener('pointerleave', function () { mouse.ton = 0; });

  if (reduce) { draw(0); return; }

  var visible = true, last = 0, start = performance.now();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden || now - last < 33) return;
    last = now;
    mouse.x += (mouse.tx - mouse.x) * 0.12; mouse.y += (mouse.ty - mouse.y) * 0.12; mouse.on += (mouse.ton - mouse.on) * 0.08;
    draw((now - start) / 4000);
  }
  requestAnimationFrame(frame);
})();
