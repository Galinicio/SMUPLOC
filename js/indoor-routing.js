/**
 * IndoorRouting — planejamento 2D por grade A* com obstáculos desenhados pelo técnico.
 * A rota só é confiável na medida em que a planta, escala e obstáculos foram cadastrados.
 */
const IndoorRouting = {
  ativo: false,
  primeiroPonto: null,
  rota: null,
  chaveRota: '',
  passoGrade: 0.25,

  distanciaSegmento(px, pz, o) {
    const ax = Number(o.x1), az = Number(o.z1);
    const bx = Number(o.x2), bz = Number(o.z2);
    const dx = bx - ax, dz = bz - az;
    const denom = dx * dx + dz * dz;
    const t = denom ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / denom)) : 0;
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  },

  bloqueado(x, z, obstaculos, passo = this.passoGrade) {
    return obstaculos.some(o => this.distanciaSegmento(x, z, o) <= Math.max(0.05, Number(o.largura) || 0.12) / 2 + passo * 0.55);
  },

  calcular(origem, destino, obstaculos = []) {
    const start = { x: Number(origem.x), z: Number(origem.z) };
    const goal = { x: Number(destino.x), z: Number(destino.z) };
    if (![start.x, start.z, goal.x, goal.z].every(Number.isFinite)) return null;
    if (!obstaculos.length) return [start, goal];

    const margem = 1.5;
    const pontosLimite = [start, goal];
    obstaculos.forEach(o => {
      pontosLimite.push({ x: Number(o.x1), z: Number(o.z1) }, { x: Number(o.x2), z: Number(o.z2) });
    });
    const minX = Math.min(...pontosLimite.map(p => p.x)) - margem;
    const maxX = Math.max(...pontosLimite.map(p => p.x)) + margem;
    const minZ = Math.min(...pontosLimite.map(p => p.z)) - margem;
    const maxZ = Math.max(...pontosLimite.map(p => p.z)) + margem;
    // Mantém resolução de 25 cm em salas comuns e reduz a grade em plantas enormes.
    const passo = Math.max(this.passoGrade, (maxX - minX) / 220, (maxZ - minZ) / 220);
    const largura = Math.ceil((maxX - minX) / passo) + 1;
    const altura = Math.ceil((maxZ - minZ) / passo) + 1;
    const toCell = p => ({
      x: Math.max(0, Math.min(largura - 1, Math.round((p.x - minX) / passo))),
      z: Math.max(0, Math.min(altura - 1, Math.round((p.z - minZ) / passo)))
    });
    const toWorld = p => ({ x: minX + p.x * passo, z: minZ + p.z * passo });
    const s = toCell(start), g = toCell(goal);
    const key = p => p.x + ',' + p.z;
    const blocked = new Set();
    // Rasteriza apenas a vizinhança de cada segmento, evitando testar toda a grade
    // contra todas as paredes (importante para celulares e plantas com muitos itens).
    obstaculos.forEach(o => {
      const a = toCell({ x: Number(o.x1), z: Number(o.z1) });
      const b = toCell({ x: Number(o.x2), z: Number(o.z2) });
      const margemCelulas = Math.ceil((Math.max(0.05, Number(o.largura) || 0.12) / 2 + passo * 0.55) / passo) + 1;
      const minCellX = Math.max(0, Math.min(a.x, b.x) - margemCelulas);
      const maxCellX = Math.min(largura - 1, Math.max(a.x, b.x) + margemCelulas);
      const minCellZ = Math.max(0, Math.min(a.z, b.z) - margemCelulas);
      const maxCellZ = Math.min(altura - 1, Math.max(a.z, b.z) + margemCelulas);
      for (let z = minCellZ; z <= maxCellZ; z++) {
        for (let x = minCellX; x <= maxCellX; x++) {
          if ((x === s.x && z === s.z) || (x === g.x && z === g.z)) continue;
          const world = toWorld({ x, z });
          if (this.distanciaSegmento(world.x, world.z, o) <= Math.max(0.05, Number(o.largura) || 0.12) / 2 + passo * 0.55) {
            blocked.add(key({ x, z }));
          }
        }
      }
    });

    const heuristica = p => Math.hypot(g.x - p.x, g.z - p.z);
    const heap = [];
    const push = item => {
      heap.push(item);
      let index = heap.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (heap[parent].f <= heap[index].f) break;
        [heap[parent], heap[index]] = [heap[index], heap[parent]];
        index = parent;
      }
    };
    const pop = () => {
      const first = heap[0];
      const last = heap.pop();
      if (heap.length && last) {
        heap[0] = last;
        let index = 0;
        while (true) {
          const left = index * 2 + 1, right = left + 1;
          let smallest = index;
          if (left < heap.length && heap[left].f < heap[smallest].f) smallest = left;
          if (right < heap.length && heap[right].f < heap[smallest].f) smallest = right;
          if (smallest === index) break;
          [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
          index = smallest;
        }
      }
      return first;
    };
    push({ ...s, g: 0, f: heuristica(s) });
    const custos = new Map([[key(s), 0]]);
    const pais = new Map();
    const direcoes = [
      [1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
      [1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]
    ];
    let encontrado = false;
    let iteracoes = 0;
    while (heap.length && iteracoes++ < largura * altura * 2) {
      const atual = pop();
      if (atual.g > (custos.get(key(atual)) ?? Infinity)) continue;
      if (atual.x === g.x && atual.z === g.z) { encontrado = true; break; }
      for (const [dx,dz,custo] of direcoes) {
        const proximo = { x: atual.x + dx, z: atual.z + dz };
        if (proximo.x < 0 || proximo.z < 0 || proximo.x >= largura || proximo.z >= altura) continue;
        if (blocked.has(key(proximo))) continue;
        if (dx && dz && (blocked.has(key({x:atual.x+dx,z:atual.z})) || blocked.has(key({x:atual.x,z:atual.z+dz})))) continue;
        const k = key(proximo);
        const novoG = atual.g + custo;
        if (novoG >= (custos.get(k) ?? Infinity)) continue;
        custos.set(k, novoG);
        pais.set(k, key(atual));
        push({ ...proximo, g: novoG, f: novoG + heuristica(proximo) });
      }
    }
    if (!encontrado) return null;

    const caminho = [];
    let cursor = key(g);
    while (cursor) {
      const [x,z] = cursor.split(',').map(Number);
      caminho.push(toWorld({x,z}));
      cursor = pais.get(cursor);
    }
    caminho.reverse();
    caminho[0] = start;
    caminho[caminho.length - 1] = goal;

    // Remove pontos colineares para produzir uma rota visual mais limpa.
    const simples = [];
    caminho.forEach(p => {
      if (simples.length >= 2) {
        const a = simples[simples.length - 2], b = simples[simples.length - 1];
        const cross = (b.x-a.x)*(p.z-b.z) - (b.z-a.z)*(p.x-b.x);
        if (Math.abs(cross) < 0.0001) simples.pop();
      }
      simples.push(p);
    });
    return simples;
  },

  calcularRota() {
    const destino = State.equipamentos.find(eq => String(eq.id) === String(State.destinoId) && eq.posicionado !== false);
    if (!destino || !State.posicaoUsuario) { this.rota = null; this.chaveRota = ''; return null; }
    const origem = State.posicaoUsuario;
    const obstaculos = Array.isArray(State.obstaculos) ? State.obstaculos : [];
    const chave = JSON.stringify([origem.x, origem.z, destino.x, destino.z, obstaculos]);
    if (chave !== this.chaveRota) {
      this.chaveRota = chave;
      this.rota = this.calcular(origem, destino, obstaculos);
    }
    return this.rota;
  },

  iniciarCadastro() {
    if (!['admin','tecnico'].includes(State.perfilAtual)) {
      alert('Somente administrador ou técnico pode cadastrar paredes e obstáculos.');
      return;
    }
    this.ativo = true;
    this.primeiroPonto = null;
    const status = document.getElementById('tracking-status');
    if (status) status.textContent = 'Marque o primeiro ponto da parede na planta.';
    alert('Toque em dois pontos da planta para desenhar uma parede ou obstáculo. Depois informe a largura aproximada em metros.');
  },

  cancelarCadastro() {
    this.ativo = false;
    this.primeiroPonto = null;
    const status = document.getElementById('tracking-status');
    if (status) status.textContent = 'Marcação de obstáculo cancelada.';
  },

  registrarToque(evento) {
    if (!this.ativo || !evento || evento.target !== document.getElementById('canvas-expandido')) return false;
    const canvas = evento.target;
    const rect = canvas.getBoundingClientRect();
    const xPx = (evento.clientX - rect.left) * (canvas.width / rect.width);
    const zPx = (evento.clientY - rect.top) * (canvas.height / rect.height);
    const escala = (typeof MapearModule !== 'undefined' && MapearModule.escalaPxPorMetro) || 22;
    const ponto = { x: Number(((xPx - canvas.width / 2) / escala).toFixed(3)), z: Number(((zPx - canvas.height / 2) / escala).toFixed(3)) };
    if (!this.primeiroPonto) {
      this.primeiroPonto = ponto;
      const status = document.getElementById('tracking-status');
      if (status) status.textContent = 'Agora marque o segundo ponto da parede.';
      return true;
    }
    const primeiro = this.primeiroPonto;
    this.primeiroPonto = null;
    const respostaLargura = prompt('Largura da parede/obstáculo em metros:', '0.15');
    if (respostaLargura === null) return true;
    const larguraInformada = Number(respostaLargura);
    const largura = Number.isFinite(larguraInformada) && larguraInformada > 0
      ? Math.max(0.05, Math.min(2, larguraInformada)) : 0.15;
    if (Math.hypot(ponto.x - primeiro.x, ponto.z - primeiro.z) < 0.15) {
      alert('A parede ficou muito curta. Tente marcar dois pontos mais distantes.');
      return true;
    }
    State.obstaculos = Array.isArray(State.obstaculos) ? State.obstaculos : [];
    State.obstaculos.push({ id: State.gerarId('obs'), x1: primeiro.x, z1: primeiro.z, x2: ponto.x, z2: ponto.z, largura });
    State.sincronizarAmbienteAtual();
    this.chaveRota = '';
    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
    }
    const status = document.getElementById('tracking-status');
    if (status) status.textContent = 'Obstáculo cadastrado. A próxima rota considerará esta parede.';
    return true;
  },

  desfazerObstaculo() {
    if (!Array.isArray(State.obstaculos) || !State.obstaculos.length) {
      alert('Não há obstáculos cadastrados para desfazer.');
      return false;
    }
    State.obstaculos.pop();
    State.sincronizarAmbienteAtual();
    this.chaveRota = '';
    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
    }
    return true;
  },

  desenhar(ctx, escala, cx, cy, expandido) {
    const obstaculos = Array.isArray(State.obstaculos) ? State.obstaculos : [];
    ctx.save();
    obstaculos.forEach(o => {
      ctx.strokeStyle = 'rgba(255, 152, 0, .9)';
      ctx.lineWidth = Math.max(expandido ? 5 : 2, (Number(o.largura) || 0.15) * escala);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + Number(o.x1) * escala, cy + Number(o.z1) * escala);
      ctx.lineTo(cx + Number(o.x2) * escala, cy + Number(o.z2) * escala);
      ctx.stroke();
    });
    const rota = this.calcularRota();
    if (rota && rota.length > 1) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = expandido ? 4 : 2;
      ctx.setLineDash(expandido ? [8,5] : [4,3]);
      ctx.beginPath();
      rota.forEach((p,i) => {
        const x = cx + p.x * escala, y = cy + p.z * escala;
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (State.destinoId && State.posicaoUsuario && obstaculos.length) {
      const status = document.getElementById('tracking-status');
      if (status) status.textContent = 'Não foi encontrada uma rota livre. Confira as paredes cadastradas ou ajuste a posição.';
    }
    ctx.restore();
  }
};
