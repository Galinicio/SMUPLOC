/**
 * State Manager — ambientes isolados e preparados para futura sincronização via API.
 * Nesta etapa, os dados permanecem neste navegador. Exportar/importar permite
 * transportar um cadastro entre dispositivos até a integração com o backend.
 */
const State = {
  STORAGE_KEYS: {
    ambientes: 'smuploc_ambientes_v1',
    ambienteAtual: 'smuploc_ambiente_atual_v1',
    equipamentos: 'smuploc_eqs',
    cantos: 'smuploc_cantos_mp',
    planta: 'smuploc_planta_img',
    escala: 'smuploc_escala_mapa'
  },

  perfilAtual: 'cliente',
  ambientes: [],
  ambienteAtualId: null,
  equipamentos: [],
  posicaoUsuario: null,
  destinoId: null,
  cantosMapear: [],
  plantaImageBase64: null,
  imgPlantaObj: new Image(),

  gerarId(prefixo = 'amb') {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return prefixo + '_' + uuid;
  },

  lerJSONSeguro(chave, valorPadrao) {
    try {
      const valor = localStorage.getItem(chave);
      return valor ? JSON.parse(valor) : valorPadrao;
    } catch (erro) {
      console.warn(`SMUPLOC: não foi possível ler "${chave}".`, erro);
      return valorPadrao;
    }
  },

  salvarLocal(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
      return true;
    } catch (erro) {
      console.error(`SMUPLOC: não foi possível salvar "${chave}".`, erro);
      alert('Não foi possível salvar os dados neste dispositivo. Verifique o espaço disponível no navegador.');
      return false;
    }
  },

  criarRegistroAmbiente(dados = {}) {
    return {
      id: String(dados.id || this.gerarId()).slice(0, 120),
      nome: String(dados.nome || 'Novo ambiente').slice(0, 100),
      cliente: String(dados.cliente || '').slice(0, 100),
      unidade: String(dados.unidade || '').slice(0, 100),
      andar: String(dados.andar || '').slice(0, 60),
      setor: String(dados.setor || '').slice(0, 100),
      codigoQr: String(dados.codigoQr || this.gerarId('smuploc')).slice(0, 160),
      equipamentos: Array.isArray(dados.equipamentos) ? dados.equipamentos : [],
      posicaoUsuario: dados.posicaoUsuario && Number.isFinite(Number(dados.posicaoUsuario.x)) && Number.isFinite(Number(dados.posicaoUsuario.z)) ? { x: Number(dados.posicaoUsuario.x), z: Number(dados.posicaoUsuario.z) } : null,
      destinoId: dados.destinoId ? String(dados.destinoId).slice(0, 180) : null,
      cantos: Array.isArray(dados.cantos) ? dados.cantos : [],
      planta: typeof dados.planta === 'string' && dados.planta.startsWith('data:image/') ? dados.planta : null,
      escala: Number.isFinite(Number(dados.escala)) && Number(dados.escala) >= 4 && Number(dados.escala) <= 100
        ? Number(dados.escala) : 22,
      atualizadoEm: dados.atualizadoEm || new Date().toISOString()
    };
  },

  init() {
    const ambientesSalvos = this.lerJSONSeguro(this.STORAGE_KEYS.ambientes, null);
    if (Array.isArray(ambientesSalvos) && ambientesSalvos.length) {
      this.ambientes = ambientesSalvos
        .filter(item => item && typeof item === 'object')
        .map(item => this.criarRegistroAmbiente(item));
    } else {
      // Migração sem perda do cadastro antigo de um único mapa.
      const equipamentos = this.lerJSONSeguro(this.STORAGE_KEYS.equipamentos, []);
      const cantos = this.lerJSONSeguro(this.STORAGE_KEYS.cantos, []);
      let planta = null;
      try { planta = localStorage.getItem(this.STORAGE_KEYS.planta) || null; } catch (erro) {}
      let escala = 22;
      try {
        const valor = Number(localStorage.getItem(this.STORAGE_KEYS.escala));
        if (Number.isFinite(valor) && valor >= 4 && valor <= 100) escala = valor;
      } catch (erro) {}
      this.ambientes = [this.criarRegistroAmbiente({
        nome: 'Ambiente migrado',
        equipamentos: Array.isArray(equipamentos) ? equipamentos : [],
        cantos: Array.isArray(cantos) ? cantos : [],
        planta,
        escala
      })];
      this.ambienteAtualId = this.ambientes[0].id;
      this.salvarAmbientes();
    }

    const idSalvo = this.lerJSONSeguro(this.STORAGE_KEYS.ambienteAtual, null);
    this.ambienteAtualId = this.ambientes.some(item => item.id === idSalvo)
      ? idSalvo : this.ambientes[0].id;
    this.ativarAmbiente(this.ambienteAtualId, false);
    this.setPerfil(this.perfilAtual);
  },

  obterAmbienteAtual() {
    return this.ambientes.find(item => item.id === this.ambienteAtualId) || null;
  },

  salvarAmbientes() {
    return this.salvarLocal(this.STORAGE_KEYS.ambientes, JSON.stringify(this.ambientes));
  },

  sincronizarAmbienteAtual() {
    const ambiente = this.obterAmbienteAtual();
    if (!ambiente) return false;
    ambiente.equipamentos = this.equipamentos;
    ambiente.posicaoUsuario = this.posicaoUsuario || null;
    ambiente.destinoId = this.destinoId || null;
    ambiente.cantos = this.cantosMapear;
    ambiente.planta = this.plantaImageBase64;
    ambiente.escala = (typeof MapearModule !== 'undefined' && MapearModule.escalaPxPorMetro) || ambiente.escala || 22;
    ambiente.atualizadoEm = new Date().toISOString();
    return this.salvarAmbientes();
  },

  ativarAmbiente(id, persistir = true) {
    const ambiente = this.ambientes.find(item => item.id === id);
    if (!ambiente) return false;
    this.ambienteAtualId = ambiente.id;
    this.equipamentos = ambiente.equipamentos.filter(eq => eq && typeof eq === 'object');
    this.posicaoUsuario = ambiente.posicaoUsuario || null;
    this.destinoId = ambiente.destinoId || null;
    this.cantosMapear = ambiente.cantos.filter(p => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.z)));
    this.plantaImageBase64 = ambiente.planta || null;

    if (typeof MapearModule !== 'undefined') MapearModule.escalaPxPorMetro = ambiente.escala || 22;

    this.imgPlantaObj.onload = () => {
      if (typeof MinimapModule !== 'undefined') {
        MinimapModule.renderPequeno();
        MinimapModule.renderExpandido();
      }
    };
    this.imgPlantaObj.onerror = () => {
      console.warn('SMUPLOC: a planta deste ambiente não pôde ser carregada.');
    };
    if (this.plantaImageBase64) this.imgPlantaObj.src = this.plantaImageBase64;
    else this.imgPlantaObj.removeAttribute('src');

    if (persistir) {
      this.salvarLocal(this.STORAGE_KEYS.ambienteAtual, JSON.stringify(this.ambienteAtualId));
      this.sincronizarAmbienteAtual();
    }

    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderPequeno();
      MinimapModule.renderExpandido();
    }
    if (typeof EnvironmentModule !== 'undefined') EnvironmentModule.atualizarSeletor();
    return true;
  },

  criarAmbiente(dados) {
    const ambiente = this.criarRegistroAmbiente(dados);
    if (this.ambientes.some(item => item.id === ambiente.id)) {
      alert('Já existe um ambiente com este identificador.');
      return null;
    }
    this.sincronizarAmbienteAtual();
    this.ambientes.push(ambiente);
    if (!this.salvarAmbientes()) {
      this.ambientes.pop();
      return null;
    }
    this.ativarAmbiente(ambiente.id);
    return ambiente;
  },

  importarAmbiente(dados) {
    if (!dados || typeof dados !== 'object' || dados.formato !== 'SMUPLOC_ENVIRONMENT' || dados.versao !== 1 || !dados.ambiente) {
      alert('Arquivo inválido. Selecione uma exportação de ambiente SMUPLOC.');
      return false;
    }
    const ambiente = this.criarRegistroAmbiente(dados.ambiente);
    if (this.ambientes.some(item => item.id === ambiente.id)) {
      const substituir = confirm('Este ambiente já existe neste dispositivo. Deseja substituir os dados locais por esta versão importada?');
      if (!substituir) return false;
      const indice = this.ambientes.findIndex(item => item.id === ambiente.id);
      const anterior = this.ambientes[indice];
      this.ambientes[indice] = ambiente;
      if (!this.salvarAmbientes()) {
        this.ambientes[indice] = anterior;
        return false;
      }
    } else {
      this.sincronizarAmbienteAtual();
      this.ambientes.push(ambiente);
      if (!this.salvarAmbientes()) {
        this.ambientes.pop();
        return false;
      }
    }
    this.ativarAmbiente(ambiente.id);
    return true;
  },

  setPerfil(novoPerfil) {
    const perfisPermitidos = ['admin', 'tecnico', 'cliente'];
    this.perfilAtual = perfisPermitidos.includes(novoPerfil) ? novoPerfil : 'cliente';
    const textoModo = document.getElementById('texto-modo-perfil');
    const controlesAdmin = document.getElementById('controles-admin');
    const seletor = document.getElementById('perfil-select');
    const nomes = {
      admin: 'ADMINISTRADOR (LOCAL)',
      tecnico: 'TÉCNICO',
      cliente: 'CLIENTE (LEITURA)'
    };
    if (textoModo) textoModo.textContent = `Modo: ${nomes[this.perfilAtual]}`;
    if (controlesAdmin) controlesAdmin.style.display = this.perfilAtual === 'admin' ? 'flex' : 'none';
    if (seletor && seletor.value !== this.perfilAtual) seletor.value = this.perfilAtual;
    if (typeof MinimapModule !== 'undefined') MinimapModule.renderExpandido();
  },

  salvarEquipamentos() {
    const ambiente = this.obterAmbienteAtual();
    if (!ambiente) return false;
    ambiente.equipamentos = this.equipamentos;
    return this.sincronizarAmbienteAtual();
  },

  adicionarEquipamento(eq) {
    if (!eq || typeof eq !== 'object' || !String(eq.id || '').trim()) return false;
    const id = String(eq.id).trim();
    if (this.equipamentos.some(item => String(item.id || '') === id)) return false;
    this.equipamentos.push({ ...eq, id, ambienteId: this.ambienteAtualId });
    if (!this.salvarEquipamentos()) {
      this.equipamentos.pop();
      return false;
    }
    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderPequeno();
      MinimapModule.renderExpandido();
    }
    return true;
  },

  salvarCantos(cantos) {
    if (!Array.isArray(cantos)) return false;
    const pontos = cantos.filter(p => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.z)));
    this.cantosMapear = pontos;
    return this.sincronizarAmbienteAtual();
  },

  salvarPlantaImage(base64) {
    if (typeof base64 !== 'string' || !base64.startsWith('data:image/')) return false;
    this.plantaImageBase64 = base64;
    const salvo = this.sincronizarAmbienteAtual();
    if (!salvo) return false;
    this.imgPlantaObj.onload = () => {
      if (typeof MinimapModule !== 'undefined') {
        MinimapModule.renderPequeno();
        MinimapModule.renderExpandido();
      }
    };
    this.imgPlantaObj.src = base64;
    return true;
  },

  limparTudo() {
    if (this.perfilAtual !== 'admin') {
      alert('Ação disponível apenas no modo administrador local.');
      return false;
    }
    const confirmado = confirm('Isso apagará TODOS os ambientes e equipamentos salvos neste navegador. Deseja continuar?');
    if (!confirmado) return false;

    this.ambientes = [];
    this.equipamentos = [];
  posicaoUsuario: null,
  destinoId: null,
    this.cantosMapear = [];
    this.plantaImageBase64 = null;
    this.ambienteAtualId = null;
    this.imgPlantaObj.onload = null;
    this.imgPlantaObj.onerror = null;
    this.imgPlantaObj.removeAttribute('src');
    Object.values(this.STORAGE_KEYS).forEach(chave => {
      try { localStorage.removeItem(chave); } catch (erro) {
        console.warn(`SMUPLOC: não foi possível remover "${chave}".`, erro);
      }
    });
    if (typeof MapearModule !== 'undefined') {
      MapearModule.escalaPxPorMetro = 22;
      MapearModule.pontosAnteriores = [];
      MapearModule.atualizarInstrucoes();
    }
    const input = document.getElementById('input-planta');
    if (input) input.value = '';
    const novo = this.criarRegistroAmbiente({ nome: 'Novo ambiente' });
    this.ambientes = [novo];
    this.ativarAmbiente(novo.id);
    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderPequeno();
      MinimapModule.renderExpandido();
    }
    alert('Ambientes locais apagados. Um novo ambiente vazio foi criado.');
    return true;
  }
};

State.init();
