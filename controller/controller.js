import { carregarBancoDeDados, seTLocarStorage, geTLocalStorage } from '../model/model.js';
import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@11.13.1/+esm";

const guias = document.getElementById('guias');
const imgFicha = document.getElementById('img-ficha');
const path = window.location.pathname;

let sectionImgFicha = '';

// GSAP + ScrollTrigger só entram em cena se o CDN carregou (progressive enhancement)
const temGsap = typeof window.gsap !== 'undefined';
const temAnime = typeof window.anime !== 'undefined';

if (temGsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  // A rolagem acontece dentro de <main> (overflow: auto no CSS), não na window,
  // então todo ScrollTrigger precisa apontar pra esse elemento como scroller.
  ScrollTrigger.defaults({ scroller: 'main' });
}

function particulas() {
particlesJS("particles-js", {
  particles: {
    number: { value: 80, density: { enable: true, value_area: 800 } },
    color: { value: "#089964" },
    shape: { type: "triangle" },
    opacity: { value: 0.5, random: false },
    size: { value: 3, random: true },
    line_linked: {
      enable: true,
      distance: 160,
      color: "#ffffff",
      opacity: 0.4,
      width: 1
    },
    move: { enable: true, speed: 4 }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: { enable: true, mode: "repulse" },
      onclick: { enable: true, mode: "push" }
    },
    modes: {
      repulse: { distance: 100 },
      push: { particles_nb: 4 }
    }
  },
  retina_detect: true
});
}

