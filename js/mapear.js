/**
 * Mapeamento manual de planta.
 * Os pontos são marcados no canvas em coordenadas relativas à âncora.
 * A escala em pixels por metro deve ser calibrada pelo usuário.
 */
const MapearModule = {
  ativo: false,
  pontosAnteriores: [],
  calibracaoAtiva: false,
  pontosCalibracao: [],
  escalaPxPorMetro: (() => {
    try {
      const valor = Number(localStorage.getItem('smuploc_escala_mapa'));
      return Number.isFinite(valor) && valor >= 4 && valor <= 100 ? valor : 22;
    } catch (erro) {
      return 22;
    }
  })(),
  escalaMin: 4,
  escalaMax: 100,

  iniciar() {
    if (State.perfilAtual === 'cliente') {
      alert('O modo cliente não pode editar a planta.');
      return;
    }

    if (typeof UIShell !== 'undefined') UIShell.abrirPainel();
    const modal = document.getElementById('modal-planta');
    const hud = document.getElementById('mapear-hud');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('mapeamento-ativo'); }
    if (hud) hud.style.display = 'block';

    this.pontosAnteriores = State.cantosMapear.map(ponto => ({ ...ponto }));
    this.ativo = true;
    State.cantosMapear = [];
    this.atualizarStats();
    this.atualizarInstrucoes();
    MinimapModule.renderExpandido();
  },

  encerrar() {
    this.ativo = false;
    const hud = document.getElementById('mapear-hud');
    if (hud) hud.style.display = 'none';
    const modal = document.getElementById('modal-planta');
    if (modal) modal.classList.remove('mapeamento-ativo');
  },

  obterPontoCanvas(evento) {
    const canvas = document.getElementById('canvas-expandido');
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const ponto = evento.touches ? evento.touches[0] : evento;
    if (!ponto) return null;

    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;

    return {
      x: (ponto.clientX - rect.left) * escalaX,
      y: (ponto.clientY - rect.top) * escalaY
    };
  },

  registrarToque(evento) {
    if (State.perfilAtual === 'cliente') return;
    if (this.calibracaoAtiva) {
      if (evento.target !== document.getElementById('canvas-expandido')) return;
      if (evento.cancelable) evento.preventDefault();
      const ponto = this.obterPontoCanvas(evento);
      if (!ponto) return;
      this.pontosCalibracao.push(ponto);
      if (this.pontosCalibracao.length === 1) {
        alert('Primeiro ponto marcado. Toque no segundo ponto da mesma medida conhecida.');
        return;
      }
      const [a, b] = this.pontosCalibracao;
      this.calibracaoAtiva = false;
      this.pontosCalibracao = [];
      const pixels = Math.hypot(b.x - a.x, b.y - a.y);
      const resposta = prompt('Qual é a distância REAL entre os dois pontos, em metros?');
      if (resposta === null) return;
      const metros = Number(String(resposta).replace(',', '.'));
      if (!Number.isFinite(metros) || metros <= 0 || pixels <= 0) {
        alert('Medida inválida. Repita a calibração e informe uma distância maior que zero.');
        return;
      }
      const novaEscala = pixels / metros;
      if (novaEscala < this.escalaMin || novaEscala > this.escalaMax) {
        alert('A escala calculada (' + novaEscala.toFixed(2) + ' px/m) ficou fora do intervalo suportado (4–100 px/m). Use uma medida maior ou uma imagem com resolução melhor.');
        return;
      }
      this.escalaPxPorMetro = novaEscala;
      try { localStorage.setItem('smuploc_escala_mapa', String(novaEscala)); } catch (erro) {}
      State.sincronizarAmbienteAtual();
      this.atualizarInstrucoes();
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
      alert('Escala calibrada: ' + novaEscala.toFixed(2) + ' px/m. A calibração foi salva neste ambiente.');
      return;
    }
    if (!this.ativo) return;
    if (evento.target.closest('#mapear-controls, #mapear-tutorial')) return;

    const canvas = document.getElementById('canvas-expandido');
    if (!canvas || evento.target !== canvas) return;

    if (evento.cancelable) evento.preventDefault();

    const ponto = this.obterPontoCanvas(evento);
    if (!ponto) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const x = (ponto.x - cx) / this.escalaPxPorMetro;
    const z = (ponto.y - cy) / this.escalaPxPorMetro;

    State.cantosMapear.push({
      x: Number(x.toFixed(3)),
      z: Number(z.toFixed(3))
    });

    this.atualizarStats();
    MinimapModule.renderExpandido();
  },

  marcarCanto() {
    // Mantido para compatibilidade com chamadas antigas.
    alert('Agora marque os cantos tocando diretamente no mapa.');
  },

  desfazerCanto() {
    if (!this.ativo || !State.cantosMapear.length) return;
    State.cantosMapear.pop();
    this.atualizarStats();
    MinimapModule.renderExpandido();
  },

  iniciarCamera() {
    if (State.perfilAtual === 'cliente') {
      alert('O modo cliente não pode iniciar o mapeamento.');
      return;
    }
    this.ativo = false;
    this.calibracaoAtiva = false;
    const hud = document.getElementById('mapear-hud');
    if (hud) hud.style.display = 'none';
    if (typeof UIShell !== 'undefined') UIShell.fecharPainel();
    const camera = document.getElementById('camera-mapeamento');
    if (camera) camera.hidden = false;
  },

  encerrarCamera() {
    const camera = document.getElementById('camera-mapeamento');
    if (camera) camera.hidden = true;
  },

  iniciarCalibracao() {
    if (State.perfilAtual === 'cliente') { alert('A calibração exige perfil de edição.'); return; }
    if (!State.plantaImageBase64) { alert('Importe a planta baixa antes de calibrar.'); return; }
    this.ativo = false;
    this.calibracaoAtiva = true;
    this.pontosCalibracao = [];
    const hud = document.getElementById('mapear-hud');
    if (hud) hud.style.display = 'none';
    MinimapModule.abrirModal();
    alert('Calibração em 2 pontos: toque nas extremidades de uma medida identificável na planta (por exemplo, uma parede de 5,00 m).');
  },

  ajustarEscala() {
    const atual = String(this.escalaPxPorMetro);
    const resposta = prompt(
      'Informe quantos pixels do mapa representam 1 metro.\n' +
      'Calibre usando uma medida conhecida da planta.\n' +
      'Valor atual: ' + atual + ' px/m',
      atual
    );

    if (resposta === null) return;
    const valor = Number(resposta.replace(',', '.'));

    if (!Number.isFinite(valor) || valor < this.escalaMin || valor > this.escalaMax) {
      alert('Informe um valor entre 4 e 100 px/m.');
      return;
    }

    this.escalaPxPorMetro = valor;
    try {
      localStorage.setItem('smuploc_escala_mapa', String(valor));
    } catch (erro) {
      console.warn('Não foi possível persistir a escala do mapa.', erro);
    }
    if (typeof State !== 'undefined') State.sincronizarAmbienteAtual();
    this.atualizarStats();
    MinimapModule.renderExpandido();
  },

  calcularArea(pontos) {
    if (!Array.isArray(pontos) || pontos.length < 3) return 0;

    let soma = 0;
    for (let i = 0; i < pontos.length; i++) {
      const atual = pontos[i];
      const proximo = pontos[(i + 1) % pontos.length];
      soma += (Number(atual.x) * Number(proximo.z)) -
              (Number(proximo.x) * Number(atual.z));
    }

    return Math.abs(soma) / 2;
  },

  finalizar() {
    if (!this.ativo) return;

    if (State.cantosMapear.length < 3) {
      alert('Marque pelo menos 3 cantos para fechar o contorno.');
      return;
    }

    const area = this.calcularArea(State.cantosMapear);
    if (!Number.isFinite(area) || area <= 0) {
      alert('O contorno não forma uma área válida. Confira os pontos marcados.');
      return;
    }

    if (!State.salvarCantos(State.cantosMapear)) {
      alert('Não foi possível salvar o contorno neste navegador.');
      return;
    }

    this.pontosAnteriores = [];
    this.encerrar();
    MinimapModule.abrirModal();
    alert('Contorno salvo. Área estimada: ' + area.toFixed(2) + ' m².');
  },

  cancelar() {
    if (this.calibracaoAtiva) { this.calibracaoAtiva = false; this.pontosCalibracao = []; }
    if (this.ativo) {
      const confirmar = confirm('Descartar os pontos deste mapeamento?');
      if (!confirmar) return;
    }

    State.cantosMapear = this.pontosAnteriores.map(ponto => ({ ...ponto }));
    this.pontosAnteriores = [];
    this.encerrar();
    MinimapModule.renderExpandido();
    MinimapModule.abrirModal();
  },

  atualizarInstrucoes() {
    const tutorial = document.getElementById('mapear-tutorial');
    if (!tutorial) return;
    tutorial.dataset.scale = this.escalaPxPorMetro + ' px/m';
  },

  atualizarStats() {
    const count = document.getElementById('mp-count');
    const areaEl = document.getElementById('mp-area');
    if (count) count.textContent = State.cantosMapear.length;

    const area = this.calcularArea(State.cantosMapear);
    if (areaEl) {
      areaEl.textContent = area.toFixed(2);
    }
  }
};
