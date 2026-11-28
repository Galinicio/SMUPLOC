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

    const zoom = document.createElement('div');
    zoom.className = 'mapa-zoom-controles';
    zoom.innerHTML = '<button type="button" aria-label="Diminuir zoom">−</button><span>100%</span><button type="button" aria-label="Aumentar zoom">+</button>';
    zoom.children[0].addEventListener('click', () => this.ajustarZoom(-0.15));
    zoom.children[2].addEventListener('click', () => this.ajustarZoom(0.15));

    if (canvas) {
      mapaPainel.append(mapaTitulo, zoom, canvas);
    } else {
      mapaPainel.append(mapaTitulo, zoom);
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

  ajustarZoom(delta) {
    this.zoomMapa = Math.max(0.7, Math.min(2.2, this.zoomMapa + delta));
    const canvas = document.getElementById('canvas-expandido');
    if (!canvas) return;
    const px = Math.round(360 * this.zoomMapa);
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';
    const label = document.querySelector('.mapa-zoom-controles span');
    if (label) label.textContent = Math.round(this.zoomMapa * 100) + '%';
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
