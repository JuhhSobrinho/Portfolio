import { carregarBancoDeDados } from '../model/model.js';
import { seTLocarStorage, geTLocalStorage } from "../model/model.js";

const guias = document.getElementById('guias');

const imgFicha = document.getElementById('img-ficha');
const path = window.location.pathname;

console.log(path);

let textGuiaHTML = '';

let sectionImgFicha = '';

carregarBancoDeDados()
    .then(bd => {
        // Agora você pode acessar os bd do JSO


        function saturacion(status) {

            let styleSatu = '';
            if (status === "Desenvolvido") {
                styleSatu = "filter: saturate(1);"
            } else {
                styleSatu = "filter: saturate(0);"
            }

            return styleSatu;
        }




        function dados() {
            sectionImgFicha = `            
            <section class="sobre-project-img">
                <a class="projeto-container" style="${saturacion(bd[geTLocalStorage("AtualGuia")].status)}">
                    <h1 class="nome-project">${bd[geTLocalStorage("AtualGuia")].nome}</h1>
                    <img  class="img-project" id="img-project" src="${bd[geTLocalStorage("AtualGuia")].img}" alt="foto-do-projeto-${bd[geTLocalStorage("AtualGuia")].nome}">
                </a>
                <h1 class="sobre-project-titulo">Sobre o Projeto</h1>
                <p class="sobre-project-dados">
                    ${bd[geTLocalStorage("AtualGuia")].sobre}
                </p>
            </section>

            <div class="line-project"></div>
            <div class="ficha-git">
            <div class="ficha-card">
                <h1 class="status">
                    Status: ${bd[geTLocalStorage("AtualGuia")].status}
                </h1>
                <p class="descricao-link">
                    ${bd[geTLocalStorage("AtualGuia")].descricao}
                </p>
                <div class="line-splash"></div>
                <span class="ficha-spans" id="responsividade">Responsivo: ${bd[geTLocalStorage("AtualGuia")].responsivo}</span>
                <a href="${bd[geTLocalStorage("AtualGuia")].linkProj}">
                    <span class="ficha-spans" id="projectLink">Project:  ${bd[geTLocalStorage("AtualGuia")].linkProjFake}</span>
                </a>
            </div>
            <a  href="${bd[geTLocalStorage("AtualGuia")].linkCod}">
            <img class="git-readme" src="https://github-readme-stats.vercel.app/api/pin/?username=JuhhSobrinho&repo=${bd[geTLocalStorage("AtualGuia")].nome}&theme=noctis_minimus" alt="Readme Card">
          </a>
            </div>
            <div class="line-project"></div>`;
            imgFicha.innerHTML = sectionImgFicha;
        }

        if (path === "/view/projeto.html" || path === "/Portfolio/view/projeto.html") {
            dados();
        } else {
            main();
        }





        bd.forEach(element => {
            console.log(element);

            textGuiaHTML += `
        <div class="line" id="line-menu"></div>
        <a class="guia" id="${element.id}">
            <img id="${element.nome}" class="icon-guias" src="${element.icon}" style="${saturacion(element.status)}" alt="guia-${element.nome}" />
        </a>`;

        });
        guias.innerHTML = textGuiaHTML;





        const links = guias.querySelectorAll('a.guia');

        links.forEach(link => {
            link.addEventListener('click', function () {
                seTLocarStorage("AtualGuia", link.id);
                console.log(geTLocalStorage("AtualGuia"));

                window.location.href = './projeto.html'; // Tempo de espera em milissegundos (pode ajustar conforme necessário)

            });
        });




    })
    .catch(error => {
        // Trata erros que podem ocorrer durante o carregamento
        console.error('Erro ao carregar o banco de bd:', error);
    });
console.log(geTLocalStorage("AtualGuia"));




document.addEventListener("DOMContentLoaded", function () { // Garantir que o DOM esteja carregado
    document.getElementById("contact-form").addEventListener("submit", function (event) {
        event.preventDefault(); // Evita o reload da página

        const formData = new FormData(this);

        fetch("https://formsubmit.co/juliano.sobrinhojunior@gmail.com", { // Substitua pelo seu e-mail
            method: "POST",
            body: formData
        })
        .then(response => {
            if (response.ok) {
                alert("Mensagem enviada com sucesso!");
                document.getElementById("contact-form").reset(); // Limpa o formulário
            } else {
                alert("Erro ao enviar mensagem!");
            }
        })
        .catch(error => {
            alert("Erro ao enviar mensagem: " + error);
        });
    });
});






function main() {
    var helloWorld = document.getElementById('helloWorld');
    let olamundo = 'Hello World';
    let test = 'Bem Vindo';

    let textArray = helloWorld.textContent.split('');

    function trocarLetras(index, textoAlvo) {
        setTimeout(function () {
            textArray[index] = textoAlvo[index];
            helloWorld.innerHTML = textArray.join('');

            if (index < textArray.length - 1) {
                trocarLetras(index + 1, textoAlvo);
            } else {
                // Após formar a palavra alvo, aguarde por um segundo antes de trocar para 'Hello World'
                setTimeout(function () {
                    trocarLetras(0, olamundo);
                }, 200);
            }
        }, 120); // Ajuste o tempo conforme necessário
    }

    trocarLetras(0, test);

}
