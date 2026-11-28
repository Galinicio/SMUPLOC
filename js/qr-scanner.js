/**
 * QR Scanner — leitura controlada e apresentação segura dos dados.
 */
const QRScannerModule = {
  timerToast: null,
  timerLoop: null,
  executando: false,
  processando: false,
  ultimoPayload: '',
  ultimaLeituraEm: 0,
  trilhaFocoConfigurada: null,

  detectarAssinaturaSmup(payload) {
    return typeof DeviceSignatures !== 'undefined'
      ? DeviceSignatures.detectar(payload)
      : null;
  

  configurarCamera() {
    const video = document.querySelector('a-scene video') || document.querySelector('video');
    if (!video) return false;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.playsInline = true;
    const track = video.srcObject && video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks()[0] : null;
    if (track && this.trilhaFocoConfigurada !== track) {
      this.trilhaFocoConfigurada = track;
      track.applyConstraints({
        advanced: [
          { focusMode: 'continuous' },
          { exposureMode: 'continuous' },
          { whiteBalanceMode: 'continuous' }
        ]
      }).catch(() => {});
    }
    return !!track;
  },

  async tentarFoco() {
    const video = document.querySelector('a-scene video') || document.querySelector('video');
    const track = video && video.srcObject && video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks()[0] : null;
    if (!track) {
      alert('A câmera ainda está iniciando. Aguarde um instante e tente novamente.');
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
      setTimeout(() => {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      }, 900);
      const body = document.getElementById('toast-body');
      if (body) body.textContent = 'Ajuste de foco solicitado à câmera.';
    } catch (erro) {
      alert('Este celular não permite controlar o foco pelo navegador. Tente aproximar ou afastar um pouco o QR Code.');
    }
  },

  iniciarLoop() {
    if (this.executando) return;
    this.executando = true;
    this.configurarCamera();
    this.agendarLeitura();
  },

  pararLoop() {
    this.executando = false;
    if (this.timerLoop) {
      clearTimeout(this.timerLoop);
      this.timerLoop = null;
    }
  },

  agendarLeitura() {
    if (!this.executando) return;

    this.timerLoop = setTimeout(() => {
      this.lerFrame();
      this.agendarLeitura();
    }, 160);
  },

  lerFrame() {
    if (this.processando || document.hidden) return;

    const video = document.querySelector('video');
    const canvas = document.getElementById('qr-canvas');

    if (
      !video ||
      !canvas ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight ||
      typeof jsQR !== 'function'
    ) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    this.processando = true;

    try {
      // Reduz a resolução de análise para diminuir o custo por quadro.
      this.configurarCamera();
      const limite = 960;
      const proporcao = Math.min(1, limite / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * proporcao));
      canvas.height = Math.max(1, Math.round(video.videoHeight * proporcao));

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data) {
        const payload = String(code.data).trim();
        const agora = Date.now();

        // Evita reprocessar a mesma etiqueta em todos os frames.
        if (payload && (payload !== this.ultimoPayload || agora - this.ultimaLeituraEm > 3000)) {
          this.ultimoPayload = payload;
          this.ultimaLeituraEm = agora;
          this.processarPayload(payload);
        }
      }
    } catch (erro) {
      console.error('SMUPLOC: falha ao analisar quadro do QR Code.', erro);
    } finally {
      this.processando = false;
    }
  },

  processarPayload(payload) {
    if (typeof SpatialAnchors !== 'undefined' && SpatialAnchors.reconhecer(payload)) {
      const toastInfo = document.getElementById('toast-info');
      const toastTitle = document.getElementById('toast-title');
      const toastBody = document.getElementById('toast-body');
      if (toastTitle) toastTitle.textContent = 'REFERÊNCIA ESPACIAL RECONHECIDA';
      if (toastBody) toastBody.textContent = 'Posição do técnico corrigida usando as coordenadas cadastradas deste equipamento.';
      if (toastInfo) {
        toastInfo.style.display = 'block';
        clearTimeout(this.timerToast);
        this.timerToast = setTimeout(() => { toastInfo.style.display = 'none'; }, 4000);
      }
      return;
    }
    const texto = (valor, limite = 180) => {
      if (valor === null || valor === undefined) return '';
      if (typeof valor === 'object') return '';
      return String(valor).slice(0, limite);
    };

    const payloadSeguro = texto(payload, 500);
    // QR de ambiente é tratado como referência espacial, não como etiqueta de equipamento.
    try {
      const dadosQr = JSON.parse(payloadSeguro);
      if (dadosQr && dadosQr.type === 'smuploc-environment') {
        if (typeof EnvironmentModule !== 'undefined' && EnvironmentModule.ativarPorQr(dadosQr)) return;
      }
    } catch (erro) {
      // QR legado ou texto simples: segue o fluxo de identificação de equipamento.
    }

    let tituloQr = 'DISPOSITIVO IDENTIFICADO';
    let detalheQr = 'QR Code reconhecido. Consultando cadastro local.';
    let idLido = payloadSeguro;
    let dadosQr = null;

    try {
      const parsed = JSON.parse(payloadSeguro);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        dadosQr = parsed;
        const dispositivo = parsed.dispositivo || parsed.device || parsed.objeto || parsed.object || parsed;
        idLido = texto(
          dispositivo.id || dispositivo.uuid || dispositivo.codigo || dispositivo.codigoUnico ||
          dispositivo.serial || dispositivo.numeroSerie || dispositivo.tag || dispositivo.deviceId ||
          dispositivo.objectId || parsed.id || parsed.tag || payloadSeguro, 180
        );
        tituloQr = texto(dispositivo.nome || dispositivo.name || dispositivo.tag || dispositivo.codigo, 100) || 'DISPOSITIVO SMUP';
        detalheQr = 'Identificador: ' + idLido;
      } else {
        tituloQr = payloadSeguro.slice(0, 100) || 'DISPOSITIVO SMUP';
      }
    } catch (erro) {
      // QR simples: o próprio conteúdo é usado como identificador.
      try {
        const url = new URL(payloadSeguro);
        const partes = url.pathname.split('/').filter(Boolean);
        if (partes.length) idLido = decodeURIComponent(partes[partes.length - 1]).slice(0, 180);
      } catch (_) {}
      tituloQr = idLido.slice(0, 100) || 'DISPOSITIVO SMUP';
      detalheQr = 'Identificador lido: ' + idLido;
    }

    const assinaturaSmup = this.detectarAssinaturaSmup(payloadSeguro);
    if (assinaturaSmup) {
      tituloQr = assinaturaSmup.tipo + ' IDENTIFICADA';
      detalheQr = assinaturaSmup.identificacaoIndividual
        ? 'Tipo reconhecido automaticamente pela assinatura do QR Code.'
        : 'Tipo reconhecido; falta um identificador individual para vincular esta unidade.';
    }

    const normalizar = valor => String(valor || '').trim().toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
    const equipamentoEncontrado = Array.isArray(State.equipamentos) &&
      State.equipamentos.find(eq => {
        const candidatos = [eq.id, eq.uuid, eq.codigo, eq.codigoUnico, eq.serial, eq.numeroSerie, eq.tag, eq.deviceId, eq.objectId, eq.nome, eq.name];
        const alvo = normalizar(idLido);
        return candidatos.some(valor => normalizar(valor) === alvo);
      });

    // Todo QR de dispositivo abre a ficha principal. Se ainda não houver vínculo
    // com o inventário local, a ficha deixa isso explícito em vez de cair no toast.
    if (typeof DevicePanelModule !== 'undefined') {
      const equipamentoFicha = equipamentoEncontrado || {
        id: assinaturaSmup && assinaturaSmup.conteudoSensivel ? '' : idLido,
        nome: assinaturaSmup ? assinaturaSmup.tipo + ' identificada' : tituloQr,
        tipo: assinaturaSmup ? assinaturaSmup.tipo : 'Dispositivo identificado por QR',
        modelo: assinaturaSmup && assinaturaSmup.modelo ? assinaturaSmup.modelo : undefined,
        informacaoEletrica: assinaturaSmup && assinaturaSmup.informacaoEletrica ? assinaturaSmup.informacaoEletrica : undefined,
        assinaturaQr: assinaturaSmup ? assinaturaSmup.assinatura : undefined,
        tipoIdentificadoAutomaticamente: !!assinaturaSmup,
        identificacaoIndividualDisponivel: !!(assinaturaSmup && assinaturaSmup.identificacaoIndividual),
        // Não guardar a senha do Access Point como ID nem exibi-la na ficha.
        qrPayload: assinaturaSmup && assinaturaSmup.conteudoSensivel ? '' : payloadSeguro,
        qrPayloadSensivel: !!(assinaturaSmup && assinaturaSmup.conteudoSensivel),
        qrIdentificado: true,
        dadosVinculados: false
      };
      if (!equipamentoFicha.qrPayload && !(assinaturaSmup && assinaturaSmup.conteudoSensivel)) {
        equipamentoFicha.qrPayload = payloadSeguro;
      }
      equipamentoFicha.dadosVinculados = !!equipamentoEncontrado;
      DevicePanelModule.abrir(equipamentoFicha);
      return;
    }

    const toastInfo = document.getElementById('toast-info');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastActionDiv = document.getElementById('toast-action');

    // Dados vindos do QR são texto puro, nunca HTML.
    if (toastTitle) toastTitle.textContent = tituloQr;
    if (toastBody) toastBody.textContent = detalheQr;

    const jaCadastrado = Array.isArray(State.equipamentos) &&
      State.equipamentos.some(eq =>
        String(eq.id || '') === idLido || String(eq.nome || '') === idLido
      );

    const equipamentoEncontradoFallback = Array.isArray(State.equipamentos) &&
      State.equipamentos.find(eq => String(eq.id || '') === idLido || String(eq.nome || '') === idLido);
    if (equipamentoEncontradoFallback && typeof DevicePanelModule !== 'undefined') {
      clearTimeout(this.timerToast);
      if (toastInfo) toastInfo.style.display = 'none';
      DevicePanelModule.abrir(equipamentoEncontradoFallback);
      return;
    }

    if (toastActionDiv) {
      toastActionDiv.replaceChildren();

      if (jaCadastrado) {
        toastActionDiv.textContent = 'Cadastrado no mapa';
      } else if (State.perfilAtual === 'cliente') {
        toastActionDiv.textContent = 'Etiqueta identificada — cadastro restrito';
      } else {
        const botaoCadastro = document.createElement('button');
        botaoCadastro.type = 'button';
        botaoCadastro.className = 'btn-cadastrar-qr';
        botaoCadastro.textContent = 'Cadastrar equipamento';
        botaoCadastro.addEventListener('click', () => this.cadastrarPrompt(payloadSeguro), { once: true });
        toastActionDiv.appendChild(botaoCadastro);
      }
    }

    if (toastInfo) {
      toastInfo.style.display = 'block';
      clearTimeout(this.timerToast);
      this.timerToast = setTimeout(() => {
        toastInfo.style.display = 'none';
      }, 4000);
    }

    const arBody = document.getElementById('ar-card-body');
    if (arBody) {
      arBody.setAttribute(
        'value',
        `TAG: ${payloadSeguro}\n--------------------\nIDENTIFICAÇÃO: LIDA\nCOMUNICAÇÃO: NÃO VERIFICADA`
      );
    }
  },

  cadastrarPrompt(payload) {
    if (State.perfilAtual === 'cliente') {
      alert('O modo cliente não pode cadastrar equipamentos.');
      return;
    }

    let dados = {};
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) dados = parsed;
    } catch (erro) {
      // QR Code simples: o próprio texto é o identificador.
    }

    const id = String(dados.id || dados.tag || payload || '').trim().slice(0, 180);
    if (!id) return;

    const nomePadrao = String(dados.nome || dados.tag || id).slice(0, 100);
    const nomeCurto = (prompt('Digite o nome deste equipamento:', nomePadrao) || '').trim();
    if (!nomeCurto) return;

    const tipoInformado = (prompt('Tipo de Equipamento (UR, UC normal, UC HYB, US, PT100):', 'UR') || 'UR')
      .trim().toUpperCase();
    const tiposPermitidos = ['UR', 'UC', 'UC HYB', 'US', 'PT100'];
    const tipo = tiposPermitidos.includes(tipoInformado) ? tipoInformado : 'UR';

    const setor = (prompt('Setor / ambiente (opcional):', '') || '').trim().slice(0, 100);

    const novoEq = {
      id,
      nome: nomeCurto.slice(0, 100),
      setor,
      tipo,
      // Não inventa coordenadas: o equipamento precisa ser posicionado na planta.
      x: 0,
      z: 0,
      posicionado: false,
      cor: (tipo === 'UC' || tipo === 'UC HYB') ? '#0052cc' : '#ffc107'
    };

    if (!State.adicionarEquipamento(novoEq)) {
      alert('Este equipamento já está cadastrado ou não foi possível salvar.');
      return;
    }

    MinimapModule.equipamentoAguardandoPosicao = novoEq;
    MinimapModule.abrirModal();
    alert('Equipamento cadastrado. Toque no local correto da planta para posicioná-lo.');
    const toastActionDiv = document.getElementById('toast-action');
    if (toastActionDiv) toastActionDiv.textContent = 'Cadastrado — toque na planta para posicionar';
  }
};
