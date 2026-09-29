  function openModal(){
    document.getElementById('modal').hidden = false;
  }
  function closeModal(){
    document.getElementById('modal').hidden = true;
  }
  document.getElementById('modal').addEventListener('click', function(e){
    if(e.target === this) closeModal();
  });
  document.getElementById('contact-form').addEventListener('submit', function(e){
    e.preventDefault();
    closeModal();
    this.reset();
    var t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 3200);
  });
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
      s.src = 'js/scene.bundle.js';
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
  document.querySelectorAll('nav.links a[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
  var sections = ['top','proyectos','proceso','contacto'].map(id=>document.getElementById(id)).filter(Boolean);
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

  // scroll-linked 3D card (vanilla equivalent of a ContainerScroll effect)
  (function(){
    var el = document.getElementById('scrollCard');
    if(!el) return;
    var ticking = false;
    function isMobileView(){ return window.innerWidth <= 768; }
    function update(){
      ticking = false;
      if(reduceMotion){ el.style.transform = 'none'; return; }
      var wh = window.innerHeight;
      var range = wh * 0.65;
      var progress = window.scrollY / range;
      progress = Math.min(1, Math.max(0, progress));
      var rotate = 18 * (1 - progress);
      var scaleRange = isMobileView() ? [0.85, 0.96] : [1.06, 1];
      var scaleVal = scaleRange[0] + (scaleRange[1] - scaleRange[0]) * progress;
      var translate = -26 * progress;
      el.style.transform = 'rotateX(' + rotate + 'deg) scale(' + scaleVal + ') translateY(' + translate + 'px)';
    }
    function onScroll(){
      if(!ticking){ requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll);
    update();
  })();

  // tipos de web — tabbed preview
  (function(){
    var tabs = document.querySelectorAll('.type-tab');
    var panels = document.querySelectorAll('.type-panel');
    var urlEl = document.getElementById('type-url');
    var captionEl = document.getElementById('type-caption');
    var data = {
      gastro:       { url:'lafonda.dev',              caption:'Web de restaurante con carta editorial, reservas y pedidos por WhatsApp.' },
      hogar:        { url:'nexoshop.dev',              caption:'E-commerce de decoración con categorías por ambiente y productos destacados.' },
      freeshop:     { url:'fronterafreeshop.com.uy',   caption:'Catálogo multi-categoría con ofertas destacadas y precios en dólares.' },
      agencia:      { url:'estudionorte.dev',          caption:'Sitio institucional con servicios, proceso de trabajo y casos de éxito.' },
      moda:         { url:'lineasur.com',              caption:'Landing editorial con colección destacada y navegación por categoría.' },
      barberia:     { url:'barberiacentral.com',       caption:'Web con servicios, equipo de barberos y reserva de citas.' },
      joyeria:      { url:'aureajoyas.com',            caption:'Vitrina elegante con colecciones y piezas hechas a mano.' },
      inmobiliaria: { url:'riverapropiedades.uy',      caption:'Buscador de propiedades con filtros, mapa y equipo de asesores.' },
      salud:        { url:'clinicanorte.com.uy',       caption:'Sitio de salud con especialidades, profesionales y turnos online.' },
      turismo:      { url:'posadalunarejo.uy',         caption:'Web de hospedaje con habitaciones, experiencias y buscador de disponibilidad.' },
      motors:       { url:'fronteramotors.com.uy',     caption:'Catálogo de autos nuevos y usados con financiación y búsqueda avanzada.' },
      arquitectura: { url:'estudiohorizonte.uy',       caption:'Portfolio de proyectos con servicios y proceso de diseño y construcción.' }
    };
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        var type = tab.getAttribute('data-type');
        tabs.forEach(function(t){ t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab); });
        panels.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-panel') === type); });
        if(data[type] && urlEl) urlEl.textContent = data[type].url;
        if(data[type] && captionEl) captionEl.lastChild.textContent = data[type].caption;
      });
    });
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
