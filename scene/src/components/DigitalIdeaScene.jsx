import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import CameraRig from './CameraRig';
import useScrollStory from './useScrollStory';
import IdeaCore from './IdeaCore';
import IdeaFragments from './IdeaFragments';
import ConnectionLines from './ConnectionLines';
import ProductPanels from './ProductPanels';
import SceneLights from './SceneLights';
import PostEffects from './PostEffects';
import Particles from './Particles';
import { SceneContext, interaction } from '../state';
import { TIERS, detectTier } from '../constants';

function useTier() {
  const [tier, setTier] = useState(() => detectTier());
  useEffect(() => {
    let id;
    const onResize = () => { clearTimeout(id); id = setTimeout(() => setTier(detectTier()), 200); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(id); window.removeEventListener('resize', onResize); };
  }, []);
  return tier;
}

// Pausa el render cuando la escena no está en pantalla.
function useOnScreen(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

/**
 * Escena 3D reutilizable: ideas dispersas → núcleo → organización → interfaz.
 * Props: className, intensity (0–1.5), interactive,
 * calm — modo tranquilo (se usa cuando el sistema pide "reducir movimiento"): todo se mueve
 *        más lento, sin parallax ni scroll, pero la escena sigue viva y responde al mouse.
 * reducedMotion — escena totalmente quieta (solo si se pide explícitamente).
 * onCoreToggle(open?: boolean) — avisa al HTML cuando se hace click en el núcleo.
 */
export default function DigitalIdeaScene({ className = '', intensity = 1, interactive = true, calm = false, reducedMotion = false, onCoreToggle = null }) {
  const containerRef = useRef();
  const tierName = useTier();
  const tier = TIERS[tierName];
  const visible = useOnScreen(containerRef);
  // si el equipo no llega a una fluidez aceptable, se baja la resolución y se quita el bloom
  const [degraded, setDegraded] = useState(false);
  // hover real solo con mouse; en pantallas táctiles queda el toque sobre el núcleo
  const canHover = useMemo(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);

  const options = useMemo(() => ({
    intensity, interactive, reducedMotion, calm, onCoreToggle, canHover,
    tier: tierName,
    frags: new Set(tier.frags),
    panels: new Set(tier.panels),
  }), [intensity, interactive, reducedMotion, calm, onCoreToggle, canHover, tierName, tier]);

  // en mobile no hay historia de scroll: se muestra directamente el estado organizado
  useScrollStory(containerRef, { enabled: !reducedMotion && !calm && tierName !== 'mobile' });

  const frameloop = reducedMotion ? 'demand' : visible ? 'always' : 'never';

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={degraded ? 1 : tier.dpr}
        camera={{ position: [0.35, 0.45, 10.4], fov: 35, near: 0.1, far: 60 }}
        gl={{ antialias: tier.post === 'none', alpha: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ camera, gl, clock }) => {
          camera.lookAt(0.1, 0, 0);
          interaction.canvas = gl.domElement;
          if (calm) {
            // modo tranquilo: el tiempo de toda la escena corre al 40%
            const getDelta = clock.getDelta.bind(clock);
            clock.getDelta = () => { const d = getDelta(); clock.elapsedTime -= d * 0.6; return d * 0.4; };
          }
        }}
        onPointerMissed={() => onCoreToggle && onCoreToggle(false)}
        frameloop={frameloop}
      >
        {/* el contexto se re-provee dentro del Canvas (otro reconciler) */}
        <SceneContext.Provider value={options}>
          <PerformanceMonitor bounds={() => [28, 60]} onDecline={() => setDegraded(true)} flipflops={2} />
          <CameraRig />
          <SceneLights />
          <group>
            <IdeaFragments />
            <ConnectionLines />
            <IdeaCore />
            <ProductPanels />
            <Particles key={tierName} count={tier.particles} />
          </group>
          {tier.post !== 'none' && !degraded && <PostEffects intensity={intensity} light={tier.post === 'light'} />}
        </SceneContext.Provider>
      </Canvas>
    </div>
  );
}
