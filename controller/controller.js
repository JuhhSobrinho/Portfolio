import { carregarBancoDeDados, seTLocarStorage, geTLocalStorage } from '../model/model.js';

const guias = document.getElementById('guias');
const imgFicha = document.getElementById('img-ficha');
const path = window.location.pathname;

console.log(path);
let textGuiaHTML = '';
let sectionImgFicha = '';

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
          <div class="ficha-card">
            <h1 class="status">Status: ${guiaAtual.status}</h1>
            <p class="descricao-link">${guiaAtual.descricao}</p>
            <div class="line-splash"></div>
            <span class="ficha-spans" id="responsividade">Responsivo: ${guiaAtual.responsivo}</span>
            <a href="${guiaAtual.linkProj}">
              <span class="ficha-spans" id="projectLink">Ver Projeto: ${guiaAtual.linkProjFake}</span>
            </a>
          </div>

          <p>Repositório GitHub</p>
          <a href="${guiaAtual.linkCod}">
            <img class="git-readme" src="https://github-readme-stats.vercel.app/api/pin/?username=JuhhSobrinho&repo=${guiaAtual.nome}&theme=gotham" alt="Readme Card">
          </a>

          <h1 class="sobre-project-titulo">Sobre o Projeto</h1>
          <p class="sobre-project-dados">${guiaAtual.sobre}</p>
        </div>

        <div class="line-project"></div>`;

      imgFicha.innerHTML = sectionImgFicha;
    }

    if (path === "/view/projeto.html" || path === "/Portfolio/view/projeto.html") {
      particulas();
      dados();
    } else {
      title();
    }

    bd.slice().reverse().forEach(element => {
      textGuiaHTML += `
        <a class="guia" id="${element.id}">
          <img id="${element.nome}" class="icon-guias" src="${element.icon}" style="${saturacion(element.status)}" alt="guia-${element.nome}" />
          <img loading="lazy" id="img-manu${element.nome}" class="img-projects" src="${element.img}" />
          <p class="habilidades-dados">${element.nome}</p>
        </a>`;
    });

    guias.innerHTML = textGuiaHTML;

    const links = guias.querySelectorAll('a.guia');

    links.forEach(link => {
      link.addEventListener('click', () => {
        seTLocarStorage("AtualGuia", link.id);
        console.log(geTLocalStorage("AtualGuia"));
        window.location.href = './projeto.html';
      });
    });
  })
  .catch(error => {
    console.error('Erro ao carregar o banco de dados:', error);
  });

console.log(geTLocalStorage("AtualGuia"));

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
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
            backgroundColor: response.ok ? "#1B272D" : "#f44336",
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
            backgroundColor: "#f44336",
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


const checkLogo = setInterval(() => {
  const host = document.querySelector('spline-viewer');
  const shadowRoot = host?.shadowRoot;
  const logo = shadowRoot?.querySelector('a#logo');
  
  if (logo) {
    logo.style.display = 'none';
    clearInterval(checkLogo); // para de checar
  }
}, 1); // checa a cada 100ms
