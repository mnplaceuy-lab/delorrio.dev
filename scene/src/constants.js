// Paleta y layout compartidos por todos los componentes de la escena.

export const COLORS = {
  bg: '#0F172A',
  cyan: '#38BDF8',
  light: '#E2E8F0',
  navy: '#12213A',
  navyDeep: '#0B1628',
};

// Posición del núcleo (levemente corrido del centro para dejar aire a los paneles).
export const CORE_POS = [0.15, 0, 0];
export const CORE_RADIUS = 1.25;

// Random determinístico: la composición es siempre la misma en cada carga.
export function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fragmentos de la izquierda: tipo, posición, escala, rotación inicial.
// z > 0 = más cerca de cámara (se verán más grandes y suaves), z < 0 = lejos.
export const FRAGMENTS = [
  { type: 'box',    pos: [-3.55,  1.35,  0.2], scale: 0.34, rot: [0.5, 0.7, 0.1], connect: true },
  { type: 'octa',   pos: [-3.95,  0.55, -0.6], scale: 0.22, rot: [0.2, 0.3, 0.4] },
  { type: 'card',   pos: [-2.85,  0.85, -0.4], scale: 0.30, rot: [0.1, 0.5, -0.15], connect: true },
  { type: 'box',    pos: [-2.55,  1.75, -1.2], scale: 0.14, rot: [0.3, 0.1, 0.6] },
  { type: 'ico',    pos: [-3.25,  0.05,  0.9], scale: 0.30, rot: [0.4, 0.2, 0.1], connect: true },
  { type: 'ring',   pos: [-3.65, -0.80,  0.4], scale: 0.26, rot: [1.1, 0.4, 0.0], connect: true },
  { type: 'tetra',  pos: [-3.55, -0.15,  1.3], scale: 0.20, rot: [0.6, 0.9, 0.2] },
  { type: 'box',    pos: [-2.45, -0.55, -0.8], scale: 0.18, rot: [0.2, 0.6, 0.3], connect: true },
  { type: 'ring',   pos: [-3.05, -1.45, -0.3], scale: 0.20, rot: [0.3, 1.2, 0.2] },
  { type: 'card',   pos: [-2.25, -1.30,  0.5], scale: 0.24, rot: [-0.2, 0.4, 0.2], connect: true },
  { type: 'node',   pos: [-2.15,  0.30,  0.3], scale: 0.05 },
  { type: 'node',   pos: [-2.70, -1.95, -0.6], scale: 0.04 },
  { type: 'node',   pos: [-1.95,  1.30, -0.2], scale: 0.04 },
];

// Paneles de la derecha (producto terminado). w/h en unidades de mundo.
export const PANELS = [
  { id: 'site',  pos: [3.05,  1.05, 0.10], size: [1.75, 1.12], rotY: -0.18, layout: 'site' },
  { id: 'stats', pos: [3.75, -0.28, 0.35], size: [1.15, 0.78], rotY: -0.22, layout: 'stats' },
  { id: 'list',  pos: [2.65, -1.32, 0.25], size: [1.15, 0.86], rotY: -0.14, layout: 'list' },
  { id: 'mini',  pos: [4.05, -1.55, -0.45], size: [0.6, 0.92], rotY: -0.24, layout: 'mobile' },
];

// Niveles de detalle por dispositivo (índices de FRAGMENTS / PANELS que se muestran).
export const TIERS = {
  desktop: { frags: FRAGMENTS.map((_, i) => i), panels: [0, 1, 2, 3], particles: 14, post: 'full', dpr: [1, 1.75] },
  tablet:  { frags: [0, 1, 2, 4, 5, 7, 9, 10], panels: [0, 1, 2], particles: 8, post: 'light', dpr: [1, 1.5] },
  mobile:  { frags: [0, 2, 4, 5, 9], panels: [0, 1], particles: 5, post: 'none', dpr: [1, 1.5] },
};

export function detectTier(width = window.innerWidth) {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
