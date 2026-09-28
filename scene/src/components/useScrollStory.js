import { useEffect } from 'react';
import { interaction } from '../state';

// El scroll de la sección avanza la historia: ideas sueltas → núcleo → interfaz.
// Usa el GSAP + ScrollTrigger que el sitio ya carga (no se duplica en el bundle).
// Si GSAP no estuviera disponible, calcula el mismo progreso con un listener de scroll.
export default function useScrollStory(containerRef, { enabled = true } = {}) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!enabled) { interaction.storyTarget = 0.85; interaction.story = 0.85; return; }
    const trigger = el.closest('section') || el;
    const { gsap, ScrollTrigger } = window;

    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      const proxy = { v: 0 };
      const tween = gsap.to(proxy, {
        v: 1,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top 85%', end: 'top 10%', scrub: 0.8 },
        onUpdate: () => { interaction.storyTarget = proxy.v; },
      });
      return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); };
    }

    const onScroll = () => {
      const r = trigger.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85, end = vh * 0.1;
      interaction.storyTarget = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [containerRef, enabled]);
}
