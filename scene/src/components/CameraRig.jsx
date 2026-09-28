import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { interaction, useSceneOptions } from '../state';

const BASE = new THREE.Vector3(0.35, 0.45, 10.4);
const HALF_W = 4.75, HALF_H = 2.5; // extensión de la composición (unidades de mundo)
const TARGET = new THREE.Vector3(0.1, 0, 0);

// Parallax suave: la cámara se desplaza apenas según el mouse y siempre mira al mismo punto.
// Los objetos cercanos se mueven más que los lejanos → profundidad real, sin romper la composición.
export default function CameraRig() {
  const { camera, gl, size } = useThree();
  // distancia de cámara para que la composición entre completa en cualquier proporción
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(35 / 2));
  const fitZ = Math.max(BASE.z, HALF_W / (tanHalf * (size.width / size.height)), HALF_H / tanHalf);
  const { reducedMotion, calm, interactive } = useSceneOptions();

  useEffect(() => {
    if (reducedMotion || calm || !interactive) return;
    const onMove = (e) => {
      const r = gl.domElement.getBoundingClientRect();
      // relativo al centro de la escena, pero funciona con el mouse en toda la sección
      const x = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2));
      const y = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2));
      interaction.pointerTarget.x = THREE.MathUtils.clamp(x, -1.4, 1.4) / 1.4;
      interaction.pointerTarget.y = THREE.MathUtils.clamp(y, -1.4, 1.4) / 1.4;
    };
    const onLeave = () => { interaction.pointerTarget.x = 0; interaction.pointerTarget.y = 0; };
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [gl, reducedMotion, calm, interactive]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const p = interaction.pointer;
    p.x = THREE.MathUtils.damp(p.x, interaction.pointerTarget.x, 2.5, d);
    p.y = THREE.MathUtils.damp(p.y, interaction.pointerTarget.y, 2.5, d);
    interaction.story = THREE.MathUtils.damp(interaction.story, interaction.storyTarget, 3, d);
    camera.position.set(BASE.x + p.x * 0.45, BASE.y - p.y * 0.28, fitZ);
    camera.lookAt(TARGET);
  });
  return null;
}