/* ==================== GSAP: timeline de entrada da Hero ==================== */
function animarHero() {
  if (!temGsap) return;

  // gsap.set + .to (em vez de .from) evita o "flash" de conteúdo visível
  // antes da animação começar em elementos que só entram depois na timeline
  gsap.set('.intro-tag', { opacity: 0, y: 20 });
  gsap.set('#helloWorld', { opacity: 0, y: 40 });
  gsap.set('.descricao-titulo', { opacity: 0, y: 20 });
  gsap.set('.midias .icon-midias', { opacity: 0, y: 20 });
  // rotationY explícito porque o GSAP assume controle total do transform
  // e precisa saber do rotateY(10deg) já definido no CSS pra não resetar
  gsap.set('.imagem-3d', { opacity: 0, x: 60, rotationY: 10 });
  gsap.set('.descricao-cacador', { opacity: 0, scale: 0.6 });
  gsap.set('.roll-mouse', { opacity: 0 });

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to('.intro-tag', { opacity: 1, y: 0, duration: 0.5 })
    .to('#helloWorld', { opacity: 1, y: 0, duration: 0.8 }, '-=0.3')
    .to('.descricao-titulo', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.midias .icon-midias', { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 }, '-=0.3')
    .to('.imagem-3d', { opacity: 1, x: 0, rotationY: 10, duration: 0.9 }, '-=0.6')
    .to('.descricao-cacador', { opacity: 1, scale: 1, duration: 0.5 }, '-=0.4')
    .to('.roll-mouse', { opacity: 1, duration: 0.6 });
}

/* ==================== GSAP: parallax leve na imagem-3d (mouse) ==================== */
function parallaxImagem() {
  if (!temGsap || !window.matchMedia('(pointer: fine)').matches) return;

  const alvo = document.querySelector('.imagem-3d');
  if (!alvo) return;

  const moveX = gsap.quickTo(alvo, 'x', { duration: 0.6, ease: 'power3.out' });
  const moveY = gsap.quickTo(alvo, 'y', { duration: 0.6, ease: 'power3.out' });

  // espera a timeline da hero terminar antes de ligar o parallax,
  // pra não brigar com a animação de entrada na propriedade "x"
  setTimeout(() => {
    window.addEventListener('mousemove', (e) => {
      moveX((e.clientX / window.innerWidth - 0.5) * 20);
      moveY((e.clientY / window.innerHeight - 0.5) * 20);
    });
  }, 3000);
}

/* ==================== GSAP + ScrollTrigger: reveals ao rolar a página ==================== */
function scrollReveals() {
  if (!temGsap || !window.ScrollTrigger) return;

  gsap.set('.sobre-quem-sou', { opacity: 0, x: -60 });
  gsap.set('.terminal-formacoes', { opacity: 0, x: 60 });
  gsap.set('.marquee-container', { opacity: 0 });
  gsap.set('.git-stats', { opacity: 0, x: -40 });
  gsap.set('.img-skill', { opacity: 0, scale: 0.4 });

  gsap.to('.sobre-quem-sou', {
    opacity: 1, x: 0, duration: 1,
    scrollTrigger: { trigger: '.sobre-habilidade', start: 'top 80%' }
  });

  gsap.to('.terminal-formacoes', {
    opacity: 1, x: 0, duration: 1,
    scrollTrigger: { trigger: '.sobre-habilidade', start: 'top 80%' }
  });

  gsap.to('.marquee-container', {
    opacity: 1, duration: 1,
    scrollTrigger: { trigger: '.marquee-container', start: 'top 90%' }
  });

  gsap.to('.git-stats', {
    opacity: 1, x: 0, duration: 1,
    scrollTrigger: { trigger: '.habilidades-card', start: 'top 80%' }
  });

  gsap.to('.img-skill', {
    opacity: 1, scale: 1, stagger: 0.04, duration: 0.5,
    scrollTrigger: { trigger: '.habilidades-card', start: 'top 75%' }
  });
}

/* ==================== GSAP + ScrollTrigger: scroll-spy do menu fixo ==================== */
function scrollSpy() {
  if (!temGsap || !window.ScrollTrigger) return;

  ['intro', 'sobre', 'Projetos', 'contato'].forEach(id => {
    const secao = document.getElementById(id);
    if (!secao) return;

    ScrollTrigger.create({
      trigger: secao,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => marcarLinkAtivo(id),
      onEnterBack: () => marcarLinkAtivo(id)
    });
  });
}

function marcarLinkAtivo(id) {
  document.querySelectorAll('.link-parado').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
}

/* ==================== Anime.js: micro-interação nos ícones de skill ==================== */
function wiggleSkills() {
  if (!temAnime) return;

  document.addEventListener('mouseover', (e) => {
    if (e.target.classList?.contains('img-skill')) {
      anime({
        targets: e.target,
        rotate: [{ value: -10 }, { value: 10 }, { value: 0 }],
        scale: [{ value: 1.25 }, { value: 1 }],
        duration: 450,
        easing: 'easeInOutSine'
      });
    }
  });
}

/* ==================== Linguagens do GitHub: barra de porcentagem por linguagem ====================
   Paleta categórica validada (dataviz skill) para o fundo escuro #1a1a19 do card:
   ΔE CVD adjacente 8.4 / normal-vision 19.3 — todas as checagens passam. */
const CORES_LINGUAGENS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const GITHUB_USUARIO = 'juhhsobrinho';
const GITHUB_CACHE_KEY = 'githubLangsCache';
const GITHUB_CACHE_TTL = 12 * 60 * 60 * 1000; // 12h — poupa a cota de requisições não-autenticadas da API

async function buscarLinguagensGitHub() {
  const cache = geTLocalStorage(GITHUB_CACHE_KEY);
  if (cache && Date.now() - cache.quando < GITHUB_CACHE_TTL) {
    return cache.linguagens;
  }

  const respRepos = await fetch(`https://api.github.com/users/${GITHUB_USUARIO}/repos?per_page=100&type=owner`);
  if (!respRepos.ok) throw new Error(`GitHub API respondeu ${respRepos.status}`);
  const repos = (await respRepos.json()).filter(r => !r.fork);

  // Busca em pequenos lotes — todas de uma vez dispara o rate-limit secundário da API do GitHub
  const TAMANHO_LOTE = 4;
  const listasDeLinguagens = [];
  for (let i = 0; i < repos.length; i += TAMANHO_LOTE) {
    const lote = repos.slice(i, i + TAMANHO_LOTE);
    const resultadosLote = await Promise.all(
      lote.map(repo => fetch(repo.languages_url).then(r => r.ok ? r.json() : {}).catch(() => ({})))
    );
    listasDeLinguagens.push(...resultadosLote);
  }

  const bytesPorLinguagem = {};
  listasDeLinguagens.forEach(linguagens => {
    Object.entries(linguagens).forEach(([nome, bytes]) => {
      bytesPorLinguagem[nome] = (bytesPorLinguagem[nome] || 0) + bytes;
    });
  });

  const total = Object.values(bytesPorLinguagem).reduce((soma, b) => soma + b, 0);
  if (!total) throw new Error('Nenhuma linguagem encontrada');

  const ranking = Object.entries(bytesPorLinguagem)
    .map(([nome, bytes]) => ({ nome, percentual: (bytes / total) * 100 }))
    .sort((a, b) => b.percentual - a.percentual);

  const principais = ranking.slice(0, 6);
  const resto = ranking.slice(6).reduce((soma, l) => soma + l.percentual, 0);
  const linguagens = resto > 0.5 ? [...principais, { nome: 'Outros', percentual: resto }] : principais;

  seTLocarStorage(GITHUB_CACHE_KEY, { quando: Date.now(), linguagens });
  return linguagens;
}

async function renderizarLinguagensGitHub() {
  const barra = document.getElementById('git-stats-bar');
  const legenda = document.getElementById('git-stats-legenda');
  if (!barra || !legenda) return;

  try {
    const linguagens = await buscarLinguagensGitHub();

    barra.innerHTML = linguagens.map((l, i) => `
      <div class="git-stats-segmento" style="flex-grow: ${l.percentual}; background-color: ${CORES_LINGUAGENS[i % CORES_LINGUAGENS.length]};" title="${l.nome}: ${l.percentual.toFixed(1)}%"></div>
    `).join('');

    legenda.innerHTML = linguagens.map((l, i) => `
      <li>
        <span class="git-stats-dot" style="background-color: ${CORES_LINGUAGENS[i % CORES_LINGUAGENS.length]};"></span>
        <span class="git-stats-linguagem">${l.nome}</span>
        <span class="git-stats-percentual">${l.percentual.toFixed(1)}%</span>
      </li>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar linguagens do GitHub:', error);
    barra.remove();
    legenda.outerHTML = '<p class="git-stats-status">Não foi possível carregar as estatísticas do GitHub agora.</p>';
  }
}

/* ==================== Ficha do projeto: card do repositório com dados reais do GitHub ==================== */
function extrairOwnerRepo(urlGitHub) {
  const partes = new URL(urlGitHub).pathname.split('/').filter(Boolean);
  return { owner: partes[0], repo: partes[1] };
}

async function buscarInfoRepo(owner, repo) {
  const chaveCache = `repoCache_${owner}_${repo}`;
  const cache = geTLocalStorage(chaveCache);
  if (cache && Date.now() - cache.quando < GITHUB_CACHE_TTL) {
    return cache.info;
  }

  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!resp.ok) throw new Error(`GitHub API respondeu ${resp.status}`);
  const dadosRepo = await resp.json();

  const info = {
    nomeCompleto: dadosRepo.full_name,
    descricao: dadosRepo.description || 'Sem descrição.',
    linguagem: dadosRepo.language || '—',
    estrelas: dadosRepo.stargazers_count,
    forks: dadosRepo.forks_count,
    url: dadosRepo.html_url
  };

  seTLocarStorage(chaveCache, { quando: Date.now(), info });
  return info;
}

async function renderizarInfoRepo(linkCod) {
  const card = document.getElementById('repo-card');
  if (!card) return;

  try {
    const { owner, repo } = extrairOwnerRepo(linkCod);
    const info = await buscarInfoRepo(owner, repo);

    card.querySelector('.terminal-corpo, .terminal-status')?.remove();
    card.insertAdjacentHTML('beforeend', `
      <div class="terminal-corpo">
        <p class="terminal-linha terminal-comando">git remote show origin</p>
        <p class="terminal-linha"><span class="terminal-prompt">&gt;</span> ${info.nomeCompleto}</p>
        <p class="terminal-linha">${info.descricao}</p>
        <p class="terminal-linha terminal-cursor"><span class="terminal-prompt">&gt;</span> ★ ${info.estrelas}  ⑂ ${info.forks}  ● ${info.linguagem}</p>
      </div>
    `);
  } catch (error) {
    console.error('Erro ao carregar dados do repositório:', error);
    card.querySelector('.terminal-corpo, .terminal-status')?.remove();
    card.insertAdjacentHTML('beforeend', '<p class="terminal-status">Não foi possível carregar os dados do repositório agora.</p>');
  }
}

/* ==================== GSAP: timeline de entrada da ficha do projeto ==================== */
function animarFicha() {
  if (!temGsap) return;

  gsap.set('.nome-project', { opacity: 0, y: -20 });
  gsap.set('.img-project', { opacity: 0, scale: 1.08 });
  gsap.set('.terminal-ficha', { opacity: 0, y: 30 });
  gsap.set('.sobre-project-card', { opacity: 0, y: 30 });

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to('.nome-project', { opacity: 1, y: 0, duration: 0.6 })
    .to('.img-project', { opacity: 1, scale: 1, duration: 0.8 }, '-=0.3')
    .to('.terminal-ficha', { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, '-=0.3')
    .to('.sobre-project-card', { opacity: 1, y: 0, duration: 0.6 }, '-=0.2');
}

/* ==================== Motion (motion.dev): entrada dos cards do showcase ==================== */
function animarCards() {
  if (!guias) return;
  const cards = guias.querySelectorAll('.showcase-card');
  if (!cards.length) return;

  animate(cards, { opacity: [0, 1], y: [30, 0] }, { delay: stagger(0.06), duration: 0.5 });
}

/* ==================== Showcase de projetos: carrossel com loop infinito ==================== */
function configurarShowcase(bd) {
  if (!guias || !bd.length) return;

  const N = bd.length;
  const arrowPrev = document.querySelector('.showcase-prev');
  const arrowNext = document.querySelector('.showcase-next');

  let activeIndex = 0;
  let isAnimating = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let isDragging = false;

  function wrap(i) {
    return ((i % N) + N) % N;
  }

  function passoAtual() {
    const cartoes = guias.querySelectorAll('.showcase-card');
    if (cartoes.length < 2) return 0;
    return cartoes[1].offsetLeft - cartoes[0].offsetLeft;
  }

  function statusClasse(status) {
    return status === 'Desenvolvido' ? 'status-pronto' : 'status-andamento';
  }

  function cardHTML(projeto, offset) {
    const estado = offset === 0 ? 'is-active' : 'is-adjacent';
    return `
      <a class="showcase-card ${estado}" data-project-id="${projeto.id}" data-offset="${offset}">
        <div class="showcase-card-img" style="background-image: url('${projeto.img}');"></div>
        <div class="showcase-card-overlay">
          <span class="showcase-status ${statusClasse(projeto.status)}">${projeto.status}</span>
          <h3 class="showcase-card-title">${projeto.nome}</h3>
        </div>
      </a>`;
  }

  function render() {
    let html = '';
    for (let offset = -1; offset <= 1; offset++) {
      html += cardHTML(bd[wrap(activeIndex + offset)], offset);
    }
    guias.innerHTML = html;
    if (temGsap) gsap.set(guias, { x: 0 });
    animarCards();
  }

  function mover(passos) {
    if (isAnimating || N <= 1) return;
    isAnimating = true;
    const largura = passoAtual();

    if (!temGsap) {
      activeIndex = wrap(activeIndex + passos);
      render();
      isAnimating = false;
      return;
    }

    gsap.to(guias, {
      x: -passos * largura,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        activeIndex = wrap(activeIndex + passos);
        render();
        isAnimating = false;
      }
    });
  }

  arrowNext?.addEventListener('click', () => mover(1));
  arrowPrev?.addEventListener('click', () => mover(-1));

  // Setas do teclado só reagem quando o carrossel está na tela e o usuário não está digitando
  const secaoProjetos = document.getElementById('Projetos');
  let showcaseNaTela = false;
  if (secaoProjetos && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      showcaseNaTela = entries[0].isIntersecting;
    }, { threshold: 0.3 }).observe(secaoProjetos);
  }

  document.addEventListener('keydown', (e) => {
    if (!showcaseNaTela) return;
    const alvo = document.activeElement;
    if (alvo && ['INPUT', 'TEXTAREA'].includes(alvo.tagName)) return;

    if (e.key === 'ArrowRight') mover(1);
    if (e.key === 'ArrowLeft') mover(-1);
  });

  // Clique: card ativo navega pro projeto, card vizinho só traz ele pro centro
  guias.addEventListener('click', (e) => {
    if (Math.abs(dragDeltaX) > 5) return; // foi um arraste, não um clique

    // setPointerCapture (usado no arraste) redireciona e.target pro próprio <nav>,
    // então descobrimos o card real por baixo do cursor via coordenadas
    const elementoReal = document.elementFromPoint(e.clientX, e.clientY);
    const card = elementoReal?.closest('.showcase-card');
    if (!card) return;

    const offset = Number(card.dataset.offset);
    if (offset === 0) {
      seTLocarStorage("AtualGuia", card.dataset.projectId);
      window.location.href = './projeto.html';
    } else {
      mover(offset);
    }
  });

  // Arrastar (mouse/touch/caneta) pra navegar
  guias.addEventListener('pointerdown', (e) => {
    if (isAnimating) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    guias.setPointerCapture(e.pointerId);
    if (temGsap) gsap.killTweensOf(guias);
  });

  guias.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    dragDeltaX = e.clientX - dragStartX;
    if (temGsap) gsap.set(guias, { x: dragDeltaX });
  });

  guias.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;

    const limiar = 60;
    if (dragDeltaX <= -limiar) {
      mover(1);
    } else if (dragDeltaX >= limiar) {
      mover(-1);
    } else if (temGsap) {
      gsap.to(guias, { x: 0, duration: 0.3, ease: 'power2.out' });
    }
  });

  render();
}

carregarBancoDeDados()
  .then(bd => {
    function saturacion(status) {
      return status === "Desenvolvido" ? "filter: saturate(1);" : "filter: saturate(0);";
    }

    function dados() {
      const guiaAtual = bd[geTLocalStorage("AtualGuia")];

      sectionImgFicha = `            
        <section class="sobre-project-img">
          <a class="projeto-container" style="${saturacion(guiaAtual.status)}">
            <h1 class="nome-project">${guiaAtual.nome}</h1>
            <img class="img-project" id="img-project" src="${guiaAtual.img}" alt="foto-do-projeto-${guiaAtual.nome}">
          </a>
        </section>

        <div class="line-project"></div>
        <div class="ficha-git">
          <div class="terminal-janela terminal-ficha">
            <div class="terminal-barra">
              <span class="terminal-bolinha bolinha-vermelha"></span>
              <span class="terminal-bolinha bolinha-amarela"></span>
              <span class="terminal-bolinha bolinha-verde"></span>
              <span class="terminal-titulo">~/${guiaAtual.nome}.sh</span>
            </div>
            <div class="terminal-corpo">
              <p class="terminal-linha terminal-comando">status --info</p>
              <p class="terminal-linha"><span class="terminal-prompt">&gt;</span> Status: ${guiaAtual.status}</p>
              <p class="terminal-linha"><span class="terminal-prompt">&gt;</span> Responsivo: ${guiaAtual.responsivo}</p>
              <p class="terminal-linha">${guiaAtual.descricao}</p>
              <p class="terminal-linha terminal-cursor"><span class="terminal-prompt">&gt;</span> <a class="terminal-link" href="${guiaAtual.linkProj}" target="_blank">Ver Projeto → ${guiaAtual.linkProjFake}</a></p>
            </div>
          </div>

          <div class="terminal-janela terminal-ficha" id="repo-card">
            <div class="terminal-barra">
              <span class="terminal-bolinha bolinha-vermelha"></span>
              <span class="terminal-bolinha bolinha-amarela"></span>
              <span class="terminal-bolinha bolinha-verde"></span>
              <span class="terminal-titulo">git · repositório</span>
            </div>
            <p class="terminal-status">Carregando dados do repositório...</p>
          </div>

          <div class="sobre-project-card">
            <h1 class="sobre-project-titulo"><i class="fa-solid fa-circle-info"></i> Sobre o Projeto</h1>
            <p class="sobre-project-dados">${guiaAtual.sobre}</p>
          </div>
        </div>

        <div class="line-project"></div>`;

      imgFicha.innerHTML = sectionImgFicha;
      animarFicha();
      renderizarInfoRepo(guiaAtual.linkCod);
    }

    if (path === "/view/projeto.html" || path === "/Portfolio/view/projeto.html") {
      particulas();
      dados();
    } else {
      title();
      animarHero();
      parallaxImagem();
      scrollReveals();
      scrollSpy();
      wiggleSkills();
      renderizarLinguagensGitHub();
    }

    configurarShowcase(bd);
  })
  .catch(error => {
    console.error('Erro ao carregar o banco de dados:', error);
  });

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const btnEnviar = document.getElementById("btnEnviar");

  if (btnEnviar && temAnime) {
    btnEnviar.addEventListener("click", () => {
      anime({
        targets: "#btnEnviar",
        scale: [{ value: 0.9 }, { value: 1 }],
        duration: 300,
        easing: "easeOutElastic(1, .6)"
      });
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(this);

      fetch("https://formsubmit.co/juliano.sobrinhojunior@gmail.com", {
        method: "POST",
        body: formData
      })
        .then(response => {
          Toastify({
            text: response.ok ? "Mensagem enviada com sucesso!" : "Erro ao enviar mensagem!",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: response.ok ? "#1B272D" : "#f44336" },
            close: true
          }).showToast();

          if (response.ok) form.reset();
        })
        .catch(error => {
          Toastify({
            text: "Erro ao enviar: " + error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#f44336" },
            close: true
          }).showToast();
        });
    });
  }
});

function title() {
  const helloWorld = document.getElementById('helloWorld');
  const texto1 = 'Bem Vindo';
  const texto2 = 'Hello World';
  let currentText = '';
  let index = 0;
  let isDeleting = false;
  let textoAlvo = texto1;

  function type() {
    if (!isDeleting && index < textoAlvo.length) {
      currentText += textoAlvo[index++];
    } else if (isDeleting && index > 0) {
      currentText = currentText.slice(0, -1);
      index--;
    } else {
      isDeleting = !isDeleting;
      textoAlvo = isDeleting ? texto2 : texto1;
      setTimeout(type, 1000);
      return;
    }

    if (helloWorld) helloWorld.innerHTML = currentText;
    setTimeout(type, 150);
  }

  type();
}


particulas();