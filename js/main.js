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

  // pieza 3D de marca (Three.js) — propia, sin dependencias de terceros
  (function(){
    var canvas = document.getElementById('brand3d');
    if(!canvas || typeof THREE === 'undefined') return;
    var wrap = canvas.parentElement;

    var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    var group = new THREE.Group();
    scene.add(group);

    // núcleo: icosaedro wireframe en el azul de marca
    var coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
    var coreMat = new THREE.MeshBasicMaterial({color:0x37b6ff, wireframe:true, transparent:true, opacity:.85});
    var core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // capa interior sólida translúcida, aporta profundidad
    var innerGeo = new THREE.IcosahedronGeometry(1.68, 1);
    var innerMat = new THREE.MeshBasicMaterial({color:0x0e2a3f, transparent:true, opacity:.28});
    var inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // anillo orbital
    var ringGeo = new THREE.TorusGeometry(2.5, 0.012, 8, 100);
    var ringMat = new THREE.MeshBasicMaterial({color:0x8de8ff, transparent:true, opacity:.5});
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    var ring2 = ring.clone();
    ring2.rotation.x = -Math.PI / 3.1;
    ring2.rotation.y = Math.PI / 5;
    group.add(ring2);

    // puntos flotantes (nodos)
    var pts = [];
    var ptGeo = new THREE.SphereGeometry(0.035, 8, 8);
    var ptMat = new THREE.MeshBasicMaterial({color:0xffffff});
    for(var i = 0; i < 10; i++){
      var p = new THREE.Mesh(ptGeo, ptMat);
      var r = 2.5 + Math.random()*0.4;
      var theta = Math.random()*Math.PI*2;
      var phi = Math.acos((Math.random()*2)-1);
      p.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
      pts.push(p);
      group.add(p);
    }

    var targetRX = 0, targetRY = 0, mouseX = 0, mouseY = 0;
    wrap.addEventListener('mousemove', function(e){
      var r = wrap.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width) - 0.5;
      mouseY = ((e.clientY - r.top) / r.height) - 0.5;
    });

    function resize(){
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if(!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    var clock = new THREE.Clock();
    function animate(){
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      core.rotation.y = t * 0.18;
      core.rotation.x = t * 0.09;
      inner.rotation.copy(core.rotation);
      ring.rotation.z = t * 0.15;
      ring2.rotation.z = -t * 0.12;
      targetRX += (mouseY * 0.5 - targetRX) * 0.04;
      targetRY += (mouseX * 0.6 - targetRY) * 0.04;
      group.rotation.x = targetRX;
      group.rotation.y += 0.0009;
      group.rotation.y += targetRY * 0.01;
      pts.forEach(function(p, idx){ p.position.y += Math.sin(t*0.8 + idx) * 0.0015; });
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', resize);
  })();

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
      gastro:    { url:'lafonda.dev',    caption:'Carta editorial con categorías, precios y el plato del chef destacado.' },
      ecommerce: { url:'novastore.dev',  caption:'Tienda con promos, grilla de productos, precios tachados y rating.' },
      servicios: { url:'ironstudio.dev', caption:'Agenda semanal de clases y reserva de turno en un clic.' },
      moda:      { url:'studio21.dev',   caption:'Lookbook editorial con grilla asimétrica y tipografía protagonista.' },
      joyeria:   { url:'aurea.dev',      caption:'Vitrina elegante centrada en la pieza destacada y el detalle artesanal.' },
      barberia:  { url:'elbarbero.dev',  caption:'Estética clásica de barbería con lista de servicios, precios y turnos.' },
      burger:    { url:'humoburgers.dev',caption:'Menú de delivery con tiempos de envío, promos y pedido en un toque.' }
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
