import * as THREE from 'three';

// Textura de halo radial (se genera en canvas: no hay descargas externas).
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(186,230,253,0.85)');
  grad.addColorStop(0.45, 'rgba(56,189,248,0.28)');
  grad.addColorStop(1, 'rgba(56,189,248,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

// Fresnel: brillo solo en los bordes de la esfera (look de vidrio con rim light).
export function createFresnelMaterial({ color = '#38BDF8', power = 2.4, intensity = 0.9 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
        gl_FragColor = vec4(uColor * uIntensity, f * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
