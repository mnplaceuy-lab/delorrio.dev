import { createRoot } from 'react-dom/client';
import DigitalIdeaScene from './components/DigitalIdeaScene';

// Monta <DigitalIdeaScene /> en cada elemento con data-digital-idea-scene.
function mountAll() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-digital-idea-scene]').forEach((el) => {
    if (el.__sceneMounted) return;
    el.__sceneMounted = true;
    const d = el.dataset;
    // click en el núcleo: abre/cierra los chips (Webs · IA · Productos) del contenedor HTML
    const host = el.closest('.idea-3d__canvas-wrap') || el.parentElement;
    const onCoreToggle = (open) => {
      const next = typeof open === 'boolean' ? open : !host.classList.contains('is-expanded');
      host.classList.toggle('is-expanded', next);
    };
    createRoot(el).render(
      <DigitalIdeaScene
        className={d.className || ''}
        intensity={d.intensity ? parseFloat(d.intensity) : 1}
        interactive={d.interactive !== 'false'}
        calm={reduce}
        reducedMotion={d.reducedMotion === 'true'}
        onCoreToggle={onCoreToggle}
      />
    );
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
