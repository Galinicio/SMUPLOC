/**
 * Interface SMUPLOC: mapa em primeiro plano e configurações organizadas abaixo.
 * Mantém os módulos e ações existentes; altera somente a composição da interface.
 */
const UIShell = {
  secaoAtiva: 'minimapa',
  zoomMapa: 1,

  montarMenu() {
    const modal = document.getElementById('modal-planta');
    if (!modal || modal.dataset.menuMontado === 'true') return;
    modal.dataset.menuMontado = 'true';

    const cabecalho = modal.querySelector('.modal-header');
    const layout = document.createElement('div');
    layout.className = 'smuploc-layout';

    const mapaPainel = document.createElement('section');
    mapaPainel.className = 'smuploc-mapa-painel';
    mapaPainel.setAttribute('aria-label', 'Mapa do ambiente');

    const mapaTitulo = document.createElement('div');
    mapaTitulo.className = 'smuploc-bloco-titulo';
    mapaTitulo.innerHTML = '<strong>Mapa do ambiente</strong><span>Visualização e orientação do técnico</span>';

    const configPainel = document.createElement('section');
    configPainel.className = 'smuploc-config-painel';
    configPainel.setAttribute('aria-label', 'Configurações');
    const configTitulo = document.createElement('div');
    configTitulo.className = 'smuploc-bloco-titulo smuploc-config-titulo';
    configTitulo.innerHTML = '<strong>Configurações</strong><span>Ambiente, planta e ferramentas</span>';

    const ambientes = document.getElementById('ambientes-acoes');
    const perfil = document.getElementById('perfil-acoes');
    const canvas = document.getElementById('canvas-expandido-container');
    const equipamentos = document.getElementById('painel-equipamentos');
    const ferramentas = document.getElementById('ferramentas-avancadas');
    const seletor = ferramentas?.querySelector('.mapear-seletor');
    const calibrar = ferramentas?.querySelector('[onclick*="iniciarCalibracao"]');
    const analisar = ferramentas?.querySelector('[onclick*="PlanAnalysis.analisar"]');
    const controles = document.getElementById('controles-admin');
    const limpar = controles?.querySelector('[onclick*="limparTudo"]');
    const btnEquipamentos = controles?.querySelector('[onclick*="EquipmentModule.abrir"]');
    const upload = controles?.querySelector('label');



    if (canvas) {
      mapaPainel.append(mapaTitulo, canvas);
      this.vincularGestosMapa(canvas);
    } else {
      mapaPainel.append(mapaTitulo);
    }
    if (equipamentos) mapaPainel.appendChild(equipamentos);
    if (btnEquipamentos) mapaPainel.appendChild(btnEquipamentos);

    configPainel.appendChild(configTitulo);
    if (perfil) configPainel.appendChild(perfil);
    if (ambientes) configPainel.appendChild(ambientes);

    const grupoPlanta = document.createElement('details');
    grupoPlanta.className = 'smuploc-config-grupo';
    const resumoPlanta = document.createElement('summary');
    resumoPlanta.innerHTML = '<span>Planta e mapeamento</span><span class="config-chevron">⌄</span>';
    const corpoPlanta = document.createElement('div');
    corpoPlanta.className = 'smuploc-config-conteudo';
    if (seletor) corpoPlanta.appendChild(seletor);
    if (calibrar) corpoPlanta.appendChild(calibrar);
    if (analisar) corpoPlanta.appendChild(analisar);
    if (upload) corpoPlanta.appendChild(upload);
    grupoPlanta.append(resumoPlanta, corpoPlanta);
    configPainel.appendChild(grupoPlanta);

    const grupoAvancado = document.createElement('details');
    grupoAvancado.className = 'smuploc-config-grupo';
    const resumoAvancado = document.createElement('summary');
    resumoAvancado.innerHTML = '<span>Administração</span><span class="config-chevron">⌄</span>';
    const corpoAvancado = document.createElement('div');
    corpoAvancado.className = 'smuploc-config-conteudo';
    if (limpar) corpoAvancado.appendChild(limpar);
    grupoAvancado.append(resumoAvancado, corpoAvancado);
    configPainel.appendChild(grupoAvancado);

    layout.append(mapaPainel, configPainel);
    if (cabecalho) {
      cabecalho.after(layout);
      const titulo = cabecalho.querySelector('.modal-title');
      if (titulo) titulo.textContent = 'SMUPLOC';
      const subtitulo = cabecalho.querySelector('.subtitle-perfil');
      if (subtitulo) subtitulo.textContent = 'Mapa e configurações';
    } else {
      modal.appendChild(layout);
    }
    if (ferramentas) ferramentas.remove();
    this.mostrarSecao('minimapa');
  },

  mostrarSecao(id) {
    this.secaoAtiva = id;
    const config = document.querySelector('.smuploc-config-painel');
    const grupoPlanta = document.querySelector('.smuploc-config-grupo');
    if (id === 'planta' && grupoPlanta) {
      grupoPlanta.open = true;
      grupoPlanta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (id === 'config' && config) {
      config.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  estadoGestosMapa: null,

  vincularGestosMapa(container) {
    if (!container || container.dataset.gestosMapa === 'true') return;
    const canvas = container.querySelector('#canvas-expandido');
    if (!canvas) return;
    container.dataset.gestosMapa = 'true';
    this.estadoGestosMapa = {
      container, canvas, pointers: new Map(), scale: 1, x: 0, y: 0,
      start: null, moved: false, suppressClick: false
    };

    const ponto = event => {
      const rect = container.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const distancia = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
    const meio = (a,b) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

    container.addEventListener('pointerdown', event => {
      if (event.target !== canvas) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const state = this.estadoGestosMapa;
      state.pointers.set(event.pointerId, ponto(event));
      try { container.setPointerCapture(event.pointerId); } catch (_) {}
      if (state.pointers.size === 1) {
        const p = state.pointers.get(event.pointerId);
        state.start = { id:event.pointerId, point:p, x:state.x, y:state.y, moved:false };
      } else if (state.pointers.size === 2) {
        const pts = [...state.pointers.values()];
        state.start = {
          pinch:true, distance:distancia(pts[0],pts[1]), scale:state.scale,
          midpoint:meio(pts[0],pts[1]), x:state.x, y:state.y
        };
        state.suppressClick = true;
        event.preventDefault();
      }
    }, {passive:false});

    container.addEventListener('pointermove', event => {
      const state = this.estadoGestosMapa;
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.set(event.pointerId, ponto(event));
      if (state.pointers.size >= 2 && state.start?.pinch) {
        const pts = [...state.pointers.values()];
        const mid = meio(pts[0],pts[1]);
        const factor = distancia(pts[0],pts[1]) / Math.max(1,state.start.distance);
        const nextScale = Math.max(.65,Math.min(4,state.start.scale * factor));
        const midX = mid.x;
        const midY = mid.y;
        const contentX = (state.start.midpoint.x - state.start.x) / state.start.scale;
        const contentY = (state.start.midpoint.y - state.start.y) / state.start.scale;
        state.scale = nextScale;
        state.x = midX - contentX * nextScale;
        state.y = midY - contentY * nextScale;
        this.aplicarTransformacaoMapa();
        event.preventDefault();
        return;
      }
      if (state.pointers.size === 1 && state.start && !state.start.pinch) {
        const p = state.pointers.get(event.pointerId);
        const dx = p.x - state.start.point.x;
        const dy = p.y - state.start.point.y;
        if (!state.start.moved && Math.hypot(dx,dy) < 6) return;
        state.start.moved = true;
        state.suppressClick = true;
        state.x = state.start.x + dx;
        state.y = state.start.y + dy;
        this.aplicarTransformacaoMapa();
        event.preventDefault();
      }
    }, {passive:false});

    const terminar = event => {
      const state = this.estadoGestosMapa;
      state.pointers.delete(event.pointerId);
      if (state.pointers.size === 1) {
        const [id,p] = [...state.pointers.entries()][0];
        state.start = {id,point:p,x:state.x,y:state.y,moved:true};
      } else if (state.pointers.size === 0) {
        state.start = null;
        if (state.suppressClick) {
          const canvasEl = state.canvas;
          const bloquear = e => { e.preventDefault(); e.stopImmediatePropagation(); };
          canvasEl.addEventListener('click', bloquear, {capture:true,once:true});
          setTimeout(() => { state.suppressClick = false; }, 0);
        }
      }
    };
    container.addEventListener('pointerup', terminar);
    container.addEventListener('pointercancel', terminar);
    container.addEventListener('lostpointercapture', terminar);

    container.addEventListener('wheel', event => {
      if (event.target !== canvas) return;
      const state = this.estadoGestosMapa;
      const rect = container.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const next = Math.max(.65,Math.min(4,state.scale * (event.deltaY < 0 ? 1.12 : .89)));
      const contentX = (cx-state.x)/state.scale;
      const contentY = (cy-state.y)/state.scale;
      state.scale=next; state.x=cx-contentX*next; state.y=cy-contentY*next;
      this.aplicarTransformacaoMapa();
      event.preventDefault();
    }, {passive:false});
    this.aplicarTransformacaoMapa();
  },

  aplicarTransformacaoMapa() {
    const state = this.estadoGestosMapa;
    if (!state) return;
    state.canvas.style.transform = `translate(${state.x}px,${state.y}px) scale(${state.scale})`;
    state.canvas.style.transformOrigin = '0 0';
  },

  abrirPainel() {
    if (typeof ScannerModule !== 'undefined') ScannerModule.fechar();
    if (typeof EquipmentModule !== 'undefined') EquipmentModule.fechar();
    const camera = document.getElementById('camera-mapeamento');
    if (camera) camera.hidden = true;
    const modal = document.getElementById('modal-planta');
    if (modal) {
      modal.style.display = 'flex';
      this.montarMenu();
    }
    const opcoes = document.getElementById('mapear-opcoes');
    if (opcoes) opcoes.hidden = true;
  },

  fecharPainel() {
    if (typeof MapearModule !== 'undefined' && (MapearModule.ativo || MapearModule.calibracaoAtiva)) {
      if (!confirm('Sair do mapeamento atual? Os pontos ainda não salvos serão descartados.')) return false;
      MapearModule.cancelar(true);
    }
    const modal = document.getElementById('modal-planta');
    if (modal) modal.style.display = 'none';
    if (typeof EquipmentModule !== 'undefined') EquipmentModule.fechar();
    return true;
  },

  alternarOpcoesMapeamento() {
    const opcoes = document.getElementById('mapear-opcoes');
    const botao = document.querySelector('.mapear-seletor > button');
    if (!opcoes) return;
    opcoes.hidden = !opcoes.hidden;
    if (botao) botao.setAttribute('aria-expanded', String(!opcoes.hidden));
  },

  selecionarMapeamento(modo) {
    const opcoes = document.getElementById('mapear-opcoes');
    if (opcoes) opcoes.hidden = true;
    if (modo === 'planta') {
      if (!State.plantaImageBase64) {
        alert('Importe uma planta baixa antes de iniciar.');
        return;
      }
      this.mostrarSecao('planta');
      MapearModule.iniciar();
    } else if (modo === 'camera') {
      MapearModule.iniciarCamera();
    }
  },

  voltarDaCamera() {
    if (typeof MapearModule !== 'undefined') MapearModule.encerrarCamera();
    this.abrirPainel();
    this.mostrarSecao('planta');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UIShell.montarMenu();
  const modal = document.getElementById('modal-planta');
  if (modal) modal.addEventListener('click', e => {
    if (e.target === modal) UIShell.fecharPainel();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const camera = document.getElementById('camera-mapeamento');
    const scanner = document.getElementById('scanner-overlay');
    if (camera && !camera.hidden) UIShell.voltarDaCamera();
    else if (scanner && !scanner.hidden) ScannerModule.fechar();
    else if (modal && modal.style.display === 'flex') UIShell.fecharPainel();
  });
});
