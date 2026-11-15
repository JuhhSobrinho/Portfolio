import { carregarBancoDeDados, seTLocarStorage, geTLocalStorage } from '../model/model.js';

/* ==================== Projetos: vitrine gerada a partir do GitHub ====================
   Busca os repositórios de juhhsobrinho (sem forks) e monta os cards.
   Para ficar rápido:
     - a lista aparece assim que os repositórios chegam (sem esperar READMEs);
     - o README só é buscado quando o modal abre ou quando a capa precisa dele;
     - as capas carregam em fila (3 por vez) e só quando o card entra na tela;
     - model/bd.json é lido junto com os repositórios.
   Capa, em ordem de prioridade:
     1. screenshot da demo (serviço Microlink)
     2. og:image da demo (mesma chamada)
     3. primeira imagem do README
     4. placeholder ASCII
   model/bd.json só complementa: demo, descrição e status quando o repo está cadastrado lá. */

const USUARIO = 'juhhsobrinho';
const CACHE_REPOS = 'githubReposCache';
// Quando o formato dos dados muda, aumente a versão: o cache antigo é ignorado sozinho
const VERSAO_CACHE = 6;
const CACHE_README = 'readmesCache';
const CACHE_CAPAS = 'capasDemoCache';
const CACHE_COMMITS = 'commitsCache';
const TTL_COMMITS = 24 * 60 * 60 * 1000;
const TTL_REPOS = 60 * 60 * 1000; // 1h: depois disso, atualiza em segundo plano
const TTL_CAPAS = 7 * 24 * 60 * 60 * 1000;
const TTL_README = 7 * 24 * 60 * 60 * 1000;
const LIMITE_CAPAS = 3; // quantas capas carregam ao mesmo tempo

const gridDestaque = document.getElementById('projetos-destaque');
const gridRecentes = document.getElementById('projetos-grid');
const secaoDestaque = document.getElementById('secao-destaque');
const divisor = document.getElementById('projetos-divisor');
const statusEl = document.getElementById('projetos-status');
const modal = document.getElementById('projeto-modal');

const COMPARADORES = {
  estrelas: (a, b) => b.estrelas - a.estrelas || a.nome.localeCompare(b.nome),
  recentes: (a, b) => new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0),
};

let todos = [];
let avisoFixo = false;

// Fila de capas: carrega só as visíveis, com limite de concorrência
const pendentesCapa = new Map(); // card -> projeto
const filaCapas = [];
let capasAtivas = 0;
const observadorCapas = 'IntersectionObserver' in window
  ? new IntersectionObserver(entradas => {
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;
        const p = pendentesCapa.get(entrada.target);
        if (!p) return;
        observadorCapas.unobserve(entrada.target);
        pendentesCapa.delete(entrada.target);
        enfileirarCapa(entrada.target, p);
      });
    }, { rootMargin: '200px' })
  : null;

function iniciarProjetos() {
  iniciarModal();

  // Com cache, mostra na hora e atualiza em segundo plano se estiver expirado
  const salvo = lerCacheRepos();
  if (salvo) {
    aplicarDados(salvo.dados);
    if (!salvo.expirado) return;
  } else {
    mostrarStatus('Carregando projetos do GitHub...');
  }

  buscarProjetos()
    .then(novos => {
      if (!salvo || JSON.stringify(novos) !== JSON.stringify(salvo.dados)) aplicarDados(novos);
    })
    .catch(async erro => {
      console.error('Projetos: falha ao atualizar.', erro);
      avisoFixo = true;
      if (erro && erro.limite) {
        mostrarRadar(erro.reset);
      } else {
        mostrarStatus('GitHub indisponível agora. Mostrando os projetos cadastrados.');
      }
      if (salvo) return; // mantém o que já está na tela
      aplicarDados(await dadosDeFallback());
    });
}

/* ---------- radar do submarino: aviso quando a cota da API do GitHub acaba ---------- */
let timerRadar = null;

