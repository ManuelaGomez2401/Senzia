'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const header = $('#header');
  const navLinks = $('#navLinks');
  const menuToggle = $('#menuToggle');
  const toTop = $('#toTop');
  const canvas = $('#heroCanvas');

  // Año automático del footer.
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Menú móvil.
  const closeMenu = () => {
    navLinks?.classList.remove('open');
    menuToggle?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menú');
  };

  menuToggle?.addEventListener('click', () => {
    const isOpen = navLinks?.classList.toggle('open') ?? false;
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });
  if (navLinks) $$('a', navLinks).forEach(link => link.addEventListener('click', closeMenu));

  // Encabezado, botón volver arriba y navegación activa.
  const sections = $$('main section[id]');
  const sectionLinks = $$('.nav-links a[href^="#"]:not(.btn)');
  const onScroll = () => {
    const scrollY = window.scrollY;
    header?.classList.toggle('scrolled', scrollY > 20);
    toTop?.classList.toggle('show', scrollY > 600);

    let current = '';
    sections.forEach(section => {
      if (scrollY >= section.offsetTop - 150) current = section.id;
    });
    sectionLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${current}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Animaciones de aparición. Si el navegador no soporta IntersectionObserver,
  // se muestran los elementos para no ocultar contenido.
  const revealElements = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealElements.forEach((element, index) => {
      element.style.transitionDelay = `${(index % 4) * 70}ms`;
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach(element => element.classList.add('visible'));
  }

  // Contadores animados.
  const animateCount = element => {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    const suffix = element.dataset.suffix || '';
    const duration = 1200;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(counter => countObserver.observe(counter));
  } else {
    counters.forEach(animateCount);
  }

  // Fondo de red de nodos del hero.
  if (canvas && canvas.getContext) {
    const context = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let nodes = [];
    let animationId = null;
    let heroVisible = true;
    const mouse = { x: null, y: null };

    const resizeCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(Math.floor((width * height) / 15000), 75);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.8
      }));
      drawFrame(false);
    };

    const drawFrame = move => {
      context.clearRect(0, 0, width, height);
      nodes.forEach((node, index) => {
        if (move) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }
        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(34, 211, 238, .8)';
        context.fill();

        for (let next = index + 1; next < nodes.length; next++) {
          const other = nodes[next];
          const distance = Math.hypot(node.x - other.x, node.y - other.y);
          if (distance < 140) {
            context.strokeStyle = `rgba(139, 92, 246, ${(1 - distance / 140) * 0.4})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }

        if (mouse.x !== null && mouse.y !== null) {
          const distance = Math.hypot(node.x - mouse.x, node.y - mouse.y);
          if (distance < 160) {
            context.strokeStyle = `rgba(34, 211, 238, ${(1 - distance / 160) * 0.5})`;
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(mouse.x, mouse.y);
            context.stroke();
          }
        }
      });
    };

    const animate = () => {
      if (!heroVisible || reduceMotion) return;
      drawFrame(true);
      animationId = requestAnimationFrame(animate);
    };
    const startAnimation = () => {
      if (!reduceMotion && heroVisible && animationId === null) {
        animationId = requestAnimationFrame(animate);
      }
    };
    const stopAnimation = () => {
      if (animationId !== null) cancelAnimationFrame(animationId);
      animationId = null;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.parentElement?.addEventListener('mousemove', event => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    });
    canvas.parentElement?.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    if ('IntersectionObserver' in window && !reduceMotion) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible) startAnimation();
        else stopAnimation();
      });
      heroObserver.observe(canvas);
    }
    startAnimation();
  }

  // Validación del formulario. No simula un envío: informa claramente que
  // falta conectar un endpoint real (Formspree o un backend).
  const form = $('#contactForm');
  const status = $('#formStatus');

  const setError = (name, message) => {
    if (!form) return;
    const field = form.elements.namedItem(name)?.closest('.field');
    const error = $(`.error[data-for="${name}"]`, form);
    field?.classList.toggle('invalid', Boolean(message));
    if (error) error.textContent = message;
  };

  const validateForm = () => {
    if (!form) return false;
    let valid = true;
    const name = form.elements.namedItem('nombre').value.trim();
    const email = form.elements.namedItem('email').value.trim();
    const message = form.elements.namedItem('mensaje').value.trim();

    if (name.length < 2) {
      setError('nombre', 'Escribe tu nombre (mínimo 2 caracteres).');
      valid = false;
    } else setError('nombre', '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('email', 'Escribe un correo electrónico válido.');
      valid = false;
    } else setError('email', '');

    if (message.length < 10) {
      setError('mensaje', 'Cuéntanos un poco más (mínimo 10 caracteres).');
      valid = false;
    } else setError('mensaje', '');

    return valid;
  };

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (status) {
      status.className = 'form-status';
      status.textContent = '';
    }
    if (!validateForm()) return;

    if (status) {
      status.textContent = 'Tus datos están validados. Para recibir el mensaje, Senzia debe conectar este formulario a un servicio de envío.';
      status.classList.add('ok');
    }
    console.info('Formulario validado en modo demostración. No se enviaron datos.');
  });

  form?.querySelectorAll('input, textarea').forEach(element => {
    element.addEventListener('input', () => {
      if (element.name && ['nombre', 'email', 'mensaje'].includes(element.name)) {
        setError(element.name, '');
      }
    });
  });
});
