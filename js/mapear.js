/**
 * Mapeamento manual de planta.
 * Os pontos são marcados no canvas em coordenadas relativas à âncora.
 * A escala em pixels por metro deve ser calibrada pelo usuário.
 */
const MapearModule = {
  ativo: false,
  escalaPxPorMetro: (() => {\n    try {\n      const valor = Number(localStorage.getItem('smuploc_escala_mapa'));\n      return Number.isFinite(valor) && valor >= 4 && valor <= 100 ? valor : 22;\n    } catch (erro) {\n      return 22;\n    }\n  })(),
  escalaMin: 4,
  escalaMax: 100,

  iniciar() {
    if (State.perfilAtual === 'cliente') {
      alert('O modo cliente não pode editar a planta.');
      return;
    }

    const modal = document.getElementById('modal-planta');
    const hud = document.getElementById('mapear-hud');
    if (modal) modal.style.display = 'flex';
    if (hud) hud.style.display = 'block';

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
    if (!this.ativo || State.perfilAtual === 'cliente') return;
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

    this.encerrar();
    MinimapModule.abrirModal();
    alert('Contorno salvo. Área estimada: ' + area.toFixed(2) + ' m².');
  },

  cancelar() {
    if (this.ativo) {
      const confirmar = confirm('Descartar os pontos deste mapeamento?');
      if (!confirmar) return;
    }

    this.encerrar();
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
