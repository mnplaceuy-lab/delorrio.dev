import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, FRAGMENTS, CORE_POS, seeded } from '../constants';
import { glowTexture } from '../helpers/materials';
import { live, useSceneOptions, interaction, clickEnvelope, setCursor, storyValues } from '../state';

// Geometrías compartidas (se crean una sola vez para todos los fragmentos).
function useSharedGeometries() {
  return useMemo(() => {
    const cardShape = new THREE.Shape();
    const w = 1.4, h = 0.9, r = 0.1;
    cardShape.moveTo(-w / 2 + r, -h / 2);
    cardShape.lineTo(w / 2 - r, -h / 2);
    cardShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    cardShape.lineTo(w / 2, h / 2 - r);
    cardShape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    cardShape.lineTo(-w / 2 + r, h / 2);
    cardShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    cardShape.lineTo(-w / 2, -h / 2 + r);
    cardShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    // Tarjeta "incompleta": solo parte del contorno (idea sin terminar).
    const outline = cardShape.getPoints(8);
    const partial = outline.slice(0, Math.floor(outline.length * 0.62)).map((p) => new THREE.Vector3(p.x, p.y, 0));

    return {
      box: new THREE.BoxGeometry(1, 1, 1),
      octa: new THREE.OctahedronGeometry(1, 0),
      ico: new THREE.IcosahedronGeometry(1, 0),
      tetra: new THREE.TetrahedronGeometry(1, 0),
      ring: new THREE.TorusGeometry(1, 0.075, 16, 64),
      card: new THREE.ShapeGeometry(cardShape),
      cardPartial: new THREE.BufferGeometry().setFromPoints(partial),
      node: new THREE.SphereGeometry(1, 12, 12),
    };
  }, []);
}

// Materiales compartidos.
function useSharedMaterials() {
  return useMemo(() => ({
    glass: new THREE.MeshPhysicalMaterial({
      color: COLORS.navy, transparent: true, opacity: 0.35,
      roughness: 0.2, metalness: 0.2, clearcoat: 1, depthWrite: false,
    }),
    edge: new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.75 }),
    edgeSoft: new THREE.LineBasicMaterial({ color: COLORS.light, transparent: true, opacity: 0.4 }),
    // piezas cercanas a cámara: más tenues, como fuera de foco
    edgeNear: new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.3 }),
    glassNear: new THREE.MeshPhysicalMaterial({ color: COLORS.navy, transparent: true, opacity: 0.18, roughness: 0.6, depthWrite: false }),
    ring: new THREE.MeshStandardMaterial({
      color: '#7dd3fc', emissive: COLORS.cyan, emissiveIntensity: 0.35,
      roughness: 0.22, metalness: 0.85,
    }),
    node: new THREE.MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false }),
    cardFill: new THREE.MeshBasicMaterial({ color: COLORS.navy, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    cardBar: new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.55 }),
  }), []);
}

function FragmentBody({ def, geos, mats }) {
  const { type, pos, scale, rot = [0, 0, 0] } = def;
  const near = pos[2] > 0.8;
  const edgesCache = useMemo(() => {
    if (['box', 'octa', 'ico', 'tetra'].includes(type)) return new THREE.EdgesGeometry(geos[type]);
    return null;
  }, [type, geos]);

  if (type === 'node') {
    return <mesh geometry={geos.node} material={mats.node} position={pos} scale={scale} />;
  }
  if (type === 'ring') {
    return <mesh geometry={geos.ring} material={mats.ring} position={pos} rotation={rot} scale={scale} />;
  }
  if (type === 'card') {
    return (
      <group position={pos} rotation={rot} scale={scale}>
        <mesh geometry={geos.card} material={mats.cardFill} />
        <line geometry={geos.cardPartial} material={mats.edge} />
        {/* un par de barras sueltas: interfaz a medio armar */}
        <mesh material={mats.cardBar} position={[-0.25, 0.22, 0.01]}>
          <planeGeometry args={[0.6, 0.08]} />
        </mesh>
        <mesh material={mats.cardBar} position={[-0.38, 0.02, 0.01]}>
          <planeGeometry args={[0.34, 0.06]} />
        </mesh>
      </group>
    );
  }
  // sólidos de "vidrio" con aristas nítidas
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <mesh geometry={geos[type]} material={near ? mats.glassNear : mats.glass} />
      <lineSegments geometry={edgesCache} material={near ? mats.edgeNear : type === 'box' ? mats.edge : mats.edgeSoft} />
    </group>
  );
}