function mostrarRadar(resetMs) {
  const radar = document.getElementById('projetos-radar');
  if (!radar) return;
  if (statusEl) statusEl.hidden = true;

  const varredura = el('div', 'radar-varredura');
  const tela = el('div', 'radar-tela');
  // Pontos fixos que piscam, como contatos no radar
  [[28, 34], [62, 22], [70, 66], [40, 72]].forEach(([x, y], i) => {
    const ponto = el('span', 'radar-ponto');
    ponto.style.left = x + '%';
    ponto.style.top = y + '%';
    ponto.style.animationDelay = (i * 0.7) + 's';
    tela.append(ponto);
  });
  tela.prepend(varredura);

  const texto = el('div', 'radar-texto');
  const contagem = el('p', 'radar-contagem');
  texto.append(
    el('h4', '', '⚓ Radar sem sinal'),
    el('p', '', 'O submarino perdeu contato com o GitHub: a cota de requisições da API foi esgotada.'),
    el('p', '', 'Por enquanto, mostrando os projetos cadastrados localmente.'),
    contagem
  );

  radar.replaceChildren(tela, texto);
  radar.hidden = false;

  const atualizarContagem = () => {
    const minutos = Math.ceil((resetMs - Date.now()) / 60000);
    if (minutos > 0) {
      contagem.textContent = `Próximo contato em cerca de ${minutos} min.`;
    } else {
      contagem.textContent = 'Contato restabelecido: recarregue a página para atualizar.';
      clearInterval(timerRadar);
    }
  };
  atualizarContagem();
  clearInterval(timerRadar);
  timerRadar = setInterval(atualizarContagem, 30000);
}

function aplicarDados(dados) {
  todos = dados;
  renderizar();
}

/* ---------- utilidades de cache e DOM ---------- */
function lerCache(chave, ttl) {
  try {
    const cache = geTLocalStorage(chave);
    if (cache && Date.now() - cache.quando < ttl) return cache.dados;
  } catch (e) { /* localStorage indisponível */ }
  return null;
}

// Lê a lista de projetos: retorna mesmo expirada (para mostrar na hora), desde que a versão bata
function lerCacheRepos() {
  try {
    const c = geTLocalStorage(CACHE_REPOS);
    if (c && c.versao === VERSAO_CACHE && Array.isArray(c.dados)) {
      return { dados: c.dados, expirado: Date.now() - c.quando >= TTL_REPOS };
    }
  } catch (e) { /* localStorage indisponível */ }
  return null;
}

function gravarCache(chave, dados) {
  try {
    seTLocarStorage(chave, { quando: Date.now(), versao: VERSAO_CACHE, dados });
  } catch (e) { /* localStorage indisponível */ }
}

// Mapas de cache (uma chave por item, cada um com a sua data)
function lerMapa(chave) {
  try {
    return geTLocalStorage(chave) || {};
  } catch (e) {
    return {};
  }
}

function gravarMapa(chave, mapa) {
  try {
    seTLocarStorage(chave, mapa);
  } catch (e) { /* localStorage indisponível */ }
}

function mostrarStatus(texto) {
  if (statusEl) {
    statusEl.textContent = texto;
    statusEl.hidden = false;
  }
}

function el(tag, classe, texto) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

