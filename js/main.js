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

  // ===== IDEA CORE — escena 3D de marca (Delorrio.dev) =====
  // Idea (fragmentos, izquierda) → Core (centro) → Producto (paneles, derecha)
  (function(){
    var canvas = document.getElementById('ideaCore');
    if(!canvas || typeof THREE === 'undefined') return;
    var wrap = canvas.parentElement;
    var section = document.querySelector('.idea-3d');
    var spotlightEl = document.getElementById('idea3dSpotlight');

    var CYAN = 0x38bdf8;
    var NAVY = 0x0f172a;
    var LIGHT = 0xe2e8f0;

    var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0.4, 0.6, 9);
    camera.lookAt(0, 0, 0);

    var root = new THREE.Group();
    scene.add(root);

    // ---- IDEA CORE (centro): geometría en capas, translúcida, con punto brillante ----
    var coreGroup = new THREE.Group();
    root.add(coreGroup);

    var outerGeo = new THREE.IcosahedronGeometry(1.15, 1);
    var outerMat = new THREE.MeshBasicMaterial({color:CYAN, wireframe:true, transparent:true, opacity:.55});
    var outerCore = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerCore);

    var glassGeo = new THREE.IcosahedronGeometry(1.05, 1);
    var glassMat = new THREE.MeshBasicMaterial({color:0x123049, transparent:true, opacity:.4});
    var glassCore = new THREE.Mesh(glassGeo, glassMat);
    coreGroup.add(glassCore);

    var innerGeo = new THREE.IcosahedronGeometry(0.55, 0);
    var innerMat = new THREE.MeshBasicMaterial({color:CYAN, wireframe:true, transparent:true, opacity:.8});
    var innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    var centerGeo = new THREE.SphereGeometry(0.1, 12, 12);
    var centerMat = new THREE.MeshBasicMaterial({color:LIGHT});
    var centerPoint = new THREE.Mesh(centerGeo, centerMat);
    coreGroup.add(centerPoint);

    var coreGlow = new THREE.PointLight(CYAN, 1.4, 6);
    coreGlow.position.set(0,0,0);
    coreGroup.add(coreGlow);

    // anillos orbitales
    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.008, 8, 100), new THREE.MeshBasicMaterial({color:CYAN, transparent:true, opacity:.35}));
    ring1.rotation.x = Math.PI/2.3;
    coreGroup.add(ring1);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.006, 8, 100), new THREE.MeshBasicMaterial({color:LIGHT, transparent:true, opacity:.18}));
    ring2.rotation.x = -Math.PI/3.2; ring2.rotation.y = Math.PI/6;
    coreGroup.add(ring2);

    // ---- IZQUIERDA: fragmentos de idea (wireframe, desordenados) ----
    var fragGroup = new THREE.Group();
    root.add(fragGroup);
    var fragments = [];
    var fragGeos = [
      new THREE.BoxGeometry(0.32,0.32,0.32),
      new THREE.PlaneGeometry(0.4,0.26),
      new THREE.RingGeometry(0.14,0.18,16),
      new THREE.BoxGeometry(0.22,0.4,0.22)
    ];
    for(var i=0;i<7;i++){
      var g = fragGeos[i % fragGeos.length];
      var m = new THREE.MeshBasicMaterial({color: i%2===0?CYAN:LIGHT, wireframe:true, transparent:true, opacity:.55});
      var mesh = new THREE.Mesh(g, m);
      var baseX = -3.3 - Math.random()*1.6;
      var baseY = (Math.random()-0.5)*2.6;
      var baseZ = (Math.random()-0.5)*1.4;
      mesh.position.set(baseX, baseY, baseZ);
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
      mesh.userData = {base:{x:baseX,y:baseY,z:baseZ}, speed: 0.3+Math.random()*0.4, phase: Math.random()*Math.PI*2};
      fragGroup.add(mesh);
      fragments.push(mesh);
    }
    // líneas finas de conexión fragmento → core
    var fragLines = [];
    fragments.forEach(function(f){
      var lineGeo = new THREE.BufferGeometry().setFromPoints([f.position.clone(), new THREE.Vector3(0,0,0)]);
      var lineMat = new THREE.LineBasicMaterial({color:CYAN, transparent:true, opacity:.14});
      var line = new THREE.Line(lineGeo, lineMat);
      fragGroup.add(line);
      fragLines.push({line:line, frag:f});
    });

    // ---- DERECHA: paneles de producto terminado (translúcidos, con borde) ----
    var panelGroup = new THREE.Group();
    root.add(panelGroup);
    var panels = [];
    var panelDefs = [
      {w:1.15,h:0.8, x:2.6, y:0.35, z:0.2, rz:-0.05},
      {w:0.8, h:0.55,x:3.55,y:-0.35,z:-0.3,rz:0.04},
      {w:0.65,h:1.0, x:2.35,y:-0.75,z:0.5, rz:0.02}
    ];
    panelDefs.forEach(function(d){
      var geo = new THREE.PlaneGeometry(d.w, d.h);
      var mat = new THREE.MeshBasicMaterial({color:0x14243b, transparent:true, opacity:.72, side:THREE.DoubleSide});
      var panel = new THREE.Mesh(geo, mat);
      panel.position.set(d.x, d.y, d.z);
      panel.rotation.z = d.rz;
      panelGroup.add(panel);

      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color:CYAN, transparent:true, opacity:.5}));
      edges.position.copy(panel.position);
      edges.rotation.copy(panel.rotation);
      panelGroup.add(edges);

      // detalle interno: líneas tipo UI (abstractas, sin texto)
      var detailLines = [];
      var rows = 2 + Math.floor(Math.random()*2);
      for(var r=0;r<rows;r++){
        var lw = d.w * (0.35 + Math.random()*0.4);
        var lGeo = new THREE.PlaneGeometry(lw, 0.045);
        var lMat = new THREE.MeshBasicMaterial({color:CYAN, transparent:true, opacity:.4});
        var lMesh = new THREE.Mesh(lGeo, lMat);
        lMesh.position.set(d.x - d.w/2 + lw/2 + 0.06, d.y + d.h/2 - 0.14 - r*0.18, d.z + 0.01);
        lMesh.rotation.z = d.rz;
        panelGroup.add(lMesh);
        detailLines.push(lMesh);
      }
      panels.push({mesh:panel, edges:edges, base:{x:d.x,y:d.y,z:d.z}, phase:Math.random()*Math.PI*2, details:detailLines});
    });

    // partículas viajando por los caminos de conexión
    var travelers = [];
    for(var t=0;t<10;t++){
      var pGeo = new THREE.SphereGeometry(0.028, 6, 6);
      var pMat = new THREE.MeshBasicMaterial({color:LIGHT, transparent:true, opacity:.85});
      var p = new THREE.Mesh(pGeo, pMat);
      var fromFrag = fragments[t % fragments.length];
      p.userData = {from:fromFrag.position, to:new THREE.Vector3(0,0,0), t: Math.random(), speed: 0.15+Math.random()*0.15};
      root.add(p);
      travelers.push(p);
    }

    function resize(){
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if(!w||!h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
    }
    resize();

    // interacción: parallax + hover sobre el core
    var mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
    var hovering = false, hoverScale = 1;
    wrap.addEventListener('mousemove', function(e){
      var r = wrap.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width) - 0.5;
      mouseY = ((e.clientY - r.top) / r.height) - 0.5;
      if(spotlightEl){
        var sr = section.getBoundingClientRect();
        spotlightEl.style.setProperty('--isx', (((e.clientX - sr.left)/sr.width)*100) + '%');
        spotlightEl.style.setProperty('--isy', (((e.clientY - sr.top)/sr.height)*100) + '%');
      }
      // hover real sobre el core: raycast simple por distancia proyectada
      var ndcX = mouseX * 2, ndcY = -mouseY * 2;
      hovering = Math.abs(ndcX) < 0.28 && Math.abs(ndcY) < 0.28;
    });
    wrap.addEventListener('mouseleave', function(){ mouseX = 0; mouseY = 0; hovering = false; });

    // progreso de scroll (0 = recién entra la sección, 1 = ya pasó)
    var scrollProgress = 0;
    function updateScrollProgress(){
      if(!section) return;
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = 1 - (r.top + r.height*0.3) / (vh + r.height*0.3);
      scrollProgress = Math.min(1, Math.max(0, p));
    }
    window.addEventListener('scroll', updateScrollProgress, {passive:true});
    updateScrollProgress();

    var clock = new THREE.Clock();
    function animate(){
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();

      // idle: rotación lenta + respiración del core
      coreGroup.rotation.y = t * 0.12;
      coreGroup.rotation.x = Math.sin(t*0.15) * 0.08;
      outerCore.rotation.y = -t*0.08;
      innerCore.rotation.x = t*0.2; innerCore.rotation.y = t*0.15;
      ring1.rotation.z = t*0.1;
      ring2.rotation.z = -t*0.08;

      var breathe = 1 + Math.sin(t*0.9)*0.02;
      var targetScale = (hovering ? 1.04 : 1) * breathe;
      hoverScale += (targetScale - hoverScale) * 0.06;
      coreGroup.scale.setScalar(hoverScale);
      coreGlow.intensity = (hovering ? 2.1 : 1.3) + Math.sin(t*0.9)*0.15;
      outerMat.opacity = hovering ? 0.8 : (0.5 + Math.sin(t*0.8)*0.08);

      // fragmentos: leve deriva + suave acercamiento con scroll
      fragments.forEach(function(f, idx){
        var d = f.userData;
        var drift = Math.sin(t*d.speed + d.phase) * 0.06;
        var approach = scrollProgress * 0.35;
        f.position.x = d.base.x + drift + approach;
        f.position.y = d.base.y + Math.cos(t*d.speed*0.8 + d.phase) * 0.05;
        f.rotation.x += 0.003; f.rotation.y += 0.004;
        f.material.opacity = 0.55 - scrollProgress*0.15;
      });
      fragLines.forEach(function(fl){
        var pos = fl.line.geometry.attributes.position;
        pos.setXYZ(0, fl.frag.position.x, fl.frag.position.y, fl.frag.position.z);
        pos.needsUpdate = true;
        fl.line.material.opacity = 0.1 + scrollProgress*0.08;
      });

      // paneles de producto: flotan suave, ganan presencia con scroll
      panels.forEach(function(pn){
        var b = pn.base;
        pn.mesh.position.y = b.y + Math.sin(t*0.5 + pn.phase) * 0.05;
        pn.edges.position.copy(pn.mesh.position);
        var op = 0.5 + scrollProgress*0.4;
        pn.mesh.material.opacity = Math.min(0.85, op);
        pn.edges.material.opacity = Math.min(0.7, 0.3 + scrollProgress*0.35);
        pn.details.forEach(function(d){ d.position.y = d.position.y; d.material.opacity = Math.min(0.6, 0.25 + scrollProgress*0.3); });
      });

      // partículas viajando de fragmentos al core, y del core a paneles
      travelers.forEach(function(p, idx){
        var u = p.userData;
        u.t += u.speed * 0.016;
        if(u.t > 1){ u.t = 0; }
        var target = idx % 2 === 0 ? u.to : panels[idx % panels.length].mesh.position;
        var start = idx % 2 === 0 ? u.from : new THREE.Vector3(0,0,0);
        p.position.lerpVectors(start, target, u.t);
        p.material.opacity = Math.sin(u.t * Math.PI) * 0.9;
      });

      // parallax de cámara/grupo con el mouse
      targetRotX += ((-mouseY*0.25) - targetRotX) * 0.05;
      targetRotY += ((mouseX*0.35) - targetRotY) * 0.05;
      root.rotation.x = targetRotX;
      root.rotation.y = targetRotY;
      root.position.x = mouseX * 0.25;

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', resize);
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
