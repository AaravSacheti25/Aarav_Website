(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', open);
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    addEventListener('resize', function () { if (innerWidth > 1040) setMenu(false); });
  }
  // Escape closes any open dropdown or the mobile menu
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menu && menu.classList.contains('open')) { setMenu(false); toggle.focus(); }
    var a = document.activeElement;
    if (a && a.closest('.nav-item')) a.blur();
  });

  // carousels
  var arrow = function (d) {
    return '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="' + (d < 0 ? 'M9 2 4 7l5 5' : 'M5 2l5 5-5 5') + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  document.querySelectorAll('.carousel').forEach(function (c) {
    var track = c.querySelector('.car-track');
    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;
    var label = c.getAttribute('aria-label') || 'Photos';
    var ctrl = document.createElement('div');
    ctrl.className = 'car-ctrl';
    ctrl.innerHTML = '<button type="button" class="car-btn" aria-label="Previous photo">' + arrow(-1) + '</button>' +
      '<button type="button" class="car-btn" aria-label="Next photo">' + arrow(1) + '</button>' +
      '<div class="car-dots"></div><span class="car-count"></span>';
    c.appendChild(ctrl);
    var prev = ctrl.children[0], next = ctrl.children[1], dots = ctrl.querySelector('.car-dots'), count = ctrl.querySelector('.car-count');
    slides.forEach(function (s, i) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', label + ', photo ' + (i + 1));
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });
    var current = -1;
    function go(i) { track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' }); }
    function update() {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === current) return;
      current = i;
      Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      count.textContent = (i + 1) + ' / ' + slides.length;
      c.querySelectorAll('video').forEach(function (v) { if (!v.paused) v.pause(); });
    }
    // arrows loop round, so the carousel never dead-ends
    prev.addEventListener('click', function () { go((current - 1 + slides.length) % slides.length); });
    next.addEventListener('click', function () { go((current + 1) % slides.length); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    update();

    // autoplay: next photo every 2s; holds while hovered, focused, off-screen or a video is playing
    if (reduce) return;
    var hover = false, focus = false, visible = false;
    c.addEventListener('mouseenter', function () { hover = true; });
    c.addEventListener('mouseleave', function () { hover = false; });
    c.addEventListener('focusin', function () { focus = true; });
    c.addEventListener('focusout', function () { focus = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(c);
    } else visible = true;
    setInterval(function () {
      var playing = Array.prototype.some.call(c.querySelectorAll('video'), function (v) { return !v.paused; });
      if (hover || focus || !visible || playing || document.hidden) return;
      go((current + 1) % slides.length);
    }, 2000);
  });

  // gentle reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  // lightbox for certificates, letters and article pages
  var zooms = document.querySelectorAll('[data-zoom]');
  if (zooms.length) {
    var lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<img alt=""><button type="button" aria-label="Close">&times;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img'), lbBtn = lb.querySelector('button'), opener = null;
    function closeLb() { lb.classList.remove('open'); document.body.classList.remove('lb-open'); if (opener) opener.focus(); }
    zooms.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); opener = a;
        var im = a.querySelector('img');
        lbImg.src = a.getAttribute('href'); lbImg.alt = im ? im.alt : '';
        lb.classList.add('open'); document.body.classList.add('lb-open'); lbBtn.focus();
      });
    });
    lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) closeLb(); });
  }

  // impact numbers count up once when they scroll into view; they show the real value until then
  var counts = document.querySelectorAll('.counters .stat b');
  if (counts.length && !reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, html = el.innerHTML;
        var m = html.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
        if (!m) return;
        var target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') > -1;
        var t0 = null, dur = 1100;
        function fmt(v) {
          var s = v.toFixed(dec);
          return comma ? Number(s).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
        }
        function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 3);
          el.innerHTML = m[1] + fmt(target * ease) + m[3];
          if (p < 1) requestAnimationFrame(step); else el.innerHTML = html;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counts.forEach(function (el) { cio.observe(el); });
  }

  // copy email address
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () {});
    });
  });
})();