function link(texto, url, classe = 'projeto-link') {
  const a = el('a', classe, texto);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

/* ---------- README: primeira imagem, funcionalidades e parágrafos (sob demanda) ---------- */
const IMAGEM_IGNORADA = /badge|shields\.io|travis|actions\/workflows|codecov|img\.shields/i;

function decodificarBase64(conteudo) {
  const bytes = Uint8Array.from(atob(conteudo.replace(/\s/g, '')), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function interpretarReadme(texto, owner, repo) {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;
  const srcs = [
    ...[...texto.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)].map(m => m[1]),
    ...[...texto.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]),
  ];
  const src = srcs.find(s => !IMAGEM_IGNORADA.test(s));
  const imagem = src
    ? (/^https?:\/\//.test(src) ? src : base + src.replace(/^\.?\//, ''))
    : '';

  // Funcionalidades: itens de lista logo abaixo de um título "Funcionalidades" / "Features"
  const linhas = texto.split('\n');
  const funcionalidades = [];
  let emSecao = false;
  for (const linha of linhas) {
    if (/^#{1,6}\s/.test(linha)) {
      emSecao = /funcionalidades|features|recursos/i.test(linha);
      continue;
    }
    if (emSecao && /^\s*[-*]\s+/.test(linha)) {
      funcionalidades.push(linha.replace(/^\s*[-*]\s+/, '').replace(/[*_`]/g, '').trim());
    }
  }

  // Parágrafos de texto corrido, sem títulos, imagens, badges, tabelas, código ou listas
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b && !/^(#|!|<|\||```|[-*]\s|\[!\[)/.test(b))
    .map(b => b
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)
    .slice(0, 3);

  return { imagem, funcionalidades: funcionalidades.slice(0, 6), paragrafos };
}

// 404 = o repositório não tem README (vale guardar no cache). Outros erros lançam exceção.
async function buscarReadme(owner, repo) {
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`README: GitHub respondeu ${resp.status}`);
  const json = await resp.json();
  return interpretarReadme(decodificarBase64(json.content), owner, repo);
}

// Busca o README uma vez por projeto, com cache de 7 dias. Erros não são guardados.
function obterReadme(p) {
  if (!p._readme) {
    p._readme = carregarReadme(p);
  }
  return p._readme;
}

async function carregarReadme(p) {
  const chave = `${p.owner}/${p.nome}`;
  const mapa = lerMapa(CACHE_README);
  const entrada = mapa[chave];
  if (entrada && Date.now() - entrada.quando < TTL_README) return entrada.dados;

  try {
    const dados = await buscarReadme(p.owner, p.nome);
    mapa[chave] = { quando: Date.now(), dados };
    gravarMapa(CACHE_README, mapa);
    return dados;
  } catch (e) {
    p._readme = null; // tenta de novo na próxima vez
    return null;
  }
}

/* ---------- dados do GitHub ---------- */
function repoParaProjeto(repo, cadastrados) {
  const linkRepo = repo.html_url.toLowerCase();
  const manual = cadastrados.find(p => p.linkCod && p.linkCod.toLowerCase() === linkRepo);
  const demoManual = manual && manual.linkProj && !manual.linkProj.startsWith('#') ? manual.linkProj : '';

  return {
    nome: repo.name,
    owner: repo.owner.login,
    descricao: (manual && manual.descricao) || repo.description || 'Sem descrição.',
    sobre: (manual && manual.sobre) || '',
    linguagem: repo.language || '',
    tecnologias: repo.topics || [],
    estrelas: repo.stargazers_count || 0,
    atualizadoEm: repo.pushed_at || repo.updated_at,
    github: repo.html_url,
    demo: demoManual || repo.homepage || '',
    status: manual ? manual.status : '',
    destaque: !!(manual && manual.destaque),
    arquivado: repo.archived,
    issues: repo.open_issues_count || 0,
  };
}

async function buscarProjetos() {
  // Repositórios e bd.json em paralelo
  const [resp, cadastrados] = await Promise.all([
    fetch(`https://api.github.com/users/${USUARIO}/repos?per_page=100&type=owner&sort=pushed`),
    carregarBancoDeDados().then(d => d || []),
  ]);

  if (!resp.ok) {
    // 403/429 com limite zerado = cota de requisições esgotada (o radar mostra isso)
    if (resp.status === 403 || resp.status === 429) {
      const reset = Number(resp.headers.get('x-ratelimit-reset')) * 1000;
      throw { limite: true, reset: reset || Date.now() + 60 * 60 * 1000 };
    }
    throw new Error(`GitHub API respondeu ${resp.status}`);
  }

  const repos = (await resp.json()).filter(r => !r.fork);
  const dados = repos.map(r => repoParaProjeto(r, cadastrados));
  gravarCache(CACHE_REPOS, dados);
  return dados;
}

async function dadosDeFallback() {
  const cadastrados = (await carregarBancoDeDados()) || [];
  return cadastrados.map(p => ({
    nome: p.nome,
    owner: USUARIO,
    descricao: p.descricao,
    sobre: p.sobre || '',
    linguagem: '',
    tecnologias: [],
    estrelas: 0,
    atualizadoEm: null,
    github: p.linkCod,
    demo: p.linkProj && !p.linkProj.startsWith('#') ? p.linkProj : '',
    status: p.status,
    destaque: !!p.destaque,
  }));
}

/* ---------- status resumido do projeto ---------- */
function statusDoProjeto(p) {
  if (p.arquivado) return { texto: 'Arquivado no GitHub', tom: 'parado' };

  if (p.status) {
    const s = p.status.toLowerCase();
    if (s.includes('descontinuad')) return { texto: p.status, tom: 'parado' };
    if (s.includes('desenvolvimento')) return { texto: p.status, tom: 'andamento' };
    return { texto: p.status, tom: 'ativo' };
  }

  const dias = p.atualizadoEm ? (Date.now() - new Date(p.atualizadoEm).getTime()) / 86400000 : Infinity;
  if (dias < 90) return { texto: 'Em atividade', tom: 'ativo' };
  if (dias < 365) return { texto: 'Atualizado no último ano', tom: 'andamento' };
  return { texto: 'Parado há mais de um ano', tom: 'parado' };
}

/* ---------- total de commits (carregado só ao abrir o modal) ---------- */
async function buscarTotalCommits(owner, repo) {
  const cache = lerCache(CACHE_COMMITS, TTL_COMMITS) || {};
  const chave = `${owner}/${repo}`;
  if (cache[chave] !== undefined) return cache[chave];

  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
    let total;
    if (resp.status === 409) {
      total = 0; // repositório vazio, sem commits
    } else if (!resp.ok) {
      return null;
    } else {
      // Com per_page=1, o número da última página do Link é o total de commits
      const link = resp.headers.get('Link');
      const ultima = link && link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      total = ultima ? Number(ultima[1]) : (await resp.json()).length;
    }
    cache[chave] = total;
    gravarCache(CACHE_COMMITS, cache);
    return total;
  } catch (e) {
    return null;
  }
}

/* ---------- capa: screenshot / og:image da demo ---------- */
async function capaDaDemo(demo) {
  const capas = lerCache(CACHE_CAPAS, TTL_CAPAS) || {};
  if (capas[demo] !== undefined) return capas[demo];

  try {
    const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(demo)}&screenshot=true&meta=false`);
    if (!resp.ok) return '';
    const json = await resp.json();
    const imagem = json?.data?.screenshot?.url || json?.data?.image?.url || '';
    capas[demo] = imagem;
    gravarCache(CACHE_CAPAS, capas);
    return imagem;
  } catch (e) {
    return '';
  }
}

async function capaDoProjeto(p) {
  if (p.demo) {
    const imagem = await capaDaDemo(p.demo);
    if (imagem) return imagem;
  }
  // Sem demo (ou sem screenshot), usa a primeira imagem do README
  const readme = await obterReadme(p);
  return readme?.imagem || '';
}

function criarCapa(p) {
  const capa = el('div', 'projeto-capa sem-imagem');
  const terminal = el('div', 'projeto-capa-terminal');
  terminal.append(
    el('p', '', `$ open ${p.nome}`),
    el('p', 'projeto-capa-erro', 'screenshot indisponível'),
    el('p', '', '$')
  );
  capa.append(terminal);
  return capa;
}

function aplicarImagem(capa, src) {
  if (!capa) return;
  const img = new Image();
  img.alt = '';
  img.loading = 'lazy';
  img.onload = () => {
    capa.replaceChildren(img);
    capa.classList.remove('sem-imagem');
  };
  img.src = src;
}

// Enfileira a capa de um card; a fila roda no máximo LIMITE_CAPAS por vez
function enfileirarCapa(card, p) {
  filaCapas.push({ card, p });
  processarFilaCapas();
}

function processarFilaCapas() {
  while (capasAtivas < LIMITE_CAPAS && filaCapas.length) {
    const { card, p } = filaCapas.shift();
    capasAtivas++;
    capaDoProjeto(p)
      .then(src => {
        if (src && card) aplicarImagem(card.querySelector('.projeto-capa'), src);
      })
      .catch(() => { /* sem capa: fica o placeholder */ })
      .finally(() => {
        capasAtivas--;
        processarFilaCapas();
      });
  }
}

// Capa só quando o card aparece na tela (ou já, se o navegador não suportar o observador)
function agendarCapa(card, p) {
  if (!observadorCapas) {
    enfileirarCapa(card, p);
    return;
  }
  pendentesCapa.set(card, p);
  observadorCapas.observe(card);
}

/* ---------- cards ---------- */
function criarCard(p) {
  const card = el('article', 'projeto-card');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Ver detalhes de ${p.nome}`);

  const capa = criarCapa(p);
  capa.dataset.nome = p.nome;

  const corpo = el('div', 'projeto-card-corpo');

  const topo = el('div', 'projeto-card-topo');
  topo.append(el('span', 'projeto-linguagem', p.linguagem || 'Sem linguagem'));
  if (p.status) topo.append(el('span', 'projeto-status', p.status));

  const meta = el('div', 'projeto-meta');
  meta.append(
    el('span', '', `★ ${p.estrelas}`),
    el('span', '', p.atualizadoEm
      ? `Atualizado ${new Date(p.atualizadoEm).toLocaleDateString('pt-BR')}`
      : 'Data indisponível')
  );

  const botao = el('button', 'projeto-ver', 'Ver projeto');
  botao.type = 'button';

  const links = el('div', 'projeto-links');
  links.append(link('GitHub', p.github));
  if (p.demo) links.append(link('Demo', p.demo));

  corpo.append(topo, el('h3', 'projeto-nome', p.nome), el('p', 'projeto-descricao', p.descricao), meta, botao, links);
  card.append(capa, corpo);

  // O card inteiro abre o modal; links externos e teclado também
  card.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    abrirModal(p);
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirModal(p);
    }
  });

  return card;
}

/* Em destaque: os marcados com "destaque": true no model/bd.json;
   sem nenhum marcado, os três com mais estrelas.
   Mais recentes: todos os demais, do mais atualizado para o menos. */
function renderizar() {
  const marcados = todos.filter(p => p.destaque);
  const emDestaque = marcados.length
    ? marcados
    : [...todos].sort(COMPARADORES.estrelas).slice(0, 3);
  const nomesDestaque = new Set(emDestaque.map(p => p.nome));
  const recentes = todos
    .filter(p => !nomesDestaque.has(p.nome))
    .sort(COMPARADORES.recentes);

  const cardsDestaque = emDestaque.map(criarCard);
  const cardsRecentes = recentes.map(criarCard);
  gridDestaque.replaceChildren(...cardsDestaque);
  gridRecentes.replaceChildren(...cardsRecentes);

  const temDestaque = emDestaque.length > 0;
  secaoDestaque.hidden = !temDestaque;
  divisor.hidden = !temDestaque || recentes.length === 0;

  // Capas são agendadas: só carregam quando o card aparece na tela
  emDestaque.forEach((p, i) => agendarCapa(cardsDestaque[i], p));
  recentes.forEach((p, i) => agendarCapa(cardsRecentes[i], p));

  if (!todos.length) {
    mostrarStatus('Nenhum projeto encontrado.');
  } else if (statusEl && !avisoFixo) {
    statusEl.hidden = true;
  }
}

/* ---------- modal ---------- */
function iniciarModal() {
  if (!modal) return;

  modal.querySelector('#modal-fechar').addEventListener('click', () => modal.close());

  // Clique fora da caixa (no fundo escuro) fecha
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.close();
  });
}