const CORE = new THREE.Vector3(...CORE_POS);
const _m4 = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// Movimiento mínimo + hover + reacción al click del núcleo.
function Fragment({ def, index, geos, mats }) {
  const ref = useRef();
  const spinRef = useRef();
  const glowRef = useRef();
  const { reducedMotion, interactive, canHover } = useSceneOptions();
  const localDef = useMemo(() => ({ ...def, pos: [0, 0, 0] }), [def]);
  const glow = useMemo(() => glowTexture(), []);
  const motion = useMemo(() => {
    const r = seeded(index + 11);
    return { phase: r() * Math.PI * 2, speed: 0.35 + r() * 0.35, amp: 0.035 + r() * 0.035, spin: (r() - 0.5) * 0.25 };
  }, [index]);
  // orientación "mirando al núcleo" para la secuencia de click
  const facingCore = useMemo(() => {
    _m4.lookAt(new THREE.Vector3(...def.pos), CORE, UP);
    return new THREE.Quaternion().setFromRotationMatrix(_m4);
  }, [def]);
  const hitRadius = Math.max(def.scale * 1.4, 0.22);

  useFrame((state, dt) => {
    if (!ref.current) return;
    const d = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const h = (interaction.frag[index] = THREE.MathUtils.damp(interaction.frag[index], interaction.fragHover === index ? 1 : 0, 8, d));
    const click = clickEnvelope(time);
    const t = time * motion.speed + motion.phase;
    const bob = reducedMotion ? 0 : 1;

    // en el click, las piezas conectadas se acercan un poco al núcleo
    const pull = def.connect ? click * 0.14 + storyValues().pull : click * 0.05;
    const bx = def.pos[0] + Math.sin(t * 0.7) * motion.amp * 0.6 * bob;
    const by = def.pos[1] + Math.sin(t) * motion.amp * bob;
    ref.current.position.set(
      bx + (CORE.x - bx) * pull,
      by + (CORE.y - by) * pull,
      def.pos[2] + (CORE.z - def.pos[2]) * pull
    );
    ref.current.scale.setScalar(1 + h * 0.14);

    if (!reducedMotion) {
      if (def.type === 'card') {
        spinRef.current.rotation.y = Math.sin(t * 0.8) * 0.25;
        spinRef.current.rotation.x = Math.cos(t * 0.6) * 0.12;
      } else {
        spinRef.current.rotation.y += motion.spin * d * (1 - click);
        spinRef.current.rotation.x += motion.spin * 0.6 * d * (1 - click);
      }
      if (click > 0) spinRef.current.quaternion.slerp(facingCore, click * 0.12); // se orientan hacia el núcleo
    }

    glowRef.current.material.opacity = h * 0.32 + (def.connect ? click * 0.18 : 0);
    live.fragments[index].copy(ref.current.position);
  });

  const handlers = interactive && canHover && !reducedMotion ? {
    onPointerOver: (e) => {
      e.stopPropagation();
      interaction.fragHover = index;
      if (def.connect) interaction.trips.push({ kind: 'in', index });
      setCursor('pointer');
    },
    onPointerOut: () => {
      if (interaction.fragHover === index) interaction.fragHover = -1;
      setCursor('auto');
    },
  } : {};

  return (
    <group ref={ref} position={def.pos}>
      <sprite ref={glowRef} scale={[def.scale * 3.4 + 0.25, def.scale * 3.4 + 0.25, 1]} raycast={() => null}>
        <spriteMaterial map={glow} color={COLORS.cyan} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={spinRef}>
        <FragmentBody def={localDef} geos={geos} mats={mats} />
      </group>
      {/* zona de hover invisible, más generosa que la pieza (las piezas son chicas) */}
      <mesh visible={false} {...handlers}>
        <sphereGeometry args={[hitRadius, 8, 8]} />
      </mesh>
    </group>
  );
}

export default function IdeaFragments() {
  const { frags } = useSceneOptions();
  const geos = useSharedGeometries();
  const mats = useSharedMaterials();
  // opacidades base: el scroll las atenúa cuando la interfaz toma protagonismo
  const base = useMemo(() => Object.fromEntries(Object.entries(mats).map(([k, m]) => [k, m.opacity])), [mats]);
  useFrame(() => {
    const f = storyValues().fragments;
    for (const k in mats) if (mats[k].transparent) mats[k].opacity = base[k] * f;
  });
  return (
    <group>
      {FRAGMENTS.map((def, i) => frags.has(i) && (
        <Fragment key={i} index={i} def={def} geos={geos} mats={mats} />
      ))}
    </group>
  );
}
