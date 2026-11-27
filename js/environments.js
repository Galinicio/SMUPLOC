/**
 * Ambientes SMUPLOC: cadastro local, QR de referência e intercâmbio de dados.
 * O QR identifica o ambiente; o arquivo JSON transporta planta e equipamentos
 * entre dispositivos enquanto a API compartilhada ainda não está conectada.
 */
const EnvironmentModule = {
  qrInstance: null,

  init() {
    this.atualizarSeletor();
    const input = document.getElementById('input-importar-ambiente');
    if (input) input.addEventListener('change', evento => this.importarArquivo(evento));
    if (typeof MapearModule !== 'undefined') {
      const ambiente = State.obterAmbienteAtual();
      if (ambiente) MapearModule.escalaPxPorMetro = ambiente.escala || 22;
      MapearModule.atualizarInstrucoes();
    }
  },

  atualizarSeletor() {
    const seletor = document.getElementById('ambiente-select');
    const atual = State.obterAmbienteAtual();
    if (!seletor || !atual) return;
    seletor.replaceChildren();
    State.ambientes.forEach(ambiente => {
      const option = document.createElement('option');
      option.value = ambiente.id;
      option.textContent = [ambiente.cliente, ambiente.unidade, ambiente.nome].filter(Boolean).join(' / ');
      seletor.appendChild(option);
    });
    seletor.value = atual.id;
    const label = document.getElementById('ambiente-atual-label');
    if (label) label.textContent = atual.nome;
  },

  selecionar(id) {
    if (id === State.ambienteAtualId) return;
    if (!State.ativarAmbiente(id)) {
      alert('Não foi possível abrir este ambiente.');
      this.atualizarSeletor();
      return;
    }
    if (typeof EquipmentModule !== 'undefined' && EquipmentModule.painelAberto) EquipmentModule.render();
    if (typeof MapearModule !== 'undefined') {
      MapearModule.atualizarInstrucoes();
      MapearModule.atualizarStats();
    }
    const atual = State.obterAmbienteAtual();
    const toast = document.getElementById('toast-info');
    const titulo = document.getElementById('toast-title');
    const corpo = document.getElementById('toast-body');
    if (titulo) titulo.textContent = 'AMBIENTE CARREGADO';
    if (corpo) corpo.textContent = [atual.nome, atual.setor, atual.unidade].filter(Boolean).join(' · ');
    if (toast) {
      toast.style.display = 'block';
      clearTimeout(QRScannerModule.timerToast);
      QRScannerModule.timerToast = setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
  },

  novo() {
    if (State.perfilAtual === 'cliente') {
      alert('Somente administrador ou técnico pode cadastrar ambientes.');
      return;
    }
    const cliente = (prompt('Nome do cliente / instituição:') || '').trim();
    if (!cliente) return;
    const unidade = (prompt('Unidade / prédio:') || '').trim();
    if (!unidade) return;
    const andar = (prompt('Andar (ex.: Térreo, 1º andar):') || '').trim();
    const setor = (prompt('Setor (ex.: Laboratório, CAF, UTI):') || '').trim();
    const nome = (prompt('Nome do ambiente (ex.: Sala de vacinas):') || '').trim();
    if (!nome) return;
    const ambiente = State.criarAmbiente({ cliente, unidade, andar, setor, nome });
    if (!ambiente) return;
    this.atualizarSeletor();
    alert('Ambiente criado. Agora cadastre a planta e posicione os equipamentos neste ambiente.');
  },

  payloadQR(ambiente = State.obterAmbienteAtual()) {
    if (!ambiente) return '';
    return JSON.stringify({
      type: 'smuploc-environment',
      version: 1,
      environmentId: ambiente.id,
      environmentCode: ambiente.codigoQr,
      anchor: ambiente.marcoZero || { x: 0, z: 0, headingOffset: 0 }
    });
  },

  gerarQR() {
    const ambiente = State.obterAmbienteAtual();
    const area = document.getElementById('ambiente-qr-area');
    if (!ambiente || !area) return;
    State.sincronizarAmbienteAtual();
    area.hidden = false;
    area.replaceChildren();
    const titulo = document.createElement('strong');
    titulo.textContent = 'QR Code do ambiente';
    const descricao = document.createElement('p');
    descricao.textContent = 'Fixe este código exatamente no ponto marcado como marco zero na planta. Ao ler o QR, o celular inicia a estimativa de posição a partir dessas coordenadas.';
    const qr = document.createElement('div');
    qr.id = 'ambiente-qr-render';
    const codigo = document.createElement('code');
    codigo.textContent = ambiente.id;
    area.append(titulo, descricao, qr, codigo);
    if (typeof QRCode !== 'function') {
      qr.textContent = 'Biblioteca de QR indisponível. Verifique a conexão com a internet.';
      return;
    }
    this.qrInstance = new QRCode(qr, {
      text: this.payloadQR(ambiente),
      width: 192,
      height: 192,
      colorDark: '#07192b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  ativarPorQr(dados) {
    if (!dados || dados.type !== 'smuploc-environment' || dados.version !== 1) return false;
    const ambiente = State.ambientes.find(item =>
      item.id === String(dados.environmentId || '') ||
      item.codigoQr === String(dados.environmentCode || '')
    );
    if (!ambiente) {
      alert('Este QR Code identifica um ambiente que ainda não foi importado para este dispositivo. Importe o arquivo de cadastro fornecido pelo administrador ou aguarde a sincronização pela API SMUP.');
      return true;
    }
    this.selecionar(ambiente.id);
    const ancora = dados.anchor && Number.isFinite(Number(dados.anchor.x)) && Number.isFinite(Number(dados.anchor.z))
      ? { x: Number(dados.anchor.x), z: Number(dados.anchor.z), headingOffset: Number(dados.anchor.headingOffset) || 0 }
      : (ambiente.marcoZero || { x: 0, z: 0, headingOffset: 0 });
    if (typeof IndoorTracker !== 'undefined') IndoorTracker.iniciarNoMarcoZero(ancora);
    return true;
  },

  exportar() {
    const ambiente = State.obterAmbienteAtual();
    if (!ambiente) return;
    State.sincronizarAmbienteAtual();
    const pacote = {
      formato: 'SMUPLOC_ENVIRONMENT',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      ambiente
    };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smuploc-' + ambiente.id.replace(/[^a-z0-9_-]/gi, '-') + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  importarArquivo(evento) {
    const arquivo = evento.target.files && evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    if (arquivo.size > 8 * 1024 * 1024) {
      alert('O arquivo excede o limite de 8 MB.');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(String(leitor.result || ''));
        if (State.importarAmbiente(dados)) {
          this.atualizarSeletor();
          alert('Ambiente importado. Os equipamentos e a planta agora estão disponíveis neste dispositivo.');
        }
      } catch (erro) {
        alert('Não foi possível ler o arquivo JSON do ambiente.');
      }
    };
    leitor.onerror = () => alert('Falha ao ler o arquivo selecionado.');
    leitor.readAsText(arquivo);
  },

  fecharQR() {
    const area = document.getElementById('ambiente-qr-area');
    if (area) area.hidden = true;
  }
};

document.addEventListener('DOMContentLoaded', () => EnvironmentModule.init());
