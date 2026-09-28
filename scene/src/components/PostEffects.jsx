import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// Bloom solo sobre lo que supera el umbral (núcleo, nodos, bordes HDR). Vignette mínima.
// "light": versión más barata para tablets (sin multisampling, bloom de menor resolución).
export default function PostEffects({ intensity = 1, light = false }) {
  return (
    <EffectComposer multisampling={light ? 0 : 4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.75 * intensity} radius={0.72} levels={light ? 5 : 8} />
      <Vignette offset={0.32} darkness={0.45} />
    </EffectComposer>
  );
}
