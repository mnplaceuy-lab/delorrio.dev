import { Environment, Lightformer } from '@react-three/drei';
import { COLORS, CORE_POS } from '../constants';

// Luz fría y controlada: la principal sale del núcleo, rims suaves desde atrás.
// Environment procedural (Lightformers): reflejos de estudio sin descargar HDRIs.
export default function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.18} color="#9fb4d6" />
      <pointLight position={CORE_POS} color={COLORS.cyan} intensity={7} distance={7} decay={1.6} />
      <directionalLight position={[-4, 3, -4]} intensity={0.7} color="#7dd3fc" />
      <directionalLight position={[5, 2, -3]} intensity={0.5} color="#c7d2fe" />
      <directionalLight position={[0, 4, 6]} intensity={0.2} color="#e2e8f0" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.2} color="#7dd3fc" position={[0, 4, -6]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#e2e8f0" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={0.8} color={COLORS.cyan} position={[5, -1, 3]} scale={3} />
      </Environment>
    </>
  );
}
