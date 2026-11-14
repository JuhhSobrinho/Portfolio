/* ==================== Oceano ASCII: fundo decorativo animado ====================
   Camada atmosférica atrás de todo o conteúdo. Cada caractere é desenhado como um
   "azulejo" (célula colorida com o caractere por cima), em três camadas de profundidade.
   O cursor só perturba levemente. */

const canvas = document.getElementById('oceano-ascii');

if (canvas) iniciarOceano(canvas);

function iniciarOceano(canvas) {
  const ctx = canvas.getContext('2d');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONTE = '"Consolas", "Courier New", monospace';
  const FUNDO = '#0b0d10';

  // Camadas de profundidade: distante (menor e mais apagada) → frontal (maior e mais forte)
  const CAMADAS = [
    { escala: 0.75, alfa: 0.4,  velocidade: 0.45 },
    { escala: 1.0,  alfa: 0.6,  velocidade: 0.8 },
    { escala: 1.35, alfa: 0.85, velocidade: 1.2 },
  ];

  // Paletas: cada caractere cai numa cor de azulejo (ver corDoCaractere)
  const PAL_KOI = { corpo: '#e0701f', detalhe: '#b7321c', escuro: '#34373d', claro: '#f1ebdd' };
  const PAL_PRATA = { corpo: '#7a8190', detalhe: '#4a505c', escuro: '#2a2e36', claro: '#f1ebdd' };
  const PAL_AGUA = { corpo: '#3f8fc4', detalhe: '#7fc8ef', escuro: '#2a3f52', claro: '#e8f6ff' };
  const PAL_BOLHA = { corpo: '#9fd8f0', detalhe: '#9fd8f0', escuro: '#5d8aa3', claro: '#f2fbff' };
  const PAL_PARTICULA = { corpo: '#5a6470', detalhe: '#5a6470', escuro: '#3a424c', claro: '#9aa6b2' };

  // Peixes desenhados nadando para a direita; a versão espelhada é gerada automaticamente
  const PEIXES = [
    {
      paleta: PAL_KOI,
      linhas: [
        '   ,=-=,  ',
        '<=%#%*%=. ',
        '<-*%#%%*%O',
        '<=%#%*%=. ',
        "   '=-='  ",
      ],
    },
    {
      paleta: PAL_PRATA,
      linhas: [
        '   _-==-  ',
        '  =+*+==-.',
        '<==+*++=+o',
        '  =+*+==-.',
        "   '-==-' ",
      ],
    },
  ];

  const AGUA_VIVA = [
    ['  ,.', '(oo)', '/||\\', '  ||', '  ||'],
    ['  ,.', '(oo)', '/||\\', ' |  |', ' |  |'],
  ];

  const BOLHAS = ['o', 'O', '°', '.'];
  const PARTICULAS = ['.', '·', '*', "'"];

  let W = 0, H = 0, dpr = 1;
  let criaturas = [];
  const mouse = { x: -9999, y: -9999 };
  let ultimo = 0;
  let rafId = null;

  const aleatorio = (min, max) => min + Math.random() * (max - min);
  const escolher = lista => lista[Math.floor(Math.random() * lista.length)];

  // Espelha um desenho: inverte as colunas e troca os caracteres direcionais
  const ESPELHO = { '(': ')', ')': '(', '/': '\\', '\\': '/', '<': '>', '>': '<', '[': ']', ']': '[' };
  function espelhar(linhas) {
    return linhas.map(linha => [...linha].reverse().map(ch => ESPELHO[ch] || ch).join(''));
  }

  function criarCriatura(tipo, camada) {
    const c = CAMADAS[camada];
    const base = {
      tipo,
      camada,
      alfa: c.alfa,
      celula: Math.round(10 * c.escala),
      fase: Math.random() * Math.PI * 2,
    };

    if (tipo === 'peixe') {
      const peixe = escolher(PEIXES);
      const dir = Math.random() < 0.5 ? 1 : -1;
      return {
        ...base,
        linhas: dir > 0 ? peixe.linhas : espelhar(peixe.linhas),
        paleta: peixe.paleta,
        dir,
        x: aleatorio(0, W),
        y: aleatorio(0, H),
        vx: dir * aleatorio(0.5, 1.0) * c.velocidade,
        vy: aleatorio(-0.1, 0.1),
      };
    }

    if (tipo === 'agua') {
      return {
        ...base,
        frames: AGUA_VIVA,
        paleta: PAL_AGUA,
        x: aleatorio(0, W),
        y: aleatorio(0, H),
        vx: aleatorio(-0.15, 0.15) * c.velocidade,
        vy: -aleatorio(0.08, 0.2) * c.velocidade,
      };
    }

    if (tipo === 'bolha') {
      return {
        ...base,
        linhas: [escolher(BOLHAS)],
        paleta: PAL_BOLHA,
        x: aleatorio(0, W),
        y: aleatorio(0, H),
        vy: -aleatorio(0.3, 0.7) * c.velocidade,
      };
    }

    return {
      ...base,
      linhas: [escolher(PARTICULAS)],
      paleta: PAL_PARTICULA,
      x: aleatorio(0, W),
      y: aleatorio(0, H),
      vx: aleatorio(-0.1, 0.1),
      vy: aleatorio(-0.08, 0.02),
    };
  }

  function popular() {
    const area = W * H;
    const numPeixes = Math.max(10, Math.min(30, Math.round(area / 50000)));
    const numAguas = Math.max(3, Math.min(8, Math.round(area / 180000)));
    const numBolhas = Math.max(8, Math.min(30, Math.round(area / 60000)));
    const numParticulas = Math.max(30, Math.min(120, Math.round(area / 12000)));

    criaturas = [];
    for (let i = 0; i < numPeixes; i++) {
      criaturas.push(criarCriatura('peixe', Math.floor(Math.random() * CAMADAS.length)));
    }
    for (let i = 0; i < numAguas; i++) {
      criaturas.push(criarCriatura('agua', Math.floor(Math.random() * CAMADAS.length)));
    }
    for (let i = 0; i < numBolhas; i++) {
      criaturas.push(criarCriatura('bolha', Math.floor(Math.random() * CAMADAS.length)));
    }
    for (let i = 0; i < numParticulas; i++) {
      criaturas.push(criarCriatura('particula', Math.floor(Math.random() * CAMADAS.length)));
    }
    // Camada distante primeiro, para a frontal ficar por cima
    criaturas.sort((a, b) => a.camada - b.camada);
  }

  function redimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    popular();
    if (reduzirMovimento) desenhar(performance.now());
  }

  function respawnPeixe(c) {
    const vindo = Math.random() < 0.5;
    c.dir = vindo ? 1 : -1;
    c.linhas = c.dir > 0 ? PEIXES.find(p => p.paleta === c.paleta).linhas : espelhar(PEIXES.find(p => p.paleta === c.paleta).linhas);
    c.x = c.dir > 0 ? -90 : W + 90;
    c.y = aleatorio(0, H);
    c.vx = c.dir * aleatorio(0.5, 1.0) * CAMADAS[c.camada].velocidade;
  }

  /* ---------- atualização ---------- */
  function atualizar(c, dt, t) {
    const d = Math.hypot(c.x - mouse.x, c.y - mouse.y);
    const perto = d < 140 ? 1 - d / 140 : 0;

    if (c.tipo === 'peixe') {
      // Peixes desviam levemente do cursor
      if (perto) c.vy += Math.sign(c.y - mouse.y || 1) * 0.02 * perto * dt;
      c.vy = Math.max(-0.6, Math.min(0.6, c.vy * 0.99 + (Math.random() - 0.5) * 0.01));
      c.x += c.vx * dt;
      c.y += (c.vy + Math.sin(t * 0.0015 + c.fase) * 0.08) * dt;
      if ((c.dir > 0 && c.x > W + 100) || (c.dir < 0 && c.x < -100)) respawnPeixe(c);
      if (c.y < -40) c.y = H + 20;
      if (c.y > H + 40) c.y = -20;
    } else if (c.tipo === 'agua') {
      // Águas-vivas sobem com oscilação e alteram o trajeto perto do cursor
      if (perto) c.vx += Math.sign(c.x - mouse.x || 1) * 0.01 * perto * dt;
      c.vx = Math.max(-0.4, Math.min(0.4, c.vx));
      c.x += (c.vx + Math.sin(t * 0.0008 + c.fase) * 0.2) * dt;
      c.y += c.vy * dt;
      if (c.y < -90) {
        c.y = H + 60;
        c.x = aleatorio(0, W);
      }
      if (c.x < -60) c.x = W + 40;
      if (c.x > W + 60) c.x = -40;
    } else if (c.tipo === 'bolha') {
      // Bolhas sobem e são empurradas de leve pelo cursor
      c.x += (Math.sin(t * 0.002 + c.fase) * 0.25 + perto * (Math.random() - 0.5) * 2) * dt;
      c.y += c.vy * dt;
      if (c.y < -10) {
        c.y = H + 10;
        c.x = aleatorio(0, W);
      }
    } else {
      // Partículas: deriva lenta, acompanham o cursor de leve
      if (perto) {
        c.x += (mouse.x - c.x) * 0.002 * dt;
        c.y += (mouse.y - c.y) * 0.002 * dt;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.y < -4) c.y = H + 4;
      if (c.x < -4) c.x = W + 4;
      if (c.x > W + 4) c.x = -4;
    }
  }

  /* ---------- desenho ---------- */
  function corDoCaractere(ch, p) {
    if ('%#*'.includes(ch)) return p.detalhe;
    if ('=-+~:_'.includes(ch)) return p.corpo;
    if ('oO°•'.includes(ch)) return p.claro;
    return p.escuro;
  }

  // Cada caractere vira um azulejo: célula colorida com o caractere por cima
  function desenharGrade(linhas, x, y, celula, p, alfa) {
    const passo = celula * 1.1;
    ctx.font = `${Math.round(celula * 0.8)}px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    linhas.forEach((linha, r) => {
      [...linha].forEach((ch, col) => {
        if (ch === ' ') return;
        const px = x + col * celula;
        const py = y + r * passo;

        ctx.globalAlpha = alfa;
        ctx.fillStyle = corDoCaractere(ch, p);
        ctx.fillRect(px, py, celula - 1, passo - 1);

        ctx.fillStyle = p.claro;
        ctx.fillText(ch, px + celula / 2, py + passo / 2);
      });
    });
    ctx.globalAlpha = 1;
  }

  // Grade de fundo, parecida com papel milimetrado
  function desenharGradeDeFundo() {
    ctx.fillStyle = FUNDO;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = 0; y <= H; y += 16) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
  }

  function desenhar(t) {
    desenharGradeDeFundo();

    const frameAgua = Math.floor(t / 900) % 2;

    criaturas.forEach(c => {
      const linhas = c.tipo === 'agua' ? c.frames[frameAgua] : c.linhas;
      desenharGrade(linhas, c.x, c.y, c.celula, c.paleta, c.alfa);
    });
  }

  /* ---------- loop ---------- */
  function loop(agora) {
    const dt = Math.min(2, (agora - ultimo) / 16.67) || 1;
    ultimo = agora;

    criaturas.forEach(c => atualizar(c, dt, agora));
    desenhar(agora);

    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Pausa quando a aba não está visível
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!reduzirMovimento && !rafId) {
      ultimo = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  });

  let redimensionarTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(redimensionarTimer);
    redimensionarTimer = setTimeout(redimensionar, 150);
  });

  redimensionar();

  if (!reduzirMovimento) {
    ultimo = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}
