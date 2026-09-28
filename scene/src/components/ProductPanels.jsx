import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { live, useSceneOptions, interaction, clickEnvelope, setCursor, storyValues } from '../state';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS, PANELS } from '../constants';

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function usePanelMaterials() {
  return useMemo(() => ({
    fill: new THREE.MeshPhysicalMaterial({
      color: COLORS.navyDeep, transparent: true, opacity: 0.82,
      roughness: 0.35, metalness: 0.1, clearcoat: 0.6, depthWrite: false, side: THREE.DoubleSide,
    }),
    border: new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(1.15), transparent: true, opacity: 0.75, toneMapped: false }),
    accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(1.1), toneMapped: false }),
    accentSoft: new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.45 }),
    text: new THREE.MeshBasicMaterial({ color: COLORS.light, transparent: true, opacity: 0.7 }),
    textDim: new THREE.MeshBasicMaterial({ color: COLORS.light, transparent: true, opacity: 0.28 }),
    block: new THREE.MeshBasicMaterial({ color: '#1C3252', transparent: true, opacity: 0.9 }),
  }), []);
}

// Contenido de cada panel: barras, bloques, gráficos, puntos. Sin texto.
// Se describe como una lista de formas y después se fusiona por material:
// cada panel se dibuja con ~5 draw calls en vez de ~20 (una por barra).
function panelSpecs(layout, w, h) {
  const L = -w / 2, T = h / 2;
  const out = [];
  const bar = (x, y, bw, bh, mat) => out.push({ kind: 'rect', x, y, w: bw, h: bh, mat });
  const dot = (x, y, r, mat) => out.push({ kind: 'dot', x, y, r, mat });
  switch (layout) {
    case 'site': {
      dot(L + 0.09, T - 0.09, 0.028, 'accent');                       // logo
      bar(L + 0.26, T - 0.09, 0.2, 0.035, 'text');
      [0, 1, 2, 3].forEach((i) => bar(0.05 + i * 0.16, T - 0.09, 0.1, 0.022, 'textDim')); // navegación
      bar(w / 2 - 0.13, T - 0.09, 0.16, 0.06, 'accent');               // botón nav
      bar(0, T - 0.175, w - 0.02, 0.004, 'textDim');
      bar(L + 0.36, T - 0.3, 0.56, 0.07, 'text');                       // título
      bar(L + 0.3, T - 0.4, 0.44, 0.07, 'accentSoft');
      bar(L + 0.33, T - 0.5, 0.5, 0.025, 'textDim');                    // bajada
      bar(L + 0.29, T - 0.55, 0.42, 0.025, 'textDim');
      bar(L + 0.2, T - 0.65, 0.24, 0.07, 'accent');                     // CTA
      bar(w / 2 - 0.35, T - 0.46, 0.56, 0.4, 'block');                  // imagen
      const cw = (w - 0.26) / 3;
      [0, 1, 2].forEach((i) => bar(L + 0.1 + cw / 2 + i * (cw + 0.03), -h / 2 + 0.13, cw, 0.16, 'block')); // cards
      break;
    }
    case 'stats': {
      bar(L + 0.2, T - 0.1, 0.28, 0.045, 'text');
      dot(w / 2 - 0.1, T - 0.1, 0.03, 'accent');
      [0.14, 0.22, 0.17, 0.3, 0.26, 0.36].forEach((bh, i) =>
        bar(L + 0.16 + i * 0.14, -h / 2 + 0.1 + bh / 2, 0.08, bh, i === 5 ? 'accent' : 'accentSoft'));
      bar(0, -h / 2 + 0.08, w - 0.14, 0.004, 'textDim');
      break;
    }
    case 'list': {
      bar(L + 0.22, T - 0.1, 0.32, 0.045, 'text');
      [0, 1, 2, 3].forEach((i) => {
        dot(L + 0.1, T - 0.24 - i * 0.14, 0.035, i === 0 ? 'accent' : 'block');
        bar(L + 0.33, T - 0.22 - i * 0.14, 0.36, 0.03, 'text');
        bar(L + 0.28, T - 0.265 - i * 0.14, 0.26, 0.02, 'textDim');
        bar(w / 2 - 0.12, T - 0.24 - i * 0.14, 0.1, 0.04, i === 0 ? 'accent' : 'accentSoft');
      });
      break;
    }
    case 'mobile': {
      bar(0, T - 0.06, 0.16, 0.018, 'textDim');
      bar(0, T - 0.25, w - 0.1, 0.24, 'block');
      bar(L + 0.2, T - 0.45, 0.3, 0.04, 'text');
      bar(L + 0.16, T - 0.52, 0.22, 0.04, 'accentSoft');
      bar(L + 0.2, T - 0.59, 0.3, 0.02, 'textDim');
      bar(0, -h / 2 + 0.1, w - 0.14, 0.075, 'accent');
      break;
    }
    default:
  }
  return out;
}

