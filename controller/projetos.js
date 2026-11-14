import { carregarBancoDeDados, seTLocarStorage, geTLocalStorage } from '../model/model.js';

/* ==================== Projetos: vitrine gerada a partir do GitHub ====================
   Busca os repositórios de juhhsobrinho (sem forks), o README de cada um e monta os cards.
   Capa, em ordem de prioridade:
     1. screenshot da demo (serviço Microlink)
     2. og:image da demo (mesma chamada)
     3. primeira imagem do README
     4. placeholder ASCII
   model/bd.json só complementa: demo, descrição e status quando o repo está cadastrado lá. */

const USUARIO = 'juhhsobrinho';
const CACHE_REPOS = 'githubReposCache';
// Quando o formato dos dados muda, aumente a versão: o cache antigo é ignorado sozinho
const VERSAO_CACHE = 4;
const CACHE_CAPAS = 'capasDemoCache';
const CACHE_COMMITS = 'commitsCache';
const TTL_COMMITS = 24 * 60 * 60 * 1000;
const TTL_REPOS = 60 * 60 * 1000; // 1h: depois disso, atualiza em segundo plano
const TTL_CAPAS = 7 * 24 * 60 * 60 * 1000;

const grid = document.getElementById('projetos-grid');
const filtroLinguagem = document.getElementById('filtro-linguagem');
const ordenarProjetos = document.getElementById('ordenar-projetos');
const statusEl = document.getElementById('projetos-status');
const modal = document.getElementById('projeto-modal');

if (grid && filtroLinguagem && ordenarProjetos) iniciarProjetos();

const COMPARADORES = {
  estrelas: (a, b) => b.estrelas - a.estrelas || a.nome.localeCompare(b.nome),
  recentes: (a, b) => new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0),
  nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
};

let todos = [];
let avisoFixo = false;

function iniciarProjetos() {
  filtroLinguagem.addEventListener('change', renderizar);
  ordenarProjetos.addEventListener('change', renderizar);
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
      if (salvo) return; // mantém o que já está na tela
      mostrarStatus('GitHub indisponível agora. Mostrando os projetos cadastrados.');
      avisoFixo = true;
      aplicarDados(await dadosDeFallback());
    });
}

function aplicarDados(dados) {
  todos = dados;
  const valorAnterior = filtroLinguagem.value;
  preencherLinguagens();
  filtroLinguagem.value = valorAnterior;
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

/* ---------- README: primeira imagem e lista de funcionalidades ---------- */
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

async function buscarReadme(owner, repo) {
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
    if (!resp.ok) return null;
    const json = await resp.json();
    return interpretarReadme(decodificarBase64(json.content), owner, repo);
  } catch (e) {
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
    arquivado: repo.archived,
    issues: repo.open_issues_count || 0,
    readme: null,
  };
}

async function buscarProjetos() {
  const resp = await fetch(`https://api.github.com/users/${USUARIO}/repos?per_page=100&type=owner&sort=pushed`);
  if (!resp.ok) throw new Error(`GitHub API respondeu ${resp.status}`);
  const repos = (await resp.json()).filter(r => !r.fork);
  const cadastrados = (await carregarBancoDeDados()) || [];

  const dados = repos.map(r => repoParaProjeto(r, cadastrados));

  // README em pequenos lotes, para não estourar o limite de requisições do GitHub
  const TAMANHO_LOTE = 4;
  for (let i = 0; i < dados.length; i += TAMANHO_LOTE) {
    await Promise.all(dados.slice(i, i + TAMANHO_LOTE).map(async p => {
      p.readme = await buscarReadme(p.owner, p.nome);
    }));
  }

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
    readme: null,
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
  return p.readme?.imagem || '';
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
  const img = new Image();
  img.alt = '';
  img.loading = 'lazy';
  img.onload = () => {
    capa.replaceChildren(img);
    capa.classList.remove('sem-imagem');
  };
  img.src = src;
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

function renderizar() {
  const linguagem = filtroLinguagem.value;
  const ordem = ordenarProjetos.value;

  const lista = todos
    .filter(p => !linguagem || p.linguagem === linguagem)
    .sort(COMPARADORES[ordem] || COMPARADORES.estrelas);

  const cards = lista.map(criarCard);
  grid.replaceChildren(...cards);

  // Capas carregam uma a uma, para não disparar muitas chamadas de uma vez
  lista.reduce((antes, p, i) => antes.then(async () => {
    const src = await capaDoProjeto(p);
    if (src && cards[i]) aplicarImagem(cards[i].querySelector('.projeto-capa'), src);
  }), Promise.resolve());

  if (!lista.length) {
    mostrarStatus('Nenhum projeto com esse filtro.');
  } else if (statusEl && !avisoFixo) {
    statusEl.hidden = true;
  }
}

function preencherLinguagens() {
  const linguagens = [...new Set(todos.map(p => p.linguagem).filter(Boolean))].sort();
  filtroLinguagem.replaceChildren(
    new Option('Todas', ''),
    ...linguagens.map(l => new Option(l, l))
  );
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
    if (src) aplicarImagem(capa, src);
  });

  modal.querySelector('#modal-meta').textContent =
    `${p.linguagem || 'Sem linguagem'} · ★ ${p.estrelas}` +
    (p.atualizadoEm ? ` · Atualizado ${new Date(p.atualizadoEm).toLocaleDateString('pt-BR')}` : '');
  modal.querySelector('#modal-nome').textContent = p.nome;
  modal.querySelector('#modal-sobre').textContent = p.sobre || p.descricao;
  modal.dataset.projeto = p.nome;

  const readmeEl = modal.querySelector('#modal-readme');
  const paragrafos = p.readme?.paragrafos || [];
  readmeEl.replaceChildren(...(paragrafos.length
    ? paragrafos.map(t => el('p', '', t))
    : [el('p', 'projeto-modal-vazio', 'Este projeto ainda não tem um README com descrição.')]));

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

  const funcionalidades = modal.querySelector('#modal-funcionalidades');
  const itens = p.readme?.funcionalidades || [];
  funcionalidades.replaceChildren(...itens.map(t => el('li', '', t)));
  modal.querySelector('#modal-sub-func').hidden = itens.length === 0;
  funcionalidades.hidden = itens.length === 0;

  const techs = modal.querySelector('#modal-techs');
  const listaTechs = [p.linguagem, ...p.tecnologias].filter(Boolean);
  techs.replaceChildren(...listaTechs.map(t => el('li', '', t)));

  const linksEl = modal.querySelector('#modal-links');
  linksEl.replaceChildren(link('Código no GitHub', p.github, 'projeto-link projeto-link-forte'));
  if (p.demo) linksEl.append(link('Ver aplicação', p.demo, 'projeto-link projeto-link-forte'));

  modal.showModal();
}
