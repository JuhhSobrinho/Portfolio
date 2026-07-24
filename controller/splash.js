const irParaHome = () => window.location.href = './view/index.html';

if (window.gsap) {
  const linhas = gsap.utils.toArray('.splash-terminal .terminal-linha');

  gsap.set('.splash-terminal', { opacity: 0, scale: 0.96, y: 10 });
  gsap.set(linhas, { opacity: 0, y: 10 });

  gsap.timeline({ onComplete: irParaHome })
    .to('.splash-terminal', { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' })
    .to(linhas, { opacity: 1, y: 0, duration: 0.35, stagger: 0.3, ease: 'power2.out' })
    .to('.splash-terminal', { opacity: 1, duration: 0.4 })
    .to('body', { opacity: 0, duration: 0.4, ease: 'power1.in' });
} else {
  setTimeout(irParaHome, 2000);
}