function estatistica(valor, rotulo, elementoValor) {
  const item = el('span', 'projeto-stat');
  item.append(elementoValor || el('strong', '', valor), el('span', '', rotulo));
  return item;
}

function abrirModal(p) {
  if (!modal) return;

  const capa = modal.querySelector('#modal-capa');
  capa.replaceChildren(criarCapa(p));
  capa.classList.remove('sem-imagem');
  capa.querySelector('.projeto-capa-terminal')?.classList.add('grande');
  capaDoProjeto(p).then(src => {
    if (src && modal.dataset.projeto === p.nome) aplicarImagem(capa, src);
  });

  modal.querySelector('#modal-meta').textContent =
    `${p.linguagem || 'Sem linguagem'} · ★ ${p.estrelas}` +
    (p.atualizadoEm ? ` · Atualizado ${new Date(p.atualizadoEm).toLocaleDateString('pt-BR')}` : '');
  modal.querySelector('#modal-nome').textContent = p.nome;
  modal.querySelector('#modal-sobre').textContent = p.sobre || p.descricao;
  modal.dataset.projeto = p.nome;

  // README: mostra "carregando" e preenche quando chegar
  const readmeEl = modal.querySelector('#modal-readme');
  readmeEl.replaceChildren(el('p', 'projeto-modal-vazio', 'Carregando descrição...'));
  const funcionalidades = modal.querySelector('#modal-funcionalidades');
  funcionalidades.replaceChildren();
  funcionalidades.hidden = true;
  modal.querySelector('#modal-sub-func').hidden = true;

  obterReadme(p).then(readme => {
    if (modal.dataset.projeto !== p.nome) return; // o visitante já abriu outro projeto
    const paragrafos = readme?.paragrafos || [];
    readmeEl.replaceChildren(...(paragrafos.length
      ? paragrafos.map(t => el('p', '', t))
      : [el('p', 'projeto-modal-vazio', 'Este projeto ainda não tem um README com descrição.')]));

    const itens = readme?.funcionalidades || [];
    funcionalidades.replaceChildren(...itens.map(t => el('li', '', t)));
    modal.querySelector('#modal-sub-func').hidden = itens.length === 0;
    funcionalidades.hidden = itens.length === 0;
  });

  const stats = modal.querySelector('#modal-stats');
  const statCommits = el('strong', '', '…');
  stats.replaceChildren(
    estatistica(`★ ${p.estrelas}`, 'estrelas'),
    estatistica(null, 'commits', statCommits),
    estatistica(String(p.issues || 0), 'issues abertas'),
    estatistica(p.atualizadoEm ? new Date(p.atualizadoEm).toLocaleDateString('pt-BR') : '—', 'última atualização')
  );
  buscarTotalCommits(p.owner, p.nome).then(total => {
    if (modal.dataset.projeto === p.nome) statCommits.textContent = total === null ? '—' : String(total);
  });

  const statusModal = modal.querySelector('#modal-status');
  const st = statusDoProjeto(p);
  statusModal.replaceChildren(
    el('span', 'projeto-modal-selo', 'Status'),
    el('span', `projeto-status-tom tom-${st.tom}`, st.texto)
  );

  const techs = modal.querySelector('#modal-techs');
  const listaTechs = [p.linguagem, ...p.tecnologias].filter(Boolean);
  techs.replaceChildren(...listaTechs.map(t => el('li', '', t)));

  const linksEl = modal.querySelector('#modal-links');
  linksEl.replaceChildren(link('Código no GitHub', p.github, 'projeto-link projeto-link-forte'));
  if (p.demo) linksEl.append(link('Ver aplicação', p.demo, 'projeto-link projeto-link-forte'));

  modal.showModal();
}

// Chamado no fim do arquivo, depois de todas as constantes e do observador estarem definidos
if (gridDestaque && gridRecentes) iniciarProjetos();
