import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { FRAGMENTS, PANELS } from './constants';

// Posiciones "vivas" que cada frame actualizan fragmentos y paneles.
// Líneas y partículas las leen para seguirlos sin re-render de React.
export const live = {
  fragments: FRAGMENTS.map((f) => new THREE.Vector3(...f.pos)),
  panelOffsetY: PANELS.map(() => 0),
  panelOffsetZ: PANELS.map(() => 0),
};

// Estado de interacción (mutable, fuera de React: no provoca re-renders).
export const interaction = {
  coreTarget: 0,          // 1 mientras el cursor está sobre el núcleo
  core: 0,                // valor suavizado 0..1
  frag: FRAGMENTS.map(() => 0),   // hover suavizado por fragmento
  fragHover: -1,
  panel: PANELS.map(() => 0),     // hover suavizado por panel
  panelHover: -1,
  pulseAt: -10,           // momento del último pulso de energía
  clickAt: -10,           // inicio de la secuencia de click
  trips: [],              // viajes de partículas pedidos por las interacciones
  canvas: null,
  pointer: { x: 0, y: 0 },  // mouse normalizado -1..1 respecto de la escena (suavizado)
  pointerTarget: { x: 0, y: 0 },
  storyTarget: 0,           // progreso de scroll 0..1 (GSAP ScrollTrigger)
  story: 0,                 // suavizado
};

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Traducción del scroll a los 3 momentos de la historia.
// 0 → fragmentos sueltos · 0.5 → núcleo intenso · 1 → interfaz dominante
export function storyValues(story = interaction.story) {
  return {
    fragments: 1 - smoothstep(0.5, 0.95, story) * 0.5,          // visibilidad de las ideas sueltas
    pull: smoothstep(0.3, 0.7, story) * 0.12,                   // cuánto se acercan al centro
    core: smoothstep(0.2, 0.5, story) - smoothstep(0.75, 1, story) * 0.45, // intensidad del núcleo
    panels: 0.3 + 0.7 * smoothstep(0.35, 0.8, story),            // presencia de la interfaz
  };
}

export const CLICK_DURATION = 1.2;

// Envolvente 0→1→0 de la secuencia de click (suave, sin rebotes).
export function clickEnvelope(time) {
  const u = (time - interaction.clickAt) / CLICK_DURATION;
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(u * Math.PI);
}

export function setCursor(value) {
  if (interaction.canvas) interaction.canvas.style.cursor = value;
}

// Opciones globales de la escena (props de <DigitalIdeaScene />).
export const SceneContext = createContext({ intensity: 1, interactive: true, reducedMotion: false, onCoreToggle: null });
export const useSceneOptions = () => useContext(SceneContext);
