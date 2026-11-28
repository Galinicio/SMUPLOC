/**
 * Referências espaciais QR — pontos fixos conhecidos na planta.
 * A leitura confirma presença junto ao marcador e corrige a posição para
 * as coordenadas cadastradas. Não calcula distância nem pose 3D da câmera.
 */
const SpatialAnchors = {
  listar() {
    return (State.equipamentos || []).filter(eq =>
      eq && eq.referenciaEspacial === true &&
      eq.posicionado === true &&
      Number.isFinite(Number(eq.x)) && Number.isFinite(Number(eq.z))
    );
  },

  definir(id) {
    const eq = State.equipamentos.find(item => String(item.id) === String(id));
    if (!eq) return;
    if (eq.posicionado !== true) {
      alert('Posicione o equipamento na planta antes de torná-lo uma referência espacial.');
      return;
    }
    if (eq.referenciaEspacial === true) {
      if (!confirm('Remover este equipamento da rede de referências espaciais?')) return;
      eq.referenciaEspacial = false;
      eq.referenciaDesde = null;
    } else {
      const ok = confirm(
        'Confirme que este equipamento está fixo e não muda de lugar.\\n\\n' +
        'A posição cadastrada na planta será usada como ponto de correção quando o QR for lido.'
      );
      if (!ok) return;
      eq.referenciaEspacial = true;
      eq.referenciaDesde = new Date().toISOString();
      eq.referenciaMetodo = 'qr-scan-snap';
    }
    State.salvarEquipamentos();
    if (typeof EquipmentModule !== 'undefined') EquipmentModule.render();
    this.atualizarStatus();
  },

  reconhecer(payload) {
    const id = this.extrairId(payload);
    if (!id) return false;
    const eq = this.listar().find(item => String(item.id) === id);
    if (!eq) return false;

    State.posicaoUsuario = { x: Number(eq.x), z: Number(eq.z) };
    State.marcoZero = {
      x: Number(eq.x), z: Number(eq.z),
      headingOffset: Number(State.marcoZero && State.marcoZero.headingOffset) || 0
    };
    State.sincronizarAmbienteAtual();
    if (typeof IndoorTracker !== 'undefined') {
      IndoorTracker.reiniciarNaReferencia(eq);
    }
    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
    }
    if (typeof ScannerModule !== 'undefined') ScannerModule.atualizarPainelDestino();
    this.atualizarStatus('Referência reconhecida: ' + String(eq.nome || eq.id) + '. Posição corrigida para o ponto cadastrado.');
    return true;
  },

  extrairId(payload) {
    const bruto = String(payload || '').trim();
    if (!bruto) return '';
    try {
      const dados = JSON.parse(bruto);
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return bruto;
      return String(dados.id || dados.tag || dados.codigo || dados.serial || '').trim();
    } catch (erro) {
      return bruto;
    }
  },

  atualizarStatus(mensagem) {
    const status = document.getElementById('tracking-status');
    if (status && mensagem) status.textContent = mensagem;
    const total = this.listar().length;
    const label = document.getElementById('spatial-anchor-count');
    if (label) label.textContent = total + (total === 1 ? ' referência espacial ativa' : ' referências espaciais ativas');
  }
};
