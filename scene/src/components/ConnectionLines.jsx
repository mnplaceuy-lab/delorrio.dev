import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { live, useSceneOptions, interaction, clickEnvelope, storyValues } from '../state';
import * as THREE from 'three';
import { QuadraticBezierLine } from '@react-three/drei';
import { COLORS, CORE_POS, CORE_RADIUS, FRAGMENTS, PANELS } from '../constants';

const core = new THREE.Vector3(...CORE_POS);

// Punto sobre la superficie del núcleo en dirección a "target".
export function coreSurfacePoint(target, inset = 0.02) {
  const dir = new THREE.Vector3(...target).sub(core).normalize();
  return core.clone().add(dir.multiplyScalar(CORE_RADIUS - inset));
}

// Punto medio levantado para que la curva no sea una recta.
export function bend(a, b, lift) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mid.y += lift;
  mid.z += lift * 0.4;
  return mid;
}

// Borde izquierdo del panel en coordenadas de mundo.
export function panelAnchor(def) {
  const local = new THREE.Vector3(-def.size[0] / 2, 0, 0);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), def.rotY);
  return local.add(new THREE.Vector3(...def.pos));
}

export function useConnectionCurves(frags, panels) {
  return useMemo(() => {
    const incoming = FRAGMENTS.map((f, i) => {
      if (!f.connect || !frags.has(i)) return null;
      const start = new THREE.Vector3(...f.pos);
      const end = coreSurfacePoint(f.pos);
      const lift = (i % 2 === 0 ? 1 : -1) * (0.25 + (i % 3) * 0.12);
      return { key: `in-${i}`, kind: 'in', index: i, lift, start, end, mid: bend(start, end, lift) };
    }).filter(Boolean);

    const outgoing = PANELS.map((p, i) => {
      const end = panelAnchor(p);
      const start = coreSurfacePoint(end.toArray());
      const lift = (i % 2 === 0 ? 0.3 : -0.3);
      return { key: `out-${p.id}`, kind: 'out', index: i, lift, start, end, mid: bend(start, end, lift) };
    }).filter((c) => panels.has(c.index));
    return { incoming, outgoing };
  }, [frags, panels]);
}

const _end = new THREE.Vector3();
const _panelEnd = new THREE.Vector3();

export default function ConnectionLines() {
  const { reducedMotion, frags, panels } = useSceneOptions();
  const { incoming, outgoing } = useConnectionCurves(frags, panels);
  const all = useMemo(() => [...incoming, ...outgoing], [incoming, outgoing]);
  const refs = useRef([]);

  // Las curvas siguen a los fragmentos y paneles mientras flotan.
  useFrame((state) => {
    const click = clickEnvelope(state.clock.elapsedTime);
    const sv = storyValues();
    all.forEach((c, i) => {
      const line = refs.current[i];
      if (!line) return;
      // brillo: base + hover del núcleo + hover de su pieza/panel + click
      const own = c.kind === 'in' ? interaction.frag[c.index] : interaction.panel[c.index];
      const base = c.kind === 'in' ? 0.24 : 0.32;
      const storyF = c.kind === 'in' ? sv.fragments : sv.panels;
      line.material.opacity = Math.min(1, base * storyF + interaction.core * 0.22 + own * 0.6 + click * 0.45);
      if (reducedMotion) return;
      if (c.kind === 'in') {
        const start = live.fragments[c.index];
        _end.copy(coreSurfacePoint(start.toArray()));
        line.setPoints(start, _end, bend(start, _end, c.lift));
      } else {
        _panelEnd.copy(c.end);
        _panelEnd.y += live.panelOffsetY[c.index];
        _panelEnd.z += live.panelOffsetZ[c.index];
        line.setPoints(c.start, _panelEnd, bend(c.start, _panelEnd, c.lift));
      }
    });
  });

  return (
    <group>
      {all.map((c, i) => (
        <QuadraticBezierLine
          key={c.key}
          ref={(el) => (refs.current[i] = el)}
          start={c.start}
          end={c.end}
          mid={c.mid}
          color={COLORS.cyan}
          lineWidth={1}
          transparent
          opacity={c.kind === 'in' ? 0.28 : 0.35}
          depthWrite={false}
        />
      ))}
    </group>
  );
}
