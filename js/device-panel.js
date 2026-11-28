/**
 * Ficha digital do dispositivo identificado por QR Code.
 * Interface funcional com dados locais existentes; preparada para receber a API SMUP.
 * Não inventa telemetria nem certificados ausentes.
 */
const DevicePanelModule = {
  equipamento: null,
  pagina: 0,
  paginas: [
    { id: 'resumo', nome: 'Resumo', icone: '▦' },
    { id: 'monitoramento', nome: 'Monitoramento', icone: '◉' },
    { id: 'graficos', nome: 'Gráficos', icone: '⌁' },
    { id: 'notificacoes', nome: 'Notificações', icone: '♧' },
    { id: 'calibracao', nome: 'Calibração', icone: '▤' },
    { id: 'localizacao', nome: 'Localização', icone: '⌖' }
  ],

  valor(obj, chaves) {
    for (const chave of chaves) {
      const partes = chave.split('.');
      let atual = obj;
      for (const parte of partes) atual = atual && atual[parte];
      if (atual !== undefined && atual !== null && atual !== '') return atual;
    }
    return null;
  },

  texto(valor, fallback = 'Não informado') {
    if (valor === undefined || valor === null || valor === '') return fallback;
    if (typeof valor === 'object') return fallback;
    return String(valor);
  },

  abrir(equipamento) {
    if (!equipamento) return false;
    this.equipamento = equipamento;
    this.pagina = 0;
    if (typeof QRScannerModule !== 'undefined') QRScannerModule.pararLoop();
    const toast = document.getElementById('toast-info');
    if (toast) toast.style.display = 'none';
    const overlay = document.getElementById('device-detail-overlay');
    if (!overlay) return false;
    overlay.hidden = false;
    document.body.classList.add('device-detail-open');
    const nome = equipamento.nome || equipamento.id || 'Dispositivo SMUP';
    document.getElementById('device-detail-title').textContent = nome;
    const ambiente = typeof State !== 'undefined' ? State.obterAmbienteAtual() : null;
    document.getElementById('device-detail-subtitle').textContent =
      [equipamento.tipo, equipamento.id ? 'ID: ' + equipamento.id : '', equipamento.setor, ambiente && ambiente.unidade].filter(Boolean).join(' · ');
    const status = document.getElementById('device-detail-live-status');
    status.textContent = equipamento.tipoIdentificadoAutomaticamente && equipamento.identificacaoIndividualDisponivel === false
      ? 'Tipo reconhecido automaticamente · falta identificar esta unidade individualmente'
      : (equipamento.dadosVinculados === false ? 'QR reconhecido · cadastro ainda não vinculado' : (this.valor(equipamento, ['status', 'estado', 'monitoramento.status']) || 'Identificado pelo QR Code'));
    this.renderizar();
    return true;
  },

  fechar() {
    const overlay = document.getElementById('device-detail-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('device-detail-open');
    this.equipamento = null;
    if (typeof QRScannerModule !== 'undefined') QRScannerModule.iniciarLoop();
  },

  anterior() { this.irPara(Math.max(0, this.pagina - 1)); },
  proxima() { this.irPara(Math.min(this.paginas.length - 1, this.pagina + 1)); },
  irPara(indice) {
    this.pagina = Math.max(0, Math.min(this.paginas.length - 1, indice));
    this.renderizar();
  },

  criarLinha(rotulo, valor) {
    const linha = document.createElement('div');
    linha.className = 'device-detail-row';
    const label = document.createElement('span');
    label.textContent = rotulo;
    const dado = document.createElement('strong');
    dado.textContent = this.texto(valor);
    linha.append(label, dado);
    return linha;
  },

  criarAviso(texto) {
    const aviso = document.createElement('p');
    aviso.className = 'device-detail-empty';
    aviso.textContent = texto;
    return aviso;
  },

  urlSegura(valor) {
    if (!valor || typeof valor !== 'string') return null;
    try {
      const url = new URL(valor, window.location.href);
      return url.protocol === 'https:' ? url.href : null;
    } catch (_) { return null; }
  },

  renderizar() {
    const eq = this.equipamento;
    if (!eq) return;
    const pagina = this.paginas[this.pagina];
    const tabs = document.getElementById('device-detail-tabs');
    const conteudo = document.getElementById('device-detail-content');
    tabs.replaceChildren();
    this.paginas.forEach((item, indice) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = indice === this.pagina ? 'ativa' : '';
      botao.textContent = item.icone + ' ' + item.nome;
      botao.setAttribute('aria-current', indice === this.pagina ? 'page' : 'false');
      botao.addEventListener('click', () => this.irPara(indice));
      tabs.appendChild(botao);
    });
    conteudo.replaceChildren();
    const titulo = document.createElement('h3');
    titulo.textContent = pagina.nome;
    conteudo.appendChild(titulo);

    if (pagina.id === 'resumo') {
      const dados = [
        ['Nome', eq.nome], ['Identificador único', eq.id], ['Tipo', eq.tipo],
        ['Cliente', eq.cliente], ['Unidade', eq.unidade], ['Prédio / andar', eq.andar],
        ['Setor', eq.setor], ['Ambiente', eq.ambiente || eq.local]
      ];
      dados.forEach(([rotulo, valor]) => conteudo.appendChild(this.criarLinha(rotulo, valor)));
    } else if (pagina.id === 'monitoramento') {
      const dados = [
        ['Temperatura', this.valor(eq, ['temperaturaAtual', 'temperatura', 'monitoramento.temperatura'])],
        ['Umidade', this.valor(eq, ['umidadeAtual', 'umidade', 'monitoramento.umidade'])],
        ['Mínima', this.valor(eq, ['minima', 'temperaturaMinima', 'monitoramento.minima'])],
        ['Média', this.valor(eq, ['media', 'temperaturaMedia', 'monitoramento.media'])],
        ['Máxima', this.valor(eq, ['maxima', 'temperaturaMaxima', 'monitoramento.maxima'])],
        ['Sinal / comunicação', this.valor(eq, ['sinal', 'comunicacao', 'monitoramento.sinal'])],
        ['Última atualização', this.valor(eq, ['ultimaAtualizacao', 'atualizadoEm', 'monitoramento.ultimaAtualizacao'])]
      ];
      const disponiveis = dados.filter(([, valor]) => valor !== null);
      if (!disponiveis.length) conteudo.appendChild(this.criarAviso('Os dados de monitoramento serão carregados quando a integração com a API da Nuvem SMUP estiver disponível.'));
      else disponiveis.forEach(([rotulo, valor]) => conteudo.appendChild(this.criarLinha(rotulo, valor)));
    } else if (pagina.id === 'graficos') {
      conteudo.appendChild(this.criarAviso('Os gráficos históricos serão conectados à mesma fonte de dados do smuPweb. Ainda não há histórico/API disponível neste cadastro local.'));
    } else if (pagina.id === 'notificacoes') {
      const alertas = this.valor(eq, ['notificacoes', 'alertas', 'alarmas']);
      if (!Array.isArray(alertas) || !alertas.length) {
        conteudo.appendChild(this.criarAviso('Nenhuma notificação foi disponibilizada para este dispositivo. A consulta de alarmes depende da integração com a Nuvem SMUP.'));
      } else {
        alertas.forEach(alerta => {
          const item = document.createElement('div');
          item.className = 'device-detail-alert';
          item.textContent = typeof alerta === 'string' ? alerta : [alerta.tipo, alerta.data, alerta.hora, alerta.descricao].filter(Boolean).join(' · ');
          conteudo.appendChild(item);
        });
      }
    } else if (pagina.id === 'calibracao') {
      const certificado = this.valor(eq, ['certificadoCalibracao', 'certificado', 'calibracao']);
      const registro = certificado && typeof certificado === 'object' ? certificado : {};
      const certificadoDireto = typeof certificado === 'string' ? certificado : null;
      const dados = [
        ['Número do certificado', this.valor(registro, ['numero', 'numeroCertificado']) || this.valor(eq, ['numeroCertificado'])],
        ['Laboratório responsável', this.valor(registro, ['laboratorio', 'responsavel']) || this.valor(eq, ['laboratorioCalibracao'])],
        ['Data da calibração', this.valor(registro, ['data', 'dataCalibracao']) || this.valor(eq, ['dataCalibracao'])],
        ['Validade / próxima calibração', this.valor(registro, ['validade', 'proximaCalibracao']) || this.valor(eq, ['validadeCalibracao'])]
      ];
      dados.forEach(([rotulo, valor]) => conteudo.appendChild(this.criarLinha(rotulo, valor)));
      const url = this.urlSegura(certificadoDireto || this.valor(registro, ['url', 'arquivo', 'pdf']) || this.valor(eq, ['certificadoUrl', 'certificadoPDF']));
      if (url) {
        const link = document.createElement('a');
        link.className = 'device-detail-document';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Abrir certificado de calibração (PDF)';
        conteudo.appendChild(link);
      } else {
        conteudo.appendChild(this.criarAviso('O certificado ainda não está anexado a este cadastro. Quando a SMUP disponibilizar o documento ou sua URL oficial, ele aparecerá aqui.'));
      }
    } else if (pagina.id === 'localizacao') {
      [
        ['Cliente', eq.cliente], ['Unidade', eq.unidade], ['Andar', eq.andar],
        ['Setor', eq.setor], ['Ambiente', eq.ambiente || eq.local],
        ['Posição X (m)', eq.posicionado !== false ? eq.x : null],
        ['Posição Z (m)', eq.posicionado !== false ? eq.z : null]
      ].forEach(([rotulo, valor]) => conteudo.appendChild(this.criarLinha(rotulo, valor)));
      if (eq.posicionado !== false) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'device-detail-primary';
        botao.textContent = 'Mostrar na planta e orientar até aqui';
        botao.addEventListener('click', () => {
          this.fechar();
          if (typeof ScannerModule !== 'undefined') ScannerModule.selecionar(eq.id);
        });
        conteudo.appendChild(botao);
      } else {
        conteudo.appendChild(this.criarAviso('Este dispositivo ainda não possui posição cadastrada na planta.'));
      }
    }

    document.getElementById('device-detail-page-count').textContent = (this.pagina + 1) + ' / ' + this.paginas.length;
    document.getElementById('device-detail-prev').disabled = this.pagina === 0;
    document.getElementById('device-detail-next').disabled = this.pagina === this.paginas.length - 1;
  }
};

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && DevicePanelModule.equipamento) DevicePanelModule.fechar();
});
