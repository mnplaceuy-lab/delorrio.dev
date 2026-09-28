import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSceneOptions, interaction, clickEnvelope, setCursor, storyValues } from '../state';
import { FRAGMENTS, PANELS } from '../constants';
import * as THREE from 'three';
import { COLORS, CORE_POS, CORE_RADIUS } from '../constants';
import { glowTexture, createFresnelMaterial } from '../helpers/materials';

// Vértices únicos de una geometría (para ubicar los nodos en las intersecciones).
function uniqueVertices(geometry) {
  const pos = geometry.attributes.position;
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, new THREE.Vector3(x, y, z));
  }
  return [...seen.values()];
}

// Anillo orbital como línea fina + puntos que lo recorren.
function Orbit({ radius, tilt, opacity = 0.35, dots = 2, speed = 0.12 }) {
  const dotRefs = useRef([]);
  const angle = useRef(0);
  const { reducedMotion } = useSceneOptions();
  useFrame((_, dt) => {
    if (reducedMotion) return;
    // la órbita se acelera un poco con el hover del núcleo
    angle.current += Math.min(dt, 0.05) * speed * (1 + interaction.core * 1.6);
    const t = angle.current;
    dotRefs.current.forEach((m, i) => {
      if (!m) return;
      const a = (i / dots) * Math.PI * 2 + tilt[2] + t;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    });
  });
  const geometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
    const pts = curve.getPoints(128).map((p) => new THREE.Vector3(p.x, p.y, 0));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  const dotPositions = useMemo(
    () => Array.from({ length: dots }, (_, i) => {
      const a = (i / dots) * Math.PI * 2 + tilt[2];
      return [Math.cos(a) * radius, Math.sin(a) * radius, 0];
    }),
    [dots, radius, tilt]
  );
  return (
    <group rotation={tilt}>
      <line geometry={geometry} raycast={() => null}>
        <lineBasicMaterial color={COLORS.cyan} transparent opacity={opacity} depthWrite={false} />
      </line>
      {dotPositions.map((p, i) => (
        <mesh key={i} position={p} ref={(el) => (dotRefs.current[i] = el)} raycast={() => null}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshBasicMaterial color={[2.2, 2.6, 3]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function IdeaCore() {
  const nodesRef = useRef();

  // Cáscara geodésica: icosaedro subdividido. Wireframe = líneas geodésicas.
  const shellGeo = useMemo(() => new THREE.IcosahedronGeometry(CORE_RADIUS, 2), []);
  const shellWire = useMemo(() => new THREE.WireframeGeometry(shellGeo), [shellGeo]);
  const nodes = useMemo(() => uniqueVertices(shellGeo), [shellGeo]);

  // Capa interna (más gruesa, menos subdividida) para dar profundidad.
  const innerGeo = useMemo(() => new THREE.IcosahedronGeometry(CORE_RADIUS * 0.62, 1), []);
  const innerWire = useMemo(() => new THREE.WireframeGeometry(innerGeo), [innerGeo]);

  // Nodos en un único InstancedMesh (1 draw call para ~160 nodos).
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    nodes.forEach((v, i) => {
      const s = i % 7 === 0 ? 1.7 : 1; // algunos nodos más prominentes
      m.makeScale(s, s, s).setPosition(v);
      nodesRef.current.setMatrixAt(i, m);
      nodesRef.current.setColorAt(i, (i % 7 === 0 ? color.setRGB(2.4, 2.8, 3.2) : color.set(COLORS.cyan).multiplyScalar(1.4)));
    });
    nodesRef.current.instanceMatrix.needsUpdate = true;
    nodesRef.current.instanceColor.needsUpdate = true;
  }, [nodes]);

  const fresnel = useMemo(() => createFresnelMaterial({ power: 2.6, intensity: 0.75 }), []);
  const pulseMat = useMemo(() => createFresnelMaterial({ power: 1.8, intensity: 0 }), []);
  const glow = useMemo(() => glowTexture(), []);
  const { reducedMotion, intensity, interactive, onCoreToggle, canHover, frags, panels, tier } = useSceneOptions();
  const glowBoost = tier === 'mobile' ? 1.9 : 1; // sin bloom en mobile: el halo compensa
  const clock = useThree((st) => st.clock);

  const rootRef = useRef();
  const followRef = useRef();
  const spinRef = useRef();
  const innerRef = useRef();
  const haloRef = useRef();
  const heartRef = useRef();
  const heartGlowRef = useRef();
  const wireRef = useRef();
  const pulseRef = useRef();

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);

    // hover suavizado (entrada/salida fluida)
    interaction.core = THREE.MathUtils.damp(interaction.core, interaction.coreTarget, 7, d);
    const h = interaction.core;
    const click = clickEnvelope(t);
    const boost = Math.max(0, storyValues().core); // el scroll intensifica el núcleo a mitad de la historia

    // el núcleo sigue al cursor de forma extremadamente sutil
    followRef.current.position.set(interaction.pointer.x * 0.05, -interaction.pointer.y * 0.035, 0);

    if (!reducedMotion) {
      spinRef.current.rotation.y += d * (0.09 + h * 0.12 + click * 0.5);
      spinRef.current.rotation.x = Math.sin(t * 0.13) * 0.12;
      spinRef.current.rotation.z = Math.cos(t * 0.09) * 0.05;
      innerRef.current.rotation.y -= d * (0.16 + h * 0.2);
      innerRef.current.rotation.x += d * 0.05;
    }
    const breath = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.9);

    // escala: +4% en hover, pequeño latido en el click
    rootRef.current.scale.setScalar(1 + h * 0.04 + click * 0.035 + boost * 0.03);
    haloRef.current.material.opacity = (0.11 + breath * 0.05 + h * 0.08 + click * 0.1 + boost * 0.07) * intensity * glowBoost;
    heartGlowRef.current.material.opacity = 0.8 + breath * 0.15 + h * 0.2;
    heartRef.current.scale.setScalar(1 + breath * 0.06 + h * 0.12 + click * 0.25 + boost * 0.15);
    wireRef.current.material.opacity = 0.45 + h * 0.25 + click * 0.2 + boost * 0.15;
    nodesRef.current.material.color.setScalar(0.85 + h * 0.7 + click * 0.8 + boost * 0.35); // intensifica nodos

    // pulso de energía: una cáscara de luz que se expande y se apaga
    const pu = (t - interaction.pulseAt) / 0.9;
    if (pu >= 0 && pu < 1) {
      pulseRef.current.visible = true;
      pulseRef.current.scale.setScalar(1 + pu * 0.75);
      pulseMat.uniforms.uIntensity.value = (1 - pu) * 0.9;
    } else {
      pulseRef.current.visible = false;
    }
  });

  // --- eventos (solo si la escena es interactiva) ---
  const handlers = !interactive ? {} : reducedMotion ? {
    // movimiento reducido: el click solo abre/cierra los chips, sin animación
    onClick: (e) => { e.stopPropagation(); onCoreToggle && onCoreToggle(); },
    onPointerOver: () => setCursor('pointer'),
    onPointerOut: () => setCursor('auto'),
  } : {
    onPointerOver: (e) => {
      if (!canHover) return;
      e.stopPropagation();
      if (interaction.coreTarget === 0) interaction.pulseAt = clock.elapsedTime;
      interaction.coreTarget = 1;
      setCursor('pointer');
    },
    onPointerOut: () => {
      interaction.coreTarget = 0;
      setCursor('auto');
    },
    onClick: (e) => {
      e.stopPropagation();
      const now = clock.elapsedTime;
      interaction.clickAt = now;
      interaction.pulseAt = now + 0.35;
      // cada idea conectada manda una partícula al núcleo, y el núcleo a cada panel
      FRAGMENTS.forEach((f, i) => { if (f.connect && frags.has(i)) interaction.trips.push({ kind: 'in', index: i }); });
      panels.forEach((i) => interaction.trips.push({ kind: 'out', index: i, delay: 0.45 }));
      onCoreToggle && onCoreToggle();
    },
  };

  return (
    <group position={CORE_POS}>
     <group ref={followRef}>
      <group ref={rootRef}>
        {/* halo de luz detrás del núcleo (sprite: siempre mira a cámara) */}
        <sprite ref={haloRef} scale={[3.4, 3.4, 1]} renderOrder={-1}>
          <spriteMaterial map={glow} color={COLORS.cyan} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>

        <group ref={spinRef}>
          {/* volumen de vidrio oscuro (también es la zona de hover/click) */}
          <mesh geometry={shellGeo} {...handlers}>
            <meshPhysicalMaterial
              color={COLORS.navy}
              transparent
              opacity={0.28}
              roughness={0.12}
              metalness={0.25}
              clearcoat={1}
              clearcoatRoughness={0.15}
              depthWrite={false}
            />
          </mesh>
          {/* rim de luz en los bordes */}
          <mesh geometry={shellGeo} material={fresnel} scale={1.005} raycast={() => null} />

          {/* líneas geodésicas */}
          <lineSegments ref={wireRef} geometry={shellWire} raycast={() => null}>
            <lineBasicMaterial color={COLORS.cyan} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
          </lineSegments>

          {/* nodos luminosos en las intersecciones */}
          <instancedMesh ref={nodesRef} args={[null, null, nodes.length]} raycast={() => null}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>

          {/* capa interna (gira en sentido contrario: profundidad) */}
          <lineSegments ref={innerRef} geometry={innerWire} raycast={() => null}>
            <lineBasicMaterial color={COLORS.cyan} transparent opacity={0.32} depthWrite={false} toneMapped={false} />
          </lineSegments>
        </group>

        {/* pulso de energía */}
        <mesh ref={pulseRef} geometry={shellGeo} material={pulseMat} visible={false} raycast={() => null} />

        {/* núcleo interno: color HDR para que el bloom lo haga emitir luz */}
        <mesh ref={heartRef} raycast={() => null}>
          <sphereGeometry args={[0.17, 32, 32]} />
          <meshBasicMaterial color={[2.2, 2.9, 3.4]} toneMapped={false} />
        </mesh>
        <sprite ref={heartGlowRef} scale={[1.3, 1.3, 1]} raycast={() => null}>
          <spriteMaterial map={glow} color={COLORS.light} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>

      {/* anillos orbitales */}
      <Orbit radius={1.75} tilt={[1.25, 0.2, 0.3]} opacity={0.32} dots={2} speed={0.16} />
      <Orbit radius={2.05} tilt={[1.05, -0.45, 1.4]} opacity={0.18} dots={1} speed={-0.1} />
     </group>
    </group>
  );
}
