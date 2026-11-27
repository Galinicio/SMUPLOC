/**
 * State Manager — fonte única dos dados locais do SMUPLOC.
 *
 * IMPORTANTE: perfis neste frontend controlam apenas a interface.
 * Autorização real exige validação em um backend.
 */
const State = {
  STORAGE_KEYS: {
    equipamentos: 'smuploc_eqs',
    cantos: 'smuploc_cantos_mp',
    planta: 'smuploc_planta_img'
  },

  perfilAtual: 'cliente',
  equipamentos: [],
  cantosMapear: [],
  plantaImageBase64: null,
  imgPlantaObj: new Image(),

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

  init() {
    const equipamentos = this.lerJSONSeguro(this.STORAGE_KEYS.equipamentos, []);
    const cantos = this.lerJSONSeguro(this.STORAGE_KEYS.cantos, []);

    this.equipamentos = Array.isArray(equipamentos)
      ? equipamentos.filter(eq => eq && typeof eq === 'object')
      : [];

    this.cantosMapear = Array.isArray(cantos)
      ? cantos.filter(ponto =>
          ponto &&
          Number.isFinite(Number(ponto.x)) &&
          Number.isFinite(Number(ponto.z))
        )
      : [];

    try {
      this.plantaImageBase64 = localStorage.getItem(this.STORAGE_KEYS.planta) || null;
    } catch (erro) {
      console.warn('SMUPLOC: não foi possível recuperar a planta salva.', erro);
      this.plantaImageBase64 = null;
    }

    if (this.plantaImageBase64) {
      this.imgPlantaObj.onload = () => {
        if (typeof MinimapModule !== 'undefined') {
          MinimapModule.renderPequeno();
          MinimapModule.renderExpandido();
        }
      };
      this.imgPlantaObj.src = this.plantaImageBase64;
    }

    this.setPerfil(this.perfilAtual);
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

    if (textoModo) {
      textoModo.textContent = `Modo: ${nomes[this.perfilAtual]}`;
    }

    if (controlesAdmin) {
      controlesAdmin.style.display = this.perfilAtual === 'admin' ? 'flex' : 'none';
    }

    if (seletor && seletor.value !== this.perfilAtual) {
      seletor.value = this.perfilAtual;
    }

    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderExpandido();
    }
  },

  salvarEquipamentos() {
    return this.salvarLocal(
      this.STORAGE_KEYS.equipamentos,
      JSON.stringify(this.equipamentos)
    );
  },

  adicionarEquipamento(eq) {
    if (!eq || typeof eq !== 'object' || !String(eq.id || '').trim()) {
      return false;
    }

    const id = String(eq.id).trim();
    const duplicado = this.equipamentos.some(item => String(item.id || '') === id);
    if (duplicado) return false;

    this.equipamentos.push({ ...eq, id });
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

    const pontosValidos = cantos.filter(ponto =>
      ponto &&
      Number.isFinite(Number(ponto.x)) &&
      Number.isFinite(Number(ponto.z))
    );

    if (!this.salvarLocal(this.STORAGE_KEYS.cantos, JSON.stringify(pontosValidos))) {
      return false;
    }

    this.cantosMapear = pontosValidos;
    return true;
  },

  salvarPlantaImage(base64) {
    if (typeof base64 !== 'string' || !base64.startsWith('data:image/')) {
      return false;
    }

    if (!this.salvarLocal(this.STORAGE_KEYS.planta, base64)) return false;

    this.plantaImageBase64 = base64;
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

    const confirmado = confirm('Isso apagará equipamentos, cantos e a planta salva neste navegador. Deseja continuar?');
    if (!confirmado) return false;

    this.equipamentos = [];
    this.cantosMapear = [];
    this.plantaImageBase64 = null;
    this.imgPlantaObj.onload = null;
    this.imgPlantaObj.onerror = null;
    this.imgPlantaObj.removeAttribute('src');

    Object.values(this.STORAGE_KEYS).forEach(chave => {
      try {
        localStorage.removeItem(chave);
      } catch (erro) {
        console.warn(`SMUPLOC: não foi possível remover "${chave}".`, erro);
      }
    });

    const inputPlanta = document.getElementById('input-planta');
    if (inputPlanta) inputPlanta.value = '';

    if (typeof MinimapModule !== 'undefined') {
      MinimapModule.renderPequeno();
      MinimapModule.renderExpandido();
    }

    alert('Dados locais do SMUPLOC apagados.');
    return true;
  }
};

State.init();
