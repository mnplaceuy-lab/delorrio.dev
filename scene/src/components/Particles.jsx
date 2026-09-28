import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAGMENTS, PANELS, seeded } from '../constants';
import { live, useSceneOptions, interaction } from '../state';
import { coreSurfacePoint, bend, panelAnchor } from './ConnectionLines';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();

// Crea el recorrido de una partícula a partir de las posiciones actuales.
// "req" fuerza un origen/destino (pedido por un hover o por el click).
function makeTrip(rand, req, connected, panelList) {
  if (req ? req.kind === 'in' : rand() < 0.6) {
    const fi = req ? req.index : connected[Math.floor(rand() * connected.length)];
    const start = live.fragments[fi].clone();
    const end = coreSurfacePoint(start.toArray());
    return new THREE.QuadraticBezierCurve3(start, bend(start, end, (fi % 2 ? -1 : 1) * 0.3), end);
  }
  const pi = req ? req.index : panelList[Math.floor(rand() * panelList.length)];
  const end = panelAnchor(PANELS[pi]);
  end.y += live.panelOffsetY[pi];
  end.z += live.panelOffsetZ[pi];
  const start = coreSurfacePoint(end.toArray());
  return new THREE.QuadraticBezierCurve3(start, bend(start, end, pi % 2 ? -0.3 : 0.3), end);
}

// Pocas partículas que viajan de vez en cuando por las conexiones. 1 draw call.
export default function Particles({ count = 14 }) {
  const ref = useRef();
  const { reducedMotion, frags, panels } = useSceneOptions();
  const rand = useMemo(() => seeded(42), []);
  const connected = useMemo(() => FRAGMENTS.map((f, i) => (f.connect && frags.has(i) ? i : -1)).filter((i) => i >= 0), [frags]);
  const panelList = useMemo(() => [...panels], [panels]);
  const trip = (req) => makeTrip(rand, req, connected, panelList);
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ curve: trip(), t: 0, wait: (i < count / 2 ? 0 : 4) + rand() * 4, speed: 0.45 + rand() * 0.25, forced: false })),
    [count, rand, connected, panelList]
  );

  useFrame((_, dt) => {
    if (!ref.current) return;
    // viajes pedidos por interacciones: se asignan a partículas en espera
    if (interaction.trips.length > 12) interaction.trips.splice(0, interaction.trips.length - 12);
    while (interaction.trips.length) {
      const free = items.find((it) => it.wait > 0 && !it.forced);
      if (!free) break; // el pedido queda en cola para el próximo frame
      const req = interaction.trips.shift();
      free.curve = trip(req);
      free.t = 0;
      free.wait = req.delay || 0;
      free.forced = true;
      free.speed = 0.9;
    }
    // con el núcleo en hover, circula más energía
    const rate = 1 + interaction.core * 2.5;
    items.forEach((it, i) => {
      let s = 0;
      if (!reducedMotion) {
        if (it.wait > 0) {
          it.wait -= dt * (it.forced ? 1 : rate);
        } else {
          it.t += dt * it.speed;
          if (it.t >= 1) {
            it.t = 0;
            it.wait = 1.5 + rand() * 3.5; // viajes ocasionales, no constantes
            it.forced = false;
            it.speed = 0.45 + rand() * 0.25;
            it.curve = trip();
          }
          s = Math.sin(it.t * Math.PI); // aparece y desaparece suave
        }
      }
      it.curve.getPoint(it.t, _p);
      _m.makeScale(s, s, s).setPosition(_p);
      ref.current.setMatrixAt(i, _m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[0.032, 10, 10]} />
      <meshBasicMaterial color={[2.4, 2.9, 3.3]} toneMapped={false} />
    </instancedMesh>
  );
}
