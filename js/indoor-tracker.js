/**
 * IndoorTracker: estimativa experimental por passos + orientação do celular.
 * O QR fixa a origem; a posição entre leituras é estimada e acumula deriva.
 * Não equivale a UWB, beacon, ARKit/ARCore ou rastreamento de precisão.
 */
const IndoorTracker = {
  ativo: false,
  passos: 0,
  comprimentoPasso: 0.65,
  heading: null,
  headingOffset: 0,
  ultimaAmostraPasso: 0,
  picoDetectado: false,
  historicoMagnitude: [],
  precisaoM: 0.8,
  ultimaAtualizacao: null,
  suporteMovimento: false,
  suporteOrientacao: false,
  motionHandler: null,
  orientationHandler: null,

  async iniciar() {
    if (!window.isSecureContext) {
      alert('O rastreamento por sensores exige HTTPS (ou localhost). Abra o SMUPLOC por uma conexão segura.');
      return;
    }
    try {
      if (typeof DeviceMotionEvent === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
        alert('Este navegador não disponibiliza os sensores de movimento necessários.');
        return;
      }
      const permissoes = [];
      if (typeof DeviceMotionEvent.requestPermission === 'function') permissoes.push(DeviceMotionEvent.requestPermission());
      if (typeof DeviceOrientationEvent.requestPermission === 'function') permissoes.push(DeviceOrientationEvent.requestPermission());
      const resultados = await Promise.all(permissoes);
      if (resultados.some(valor => valor !== 'granted')) {
        alert('Permissão de movimento/orientação negada. Libere os sensores nas configurações do navegador e tente novamente.');
        return;
      }
      this.parar(false);
      this.ativo = true;
      this.passos = 0;
      this.heading = null;
      this.suporteMovimento = false;
      this.suporteOrientacao = false;
      this.precisaoM = 0.8;
      this.historicoMagnitude = [];
      this.ultimaAmostraPasso = 0;
      this.picoDetectado = false;
      this.motionHandler = evento => this.onMotion(evento);
      this.orientationHandler = evento => this.onOrientation(evento);
      window.addEventListener('devicemotion', this.motionHandler, true);
      window.addEventListener('deviceorientationabsolute', this.orientationHandler, true);
      window.addEventListener('deviceorientation', this.orientationHandler, true);
      this.atualizarInterface('Rastreamento assistido ativo · mantenha o celular apontado para a direção em que caminha.');
    } catch (erro) {
      console.error('SMUPLOC: não foi possível iniciar sensores.', erro);
      alert('Não foi possível iniciar os sensores neste aparelho.');
    }
  },

  parar(atualizar = true) {
    if (this.motionHandler) window.removeEventListener('devicemotion', this.motionHandler, true);
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientationabsolute', this.orientationHandler, true);
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
    }
    this.motionHandler = null;
    this.orientationHandler = null;
    this.ativo = false;
    if (atualizar) this.atualizarInterface('Rastreamento pausado. Leia o QR novamente para reposicionar no marco zero.');
  },

  iniciarNoMarcoZero(anchor) {
    this.parar(false);
    this.heading = null;
    this.passos = 0;
    this.precisaoM = 0.8;
    this.headingOffset = Number(anchor.headingOffset) || 0;
    State.posicaoUsuario = { x: Number(anchor.x) || 0, z: Number(anchor.z) || 0 };
    State.sincronizarAmbienteAtual();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
    ScannerModule.atualizarPainelDestino();
    this.atualizarInterface('Marco zero reconhecido. Toque em INICIAR RASTREAMENTO para liberar os sensores.');
  },

  onOrientation(evento) {
    let heading = null;
    if (Number.isFinite(evento.webkitCompassHeading)) {
      heading = Number(evento.webkitCompassHeading);
    } else if (evento.absolute === true && Number.isFinite(evento.alpha)) {
      heading = (360 - Number(evento.alpha)) % 360;
    }
    if (heading !== null) {
      this.heading = heading;
      this.suporteOrientacao = true;
    }
  },

  onMotion(evento) {
    if (!this.ativo || !State.posicaoUsuario) return;
    const acel = evento.acceleration;
    const grav = evento.accelerationIncludingGravity;
    let magnitude = null;
    if (acel && [acel.x, acel.y, acel.z].every(Number.isFinite)) {
      magnitude = Math.hypot(acel.x, acel.y, acel.z);
    } else if (grav && [grav.x, grav.y, grav.z].every(Number.isFinite)) {
      const bruto = Math.hypot(grav.x, grav.y, grav.z);
      this.historicoMagnitude.push(bruto);
      if (this.historicoMagnitude.length > 18) this.historicoMagnitude.shift();
      const base = this.historicoMagnitude.reduce((s, n) => s + n, 0) / this.historicoMagnitude.length;
      magnitude = Math.abs(bruto - base);
    }
    if (!Number.isFinite(magnitude)) return;
    this.suporteMovimento = true;
    const agora = Date.now();
    if (magnitude > 1.25 && !this.picoDetectado && agora - this.ultimaAmostraPasso > 330) {
      this.picoDetectado = true;
      this.registrarPasso(agora);
    } else if (magnitude < 0.55) {
      this.picoDetectado = false;
    }
  },

  registrarPasso(agora) {
    if (this.heading === null) {
      this.atualizarInterface('Passo detectado, mas sem bússola/orientação válida. Verifique a permissão de orientação.');
      return;
    }
    const headingMapa = (this.heading - this.headingOffset + 360) % 360;
    const rad = headingMapa * Math.PI / 180;
    const dx = Math.sin(rad) * this.comprimentoPasso;
    const dz = -Math.cos(rad) * this.comprimentoPasso;
    State.posicaoUsuario = {
      x: Number((State.posicaoUsuario.x + dx).toFixed(3)),
      z: Number((State.posicaoUsuario.z + dz).toFixed(3))
    };
    this.ultimaAmostraPasso = agora;
    this.passos += 1;
    this.precisaoM = Math.min(12, this.precisaoM + 0.08);
    this.ultimaAtualizacao = agora;
    State.sincronizarAmbienteAtual();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
    ScannerModule.atualizarPainelDestino();
    this.atualizarInterface();
  },

  calibrarDirecaoMapa() {
    if (!Number.isFinite(this.heading)) {
      alert('A bússola ainda não forneceu uma direção válida. Mova o celular e tente novamente.');
      return;
    }
    const confirmar = confirm('Aponte a parte superior do celular exatamente para a direção que corresponde ao TOPO da planta baixa. Deseja calibrar essa direção como 0°?');
    if (!confirmar) return;
    this.headingOffset = this.heading;
    State.marcoZero = { ...(State.marcoZero || { x: 0, z: 0 }), headingOffset: this.headingOffset };
    State.sincronizarAmbienteAtual();
    this.atualizarInterface('Direção da planta calibrada. Gere novamente o QR Code para distribuir essa calibração aos outros celulares.');
  },

  recalibrarPasso() {
    const valor = Number(prompt('Comprimento médio do seu passo em metros (ex.: 0.65):', String(this.comprimentoPasso)));
    if (Number.isFinite(valor) && valor >= 0.3 && valor <= 1.2) {
      this.comprimentoPasso = valor;
      this.atualizarInterface('Comprimento de passo ajustado para ' + valor.toFixed(2) + ' m.');
    }
  },

  atualizarInterface(mensagem) {
    const status = document.getElementById('tracking-status');
    if (!status) return;
    const texto = mensagem || (this.ativo
      ? 'Estimativa ativa · ' + this.passos + ' passos · margem de deriva estimada ±' + this.precisaoM.toFixed(1) + ' m'
      : 'Sensores desligados');
    status.textContent = texto;
    status.dataset.active = this.ativo ? 'true' : 'false';
  }
};

