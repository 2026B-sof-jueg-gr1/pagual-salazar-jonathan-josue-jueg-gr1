/* ══════════════════════════════════════
   main.js — Ascenso a la Superficie
   ══════════════════════════════════════ */

// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ── Scroll reveal ──
const revealElements = document.querySelectorAll('[data-reveal]');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
);

revealElements.forEach(el => observer.observe(el));

// ── Particles ──
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const count = 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 14;
    const delay = Math.random() * 12;
    const drift = (Math.random() - 0.5) * 100;
    const size = Math.random() > 0.8 ? 3 : 2;

    Object.assign(p.style, {
      left: `${left}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      '--drift': `${drift}px`,
      opacity: 0,
    });

    // random color: blue or purple
    if (Math.random() > 0.6) p.style.background = '#8844ff';

    container.appendChild(p);
  }
}

createParticles();

// ── Parry meter demo animation ──
function animateParryMeter() {
  const slots = document.querySelectorAll('.parry-slot');
  if (!slots.length) return;

  let count = 4;
  let recharging = false;

  function discharge() {
    if (count <= 0) {
      recharging = true;
      recharge();
      return;
    }
    count--;
    slots[count].classList.remove('filled');
    setTimeout(discharge, 900);
  }

  function recharge() {
    if (count >= 4) {
      recharging = false;
      setTimeout(discharge, 2000);
      return;
    }
    setTimeout(() => {
      slots[count].classList.add('filled');
      count++;
      recharge();
    }, 500);
  }

  setTimeout(discharge, 2000);
}

animateParryMeter();

// ── Smooth nav link active state ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function updateActiveNav() {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === `#${current}`) {
      link.style.color = 'var(--accent-blue)';
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
