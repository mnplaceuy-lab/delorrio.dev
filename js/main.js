  function openModal(){
    document.getElementById('modal').hidden = false;
  }
  function closeModal(){
    document.getElementById('modal').hidden = true;
  }
  document.getElementById('modal').addEventListener('click', function(e){
    if(e.target === this) closeModal();
  });
  // formularios de contacto → Web3Forms (envía el mail a santiagodelorrio2013@gmail.com)
  (function(){
    var forms = document.querySelectorAll('[data-contact-form]');
    Array.prototype.forEach.call(forms, function(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        if(form.reportValidity && !form.reportValidity()) return;
        var btn = form.querySelector('button[type="submit"]');
        var label = btn.innerHTML;
        btn.disabled = true; btn.textContent = 'Enviando…';
        var negocio = form.negocio ? form.negocio.value.trim() : '';
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: '9da05a57-121e-4f73-b754-08cd649c435d',
            subject: 'Nuevo mensaje desde Delorrio.dev — ' + form.nombre.value,
            from_name: 'Delorrio.dev',
            nombre: form.nombre.value, email: form.email.value,
            negocio: negocio || '—',
            mensaje: form.mensaje.value,
            botcheck: form.botcheck && form.botcheck.checked
          })
        }).then(function(r){ return r.json(); })
          .then(function(d){
            if(!(d.ok || d.success)) throw new Error(d.message || d.error || 'error');
            if(form.id === 'contact-form') closeModal();
            form.reset();
            showToast('Mensaje enviado. ¡Gracias por escribir!');
          })
          .catch(function(err){
            console.warn('Formulario:', err && err.message);
            showToast('No se pudo enviar (' + ((err && err.message) || 'error') + ').');
          })
          .then(function(){ btn.disabled = false; btn.innerHTML = label; });
      });
    });
  })();

  // contacto: aparición + globo de líneas (canvas, sin librerías)
  (function(){
    var sec = document.querySelector('.ct');
    if(!sec) return;
    if('IntersectionObserver' in window){
      var io0 = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ sec.classList.add('is-in'); io0.disconnect(); } });
      }, { threshold: 0.12 });
      io0.observe(sec);
    } else sec.classList.add('is-in');

    var canvas = sec.querySelector('[data-globe]');
    if(!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var lines = null, visible = false, raf = 0, last = 0;
    var rot = [56, 42];               // arranca mostrando Uruguay, visto desde el sur
    var HOME = [-56.2, -32.8];        // Uruguay
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var drag = null, W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
    var D = Math.PI / 180;

    function resize(){
      var box = canvas.parentNode.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.width; H = box.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      R = Math.min(W * 0.46, 330); cx = W / 2; cy = R + 14;
      draw();
    }
    // proyección ortográfica: devuelve [x, y, visible]
    function proj(lon, lat){
      var l = (lon + rot[0]) * D, p = lat * D, p0 = -rot[1] * D;
      var cp = Math.cos(p), x = cp * Math.sin(l);
      var y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cp * Math.cos(l);
      var z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cp * Math.cos(l);
      return [cx + x * R, cy - y * R, z];
    }
    function draw(t){
      if(!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // relleno y borde de la esfera
      var g = ctx.createRadialGradient(cx - R * .3, cy - R * .4, R * .1, cx, cy, R);
      g.addColorStop(0, 'rgba(55,182,255,.10)'); g.addColorStop(1, 'rgba(55,182,255,.015)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(147,197,253,.55)'; ctx.stroke();
      // meridianos y paralelos
      ctx.lineWidth = .6; ctx.strokeStyle = 'rgba(55,182,255,.10)';
      ctx.beginPath();
      for(var lo = -180; lo < 180; lo += 20) path(function(i){ return [lo, -90 + i * 4]; }, 46);
      for(var la = -60; la <= 60; la += 20) path(function(i){ return [-180 + i * 4, la]; }, 91);
      ctx.stroke();
      // países
      if(lines){
        ctx.lineWidth = .75; ctx.strokeStyle = 'rgba(226,240,255,.78)';
        ctx.beginPath();
        for(var k = 0; k < lines.length; k++){
          var L = lines[k];
          path(function(i){ return [L[i * 2], L[i * 2 + 1]]; }, L.length / 2);
        }
        ctx.stroke();
      }
      // punto en Uruguay
      var u = proj(HOME[0], HOME[1]);
      if(u[2] > 0.05){
        var pulse = still ? .5 : (((t || 0) / 1600) % 1);
        ctx.beginPath(); ctx.arc(u[0], u[1], 4 + pulse * 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(55,182,255,' + (0.35 * (1 - pulse)) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(u[0], u[1], 3.6, 0, Math.PI * 2);
        ctx.fillStyle = '#37b6ff'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#e0f2fe'; ctx.stroke();
      }
    }
    function path(get, n){
      var prev = false;
      for(var i = 0; i < n; i++){
        var c = get(i), p = proj(c[0], c[1]);
        if(p[2] > 0){ if(prev) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); prev = true; }
        else prev = false;
      }
    }
    function loop(t){
      raf = 0;
      if(!visible) return;
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      if(!drag && !still) rot[0] = (rot[0] + dt * 0.012) % 360;
      draw(t);
      if(!still || drag) raf = requestAnimationFrame(loop);
    }
    function start(){ if(!raf){ last = 0; raf = requestAnimationFrame(loop); } }

    canvas.addEventListener('pointerdown', function(e){
      drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-drag'); start();
    });
    canvas.addEventListener('pointermove', function(e){
      if(!drag) return;
      rot[0] += (e.clientX - drag[0]) * 0.35;
      rot[1] = Math.max(-60, Math.min(60, rot[1] - (e.clientY - drag[1]) * 0.25));
      drag = [e.clientX, e.clientY];
      if(still) draw();
    });
    function up(){ drag = null; canvas.classList.remove('is-drag'); }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    resize();
    window.addEventListener('resize', resize);
    var io = new IntersectionObserver(function(es){
      visible = es[0].isIntersecting;
      if(visible){
        if(!lines){
          fetch('js/world.json').then(function(r){ return r.json(); }).then(function(d){ lines = d; draw(); start(); }).catch(function(){});
        }
        start();
      }
    }, { threshold: 0.05 });
    io.observe(canvas);
  })();

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeModal();
  });

  // abrir automáticamente al entrar a la página
  window.addEventListener('load', function(){
    setTimeout(openModal, 1200);
  });


  // spotlight que sigue al mouse en el hero
  (function(){
    var visual = document.querySelector('.hero-visual');
    var spot = document.getElementById('heroSpotlight');
    if(!visual || !spot) return;
    visual.addEventListener('mousemove', function(e){
      var r = visual.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      spot.style.setProperty('--sx', x + '%');
      spot.style.setProperty('--sy', y + '%');
    });
  })();

  // ===== ESCENA 3D "De la idea al producto" (React Three Fiber) =====
  // El bundle (js/scene.bundle.js, ~320 KB) se descarga recién cuando la sección
  // está por aparecer en pantalla, así no frena la carga inicial del sitio.
  (function(){
    var host = document.querySelector('[data-digital-idea-scene]');
    if(!host) return;
    var wrap = host.closest('.idea-3d__canvas-wrap');
    var gl = null;
    try { var c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch(e){}
    if(!gl){ if(wrap) wrap.classList.add('no-webgl'); return; } // sin WebGL: la sección queda solo con texto
    var loaded = false;
    function load(){
      if(loaded) return; loaded = true;
      var s = document.createElement('script');
      s.src = 'js/scene.bundle.js?v=202609292203';
      s.async = true;
      document.body.appendChild(s);
    }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        if(entries.some(function(e){ return e.isIntersecting; })){ io.disconnect(); load(); }
      }, { rootMargin: '400px 0px' });
      io.observe(host);
    } else { load(); }
  })();

  // smooth scroll + active nav highlight
  document.querySelectorAll('nav.links a[href^="#"], a.hero-rubros').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
  var sections = ['top','proyectos','tipos-web','proceso','contacto'].map(id=>document.getElementById(id)).filter(Boolean);
  var navLinks = Array.from(document.querySelectorAll('nav.links a'));
  function onScroll(){
    var pos = window.scrollY + 120;
    var current = sections[0];
    sections.forEach(function(s){ if(s.offsetTop <= pos) current = s; });
    navLinks.forEach(function(l){
      l.classList.toggle('active', l.getAttribute('href') === '#'+current.id);
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scroll progress bar
  var progressBar = document.getElementById('progress');
  function onProgress(){
    var h = document.documentElement;
    var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    if(progressBar) progressBar.style.width = (isFinite(scrolled) ? scrolled : 0) + '%';
  }
  window.addEventListener('scroll', onProgress, {passive:true});
  onProgress();

  // reveal on scroll
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in-view'); });
  }

  // 3D tilt on project cards
  if(!reduceMotion){
    document.querySelectorAll('.proj-card').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        var rx = ((y / r.height) - 0.5) * -6;
        var ry = ((x / r.width) - 0.5) * 8;
        card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
        card.style.setProperty('--mx', (x / r.width * 100) + '%');
        card.style.setProperty('--my', (y / r.height * 100) + '%');
      });
      card.addEventListener('mouseleave', function(){
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
      });
    });

    // subtle tilt on hero mockups following cursor
    var heroVisual = document.querySelector('.hero-visual');
    var hvLeft = document.querySelector('.hv-mock-left');
    var hvRight = document.querySelector('.hv-mock-right');
    if(heroVisual && (hvLeft || hvRight)){
      heroVisual.addEventListener('mousemove', function(e){
        var r = heroVisual.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        var rx = ((y / r.height) - 0.5) * -4;
        var ry = ((x / r.width) - 0.5) * 6;
        if(hvLeft) hvLeft.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        if(hvRight) hvRight.style.transform = 'rotateX(' + (rx*0.7) + 'deg) rotateY(' + (ry*0.7) + 'deg)';
      });
      heroVisual.addEventListener('mouseleave', function(){
        if(hvLeft) hvLeft.style.transform = '';
        if(hvRight) hvRight.style.transform = '';
      });
    }

    // magnetic primary buttons
    document.querySelectorAll('.btn-primary').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width/2, y = e.clientY - r.top - r.height/2;
        btn.style.transform = 'translate(' + (x*0.12) + 'px,' + (y*0.28 - 1) + 'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
    });
  }

  // (efecto de scroll del hero quitado: la imagen queda fija)

  // demos interactivas por rubro
  (function(){
    var modal = document.getElementById('demo-modal');
    var root = document.querySelector('[data-rx]');
    if(!modal || !root) return;
    var frame = document.getElementById('dm-frame');
    var load = document.getElementById('dm-loading');
    var urlEl = document.getElementById('dm-url');
    var nameEl = document.getElementById('dm-name');
    var ctaName = document.querySelector('[data-demo-name]');
    var lastFocus = null, current = null;
    function info(opt){
      return { key: opt.getAttribute('data-demo'), name: opt.getAttribute('aria-label'),
               url: (opt.querySelector('.rx-url') || {}).textContent || '' };
    }
    function activeOpt(){ return root.querySelector('.rx-opt.is-active') || root.querySelector('.rx-opt'); }
    function open(opt){
      var d = info(opt); current = d;
      lastFocus = document.activeElement;
      urlEl.textContent = d.url; nameEl.textContent = d.name;
      load.hidden = false;
      frame.onload = function(){ load.hidden = true; };
      frame.src = 'demos/' + d.key + '.html?v=202610011510';
      modal.hidden = false;
      document.documentElement.classList.add('dm-lock');
      setTimeout(function(){ document.getElementById('dm-close').focus(); }, 30);
    }
    function close(){
      modal.hidden = true;
      document.documentElement.classList.remove('dm-lock');
      frame.src = 'about:blank';
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    }
    // click en la opción ya activa (o en "Probar demo") → abre la demo
    root.addEventListener('click', function(e){
      var opt = e.target.closest('.rx-opt');
      if(!opt) return;
      var wasActive = opt.getAttribute('data-was-active') === '1';
      if(wasActive || e.target.closest('.rx-try')) open(opt);
    });
    root.addEventListener('pointerdown', function(e){
      var opt = e.target.closest('.rx-opt');
      if(opt) opt.setAttribute('data-was-active', opt.classList.contains('is-active') ? '1' : '0');
    });
    root.addEventListener('keydown', function(e){
      var opt = e.target.closest('.rx-opt');
      if(opt && (e.key === 'Enter' || e.key === ' ')) opt.setAttribute('data-was-active', opt.classList.contains('is-active') ? '1' : '0');
    });
    // nombre del rubro activo en el botón de abajo
    new MutationObserver(function(){ var o = activeOpt(); if(ctaName && o) ctaName.textContent = o.getAttribute('aria-label'); })
      .observe(root, { subtree:true, attributes:true, attributeFilter:['class'] });
    document.querySelectorAll('[data-demo-open]').forEach(function(b){ b.addEventListener('click', function(){ open(activeOpt()); }); });
    document.getElementById('dm-close').addEventListener('click', close);
    modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !modal.hidden) close(); });
    document.getElementById('dm-want').addEventListener('click', function(){
      var name = current ? current.name : '';
      close();
      openModal();
      var f = document.getElementById('contact-form');
      if(f && f.mensaje && !f.mensaje.value) f.mensaje.value = 'Hola Santiago, vi la demo de ' + name + ' y quiero una web así para mi negocio.';
    });
  })();

  // tipos de web — selector interactivo (acordeón)
  (function(){
    var root = document.querySelector('[data-rx]');
    if(!root) return;
    var opts = Array.prototype.slice.call(root.querySelectorAll('.rx-opt'));
    var mq = window.matchMedia('(max-width:720px)');
    function size(){
      if(mq.matches){ root.style.removeProperty('--rxw'); return; }
      var gap = parseFloat(getComputedStyle(root).columnGap) || 0;
      var strip = parseFloat(getComputedStyle(root).getPropertyValue('--strip')) || 58;
      var w = root.clientWidth - (opts.length - 1) * (strip + gap);
      root.style.setProperty('--rxw', Math.max(w, 300) + 'px');
    }
    function activate(o){
      opts.forEach(function(x){ var on = x === o; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
      var img = o.querySelector('img'); if(img && img.loading === 'lazy') img.loading = 'eager';
    }
    opts.forEach(function(o, i){
      o.addEventListener('click', function(){ activate(o); });
      o.addEventListener('keydown', function(e){
        var n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if(!n) return; e.preventDefault();
        var t = opts[(i + n + opts.length) % opts.length]; t.focus(); activate(t);
      });
    });
    size();
    window.addEventListener('resize', size);
    if(mq.addEventListener) mq.addEventListener('change', size);
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ root.classList.add('is-in'); io.disconnect(); } });
      }, { threshold: 0.15 });
      io.observe(root);
    } else root.classList.add('is-in');
  })();

  // GSAP ScrollTrigger parallax layers (Osmo-style)
  (function(){
    if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    if(reduceMotion) return;

    var root = document.getElementById('parallax-scroll');
    if(!root) return;
    var triggerElement = root.querySelector('[data-parallax-layers]');
    if(!triggerElement) return;

    var tl = gsap.timeline({
      scrollTrigger:{
        trigger: root,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4
      }
    });

    var layers = [
      { layer: '1', yPercent: 18 },
      { layer: '2', yPercent: 34 },
      { layer: '3', yPercent: -14 },
      { layer: '4', yPercent: 55 }
    ];

    layers.forEach(function(l, idx){
      tl.to(
        triggerElement.querySelectorAll('[data-parallax-layer="' + l.layer + '"]'),
        { yPercent: l.yPercent, ease: 'none' },
        idx === 0 ? undefined : '<'
      );
    });

    gsap.fromTo('.par-title', {opacity:0.3}, {
      opacity:1, ease:'none',
      scrollTrigger:{ trigger: root, start:'top 70%', end:'top 20%', scrub:0.4 }
    });
  })();

  // lightweight particle network on canvas
  (function(){
    var canvas = document.getElementById('particles');
    if(!canvas || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    var w, h, particles = [];
    var COUNT = window.innerWidth < 720 ? 26 : 48;

    function resize(){
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = window.innerHeight;
    }
    function init(){
      particles = [];
      for(var i=0;i<COUNT;i++){
        particles.push({
          x: Math.random()*w, y: Math.random()*h,
          vx: (Math.random()-0.5)*0.25, vy: (Math.random()-0.5)*0.25
        });
      }
    }
    function step(){
      ctx.clearRect(0,0,w,h);
      for(var i=0;i<particles.length;i++){
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if(p.x < 0 || p.x > w) p.vx *= -1;
        if(p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(125,211,252,.55)';
        ctx.fill();
        for(var j=i+1;j<particles.length;j++){
          var q = particles[j];
          var dx = p.x-q.x, dy = p.y-q.y;
          var dist = Math.sqrt(dx*dx+dy*dy);
          if(dist < 130){
            ctx.beginPath();
            ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
            ctx.strokeStyle = 'rgba(55,182,255,' + (0.14*(1-dist/130)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    }
    resize(); init();
    window.addEventListener('resize', function(){ resize(); init(); });
    requestAnimationFrame(step);
  })();

  // ===== MI PROCESO: entrada escalonada, etapa activa por scroll, expandir y cierre =====
  (function(){
    var sec = document.getElementById('proceso');
    if(!sec) return;
    var cards = Array.prototype.slice.call(sec.querySelectorAll('.proc-card'));
    var links = Array.prototype.slice.call(sec.querySelectorAll('.proc-link'));
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. entrada: tarjetas de izquierda a derecha (stagger por CSS con --i)
    function reveal(){
      sec.classList.add('is-in');
      setTimeout(function(){ sec.classList.add('is-ready'); }, reduce ? 0 : 4 * 120 + 520);
    }
    if(reduce || !('IntersectionObserver' in window)){ reveal(); }
    else {
      var io = new IntersectionObserver(function(es){
        if(es[0].isIntersecting){ io.disconnect(); reveal(); }
      }, { threshold: 0.2 });
      io.observe(sec.querySelector('.proc-track'));
    }

    // 2. progreso de scroll → etapa activa y líneas que avanzan
    var active = -1, complete = false, ticking = false;
    function update(){
      ticking = false;
      var track = sec.querySelector('.proc-track');
      var r = track.getBoundingClientRect(), vh = window.innerHeight;
      var p;
      if(window.innerWidth <= 640){
        // mobile: la etapa activa es la que cruza el centro de la pantalla
        p = (vh * 0.6 - r.top) / r.height;
      } else {
        p = (vh * 0.9 - r.top) / (r.height + vh * 0.55);
      }
      p = Math.max(0, Math.min(1, p));
      var stage = p <= 0 ? -1 : Math.min(3, Math.floor(p * 4));

      links.forEach(function(l, k){
        var f = Math.max(0, Math.min(1, (p * 4 - k - 0.5) * 1.6));
        l.style.setProperty('--p', f.toFixed(3));
        var v = l.querySelector('.proc-link__v span');
        if(v) v.style.setProperty('--p', f.toFixed(3));
      });

      if(stage !== active){
        active = stage;
        cards.forEach(function(c, i){ c.classList.toggle('is-active', i === stage); });
        sec.classList.toggle('has-active', stage >= 0);
      }
      // 6. final del proceso: se ilumina toda la ruta y aparece el mensaje
      if(p >= 0.92 && !complete){ complete = true; sec.classList.add('is-complete'); }
      else if(p < 0.6 && complete){ complete = false; sec.classList.remove('is-complete'); }
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    // 4. click / tap / teclado: expandir (una sola tarjeta abierta a la vez)
    function toggle(card){
      var open = !card.classList.contains('is-open');
      cards.forEach(function(c){
        var o = open && c === card;
        c.classList.toggle('is-open', o);
        c.setAttribute('aria-expanded', o ? 'true' : 'false');
      });
    }
    cards.forEach(function(c){
      c.addEventListener('click', function(){ toggle(c); });
      c.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(c); }
      });
    });
  })();

  // ===== OPORTUNIDADES: entrada, órbitas vivas, parallax, hover con pulso al centro =====
  (function(){
    var sec = document.querySelector('.opp');
    if(!sec) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var items = Array.prototype.slice.call(sec.querySelectorAll('.opp-item'));
    var paths = Array.prototype.slice.call(sec.querySelectorAll('.opp-path'));
    var word = sec.querySelector('.opp-word');
    var dotsBox = sec.querySelector('.opp-dots');
    var VBW = 1600, VBH = 760;
    paths.forEach(function(p, i){ p.style.setProperty('--d', (i * 0.15) + 's'); });

    function isDesktop(){ return window.innerWidth > 980; }

    // punto de un path en % de la sección (el SVG se estira con preserveAspectRatio="none")
    function pointAt(path, t){
      var len = path.getTotalLength();
      var pt = path.getPointAtLength(len * t);
      return { x: pt.x / VBW * 100, y: pt.y / VBH * 100 };
    }
    function place(dot, path, t){
      var p = pointAt(path, t);
      dot.style.transform = 'translate(' + (p.x / 100 * sec.clientWidth) + 'px,' + (p.y / 100 * sec.clientHeight) + 'px)';
    }

    // un nodo lento por órbita (pocas partículas)
    var idleDots = paths.map(function(p, i){
      var d = document.createElement('span'); d.className = 'opp-dot'; dotsBox.appendChild(d);
      return { el: d, path: p, t: i * 0.27, speed: 0.045 + i * 0.006 };
    });
    var pulses = [];
    function glowWord(){
      word.classList.add('is-glow');
      clearTimeout(glowWord._t);
      glowWord._t = setTimeout(function(){ word.classList.remove('is-glow'); }, 450);
    }
    function firePulse(i){
      if(reduce || !isDesktop()){ glowWord(); return; }
      var d = document.createElement('span'); d.className = 'opp-dot opp-dot--pulse'; dotsBox.appendChild(d);
      pulses.push({ el: d, path: paths[i], t: 0 });
    }

    // loop solo mientras la sección está en pantalla
    var visible = false, raf = null, last = 0;
    function loop(now){
      raf = null;
      if(!visible) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if(isDesktop()){
        if(!reduce) idleDots.forEach(function(n){ n.t = (n.t + dt * n.speed) % 1; place(n.el, n.path, n.t); });
        for(var k = pulses.length - 1; k >= 0; k--){
          var pu = pulses[k]; pu.t += dt / 0.7;
          if(pu.t >= 1){ pu.el.remove(); pulses.splice(k, 1); glowWord(); continue; }
          place(pu.el, pu.path, pu.t);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    function start(){ if(!raf){ last = 0; raf = requestAnimationFrame(loop); } }

    // 1. entrada por scroll + 7. pulso final (una sola vez)
    var entered = false;
    function enter(){
      if(entered) return; entered = true;
      sec.classList.add('is-in');
      setTimeout(function(){ paths.forEach(function(_, i){ firePulse(i); }); }, reduce ? 0 : 2400);
    }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        visible = es[0].isIntersecting;
        if(visible){ if(es[0].intersectionRatio >= 0.25 || entered) enter(); start(); }
      }, { threshold: [0, 0.25] }).observe(sec);
    } else { visible = true; enter(); start(); }

    // 4 + 5. activar concepto: hover (desktop), tap (mobile), foco (teclado)
    function activate(i){
      items.forEach(function(it, k){ it.classList.toggle('is-active', k === i); });
      paths.forEach(function(p, k){ p.classList.toggle('is-lit', k === i); });
      sec.classList.toggle('has-hot', i >= 0);
    }
    items.forEach(function(it, i){
      var targets = it.querySelectorAll('.opp-obj, .opp-chip');
      if(fine){
        targets.forEach(function(t){
          t.addEventListener('mouseenter', function(){ activate(i); firePulse(i); });
          t.addEventListener('mouseleave', function(){ activate(-1); });
        });
      } else {
        targets.forEach(function(t){
          t.addEventListener('click', function(){
            activate(i); firePulse(i);
            clearTimeout(it._t); it._t = setTimeout(function(){ activate(-1); }, 1400);
          });
        });
      }
      it.addEventListener('focus', function(){ activate(i); firePulse(i); });
      it.addEventListener('blur', function(){ activate(-1); });
      it.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); firePulse(i); } });
    });

    // 3 + 6. parallax con profundidad y atracción al centro (solo desktop con mouse)
    if(fine && !reduce){
      var tx = 0, ty = 0, pending = false;
      sec.addEventListener('mousemove', function(e){
        var r = sec.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        if(!pending){ pending = true; requestAnimationFrame(applyParallax); }
      });
      sec.addEventListener('mouseleave', function(){ tx = ty = 0; applyParallax(); });
      function applyParallax(){
        pending = false;
        var near = Math.max(0, 1 - Math.sqrt(tx * tx + ty * ty) / 0.28); // cursor cerca del centro
        items.forEach(function(it){
          var depth = parseFloat(it.dataset.depth) || 1;
          var ox = parseFloat(it.style.getPropertyValue('--ox')) / 100 - 0.5;
          var oy = parseFloat(it.style.getPropertyValue('--oy')) / 100 - 0.5;
          var px = -tx * 18 * depth - ox * near * 26;
          var py = -ty * 12 * depth - oy * near * 22;
          it.style.setProperty('--px', px.toFixed(1) + 'px');
          it.style.setProperty('--py', py.toFixed(1) + 'px');
        });
        sec.querySelector('.opp-rings').style.transform = 'translate(' + (-tx * 6).toFixed(1) + 'px,' + (-ty * 4).toFixed(1) + 'px)';
        sec.querySelector('.opp-lines').style.transform = 'translate(' + (-tx * 5).toFixed(1) + 'px,' + (-ty * 3).toFixed(1) + 'px)';
      }
    }
  })();

  // ===== PROYECTOS: entrada escalonada + parallax sutil del mockup principal =====
  (function(){
    var sec = document.querySelector('.pj');
    if(!sec) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce || !('IntersectionObserver' in window)){ sec.classList.add('is-in'); }
    else {
      var io = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); sec.classList.add('is-in'); } }, { threshold: 0.12 });
      io.observe(sec);
    }
    var main = sec.querySelector('.pj-main');
    if(!main || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var img = main.querySelector('.pj-main__media img');
    main.addEventListener('mousemove', function(e){
      var r = main.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      img.style.setProperty('--mx', (-x * 10).toFixed(1) + 'px');
      img.style.setProperty('--my', (-y * 8).toFixed(1) + 'px');
    });
    main.addEventListener('mouseleave', function(){ img.style.setProperty('--mx', '0px'); img.style.setProperty('--my', '0px'); });
  })();

// ===== BENEFICIOS y FAQ =====
(function(){
  var bn = document.querySelector('.bn');
  if(bn){
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); bn.classList.add('is-in'); } }, { threshold: 0.12 });
      io.observe(bn);
    } else bn.classList.add('is-in');
    if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
      bn.querySelectorAll('.bn-card').forEach(function(c){
        c.addEventListener('mousemove', function(e){
          var r = c.getBoundingClientRect();
          c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          c.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }
  }
  var faq = document.querySelector('.faq');
  if(faq && faq.querySelector('.faq-item')){
    faq.hidden = false;
    if('IntersectionObserver' in window){
      var io2 = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io2.disconnect(); faq.classList.add('is-in'); } }, { threshold: 0.1 });
      io2.observe(faq);
    } else faq.classList.add('is-in');
    var items = faq.querySelectorAll('.faq-item');
    items.forEach(function(d){
      d.addEventListener('toggle', function(){ if(d.open) items.forEach(function(o){ if(o !== d) o.open = false; }); });
    });
  }
})();