// Fusiona las formas en una geometría por material.
function buildContent(layout, w, h) {
  const groups = {};
  panelSpecs(layout, w, h).forEach((sp) => {
    const g = sp.kind === 'rect' ? new THREE.PlaneGeometry(sp.w, sp.h) : new THREE.CircleGeometry(sp.r, 20);
    g.translate(sp.x, sp.y, sp.kind === 'rect' ? 0.004 : 0.005);
    (groups[sp.mat] = groups[sp.mat] || []).push(g.index ? g.toNonIndexed() : g);
  });
  return Object.entries(groups).map(([mat, geos]) => ({ mat, geometry: mergeGeometries(geos) }));
}

function PanelContent({ layout, w, h, m }) {
  const parts = useMemo(() => buildContent(layout, w, h), [layout, w, h]);
  return (
    <group>
      {parts.map((p) => <mesh key={p.mat} geometry={p.geometry} material={m[p.mat]} raycast={() => null} />)}
    </group>
  );
}

function Panel({ def, index, m }) {
  const [w, h] = def.size;
  const ref = useRef();
  const { reducedMotion, interactive, canHover } = useSceneOptions();
  const phase = index * 1.7;
  // borde propio por panel (para poder iluminar solo el que tiene hover)
  const border = useMemo(() => m.border.clone(), [m]);
  const baseBorder = useMemo(() => border.color.clone(), [border]);
  const ALIGNED_ROT = -0.16; // en el click todos los paneles se alinean a la misma rotación

  useFrame((state, dt) => {
    if (!ref.current) return;
    const d = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const hv = (interaction.panel[index] = THREE.MathUtils.damp(interaction.panel[index], interaction.panelHover === index ? 1 : 0, 8, d));
    const click = clickEnvelope(time);

    // flotación muy leve (≈ 2–4 px en pantalla), desfasada entre paneles
    const y = reducedMotion ? 0 : Math.sin(time * 0.6 + phase) * 0.035;
    const presence = storyValues().panels;
    const z = hv * 0.28 + click * 0.12; // hover: se acerca a cámara
    // parallax propio: cada panel reacciona distinto según su profundidad
    const depth = 0.6 + (def.pos[2] + 0.5) * 0.6;
    const px = interaction.pointer.x, py = interaction.pointer.y;
    ref.current.position.set(def.pos[0] + px * 0.04 * depth, def.pos[1] + y - py * 0.03 * depth, def.pos[2] + z);
    ref.current.rotation.y = def.rotY + (ALIGNED_ROT - def.rotY) * click + px * 0.05 * depth;
    ref.current.rotation.x = py * 0.03 * depth;
    ref.current.scale.setScalar(0.94 + presence * 0.06);
    live.panelOffsetY[index] = y;
    live.panelOffsetZ[index] = z;

    border.opacity = Math.min(1, (0.75 + hv * 0.25 + click * 0.25) * (0.5 + presence * 0.5));
    border.color.copy(baseBorder).multiplyScalar(1 + hv * 0.9 + click * 0.6);
  });

  const handlers = interactive && canHover && !reducedMotion ? {
    onPointerOver: (e) => {
      e.stopPropagation();
      interaction.panelHover = index;
      interaction.trips.push({ kind: 'out', index });
      setCursor('pointer');
    },
    onPointerOut: () => {
      if (interaction.panelHover === index) interaction.panelHover = -1;
      setCursor('auto');
    },
  } : {};

  const { shapeGeo, outlineGeo } = useMemo(() => {
    const shape = roundedRectShape(w, h, 0.06);
    const pts = shape.getPoints(6).map((p) => new THREE.Vector3(p.x, p.y, 0.002));
    return { shapeGeo: new THREE.ShapeGeometry(shape, 6), outlineGeo: new THREE.BufferGeometry().setFromPoints(pts) };
  }, [w, h]);

  return (
    <group ref={ref} position={def.pos} rotation={[0, def.rotY, 0]}>
      <mesh geometry={shapeGeo} material={m.fill} {...handlers} />
      <lineLoop geometry={outlineGeo} material={border} raycast={() => null} />
      <PanelContent layout={def.layout} w={w} h={h} m={m} />
    </group>
  );
}

export default function ProductPanels() {
  const { panels } = useSceneOptions();
  const m = usePanelMaterials();
  // la interfaz gana opacidad a medida que avanza el scroll
  const base = useMemo(() => Object.fromEntries(Object.entries(m).map(([k, mat]) => [k, mat.opacity])), [m]);
  useFrame(() => {
    const presence = storyValues().panels;
    for (const k in m) if (m[k].transparent && k !== 'border') m[k].opacity = base[k] * (0.2 + presence * 0.8);
  });
  return (
    <group>
      {PANELS.map((def, i) => panels.has(i) && <Panel key={def.id} index={i} def={def} m={m} />)}
    </group>
  );
}
