/**
 * Controle central das interfaces: somente um painel/modal ativo por vez.
 * Mantém a câmera visível enquanto o menu lateral está aberto.
 */
const UIShell = {
  abrirPainel() {
    if (typeof ScannerModule !== 'undefined') ScannerModule.fechar();
    if (typeof EquipmentModule !== 'undefined') EquipmentModule.fechar();
    const camera = document.getElementById('camera-mapeamento');
    if (camera) camera.hidden = true;
    const modal = document.getElementById('modal-planta');
    if (modal) modal.style.display = 'flex';
    const opcoes = document.getElementById('mapear-opcoes');
    if (opcoes) opcoes.hidden = true;
    const botao = document.querySelector('.mapear-seletor > button');
    if (botao) botao.setAttribute('aria-expanded', 'false');
  },

  fecharPainel() {
    if (typeof MapearModule !== 'undefined' && (MapearModule.ativo || MapearModule.calibracaoAtiva)) {
      const confirmar = confirm('Sair do mapeamento atual? Os pontos ainda não salvos serão descartados.');
      if (!confirmar) return false;
      MapearModule.cancelar(true);
      const modalAposCancelar = document.getElementById('modal-planta');
      if (modalAposCancelar) modalAposCancelar.style.display = 'none';
      return true;
    }
    const modal = document.getElementById('modal-planta');
    if (modal) modal.style.display = 'none';
    const opcoes = document.getElementById('mapear-opcoes');
    if (opcoes) opcoes.hidden = true;
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
        alert('Importe uma planta baixa em Ferramentas antes de mapear por ela.');
        return;
      }
      MapearModule.iniciar();
    } else if (modo === 'camera') {
      MapearModule.iniciarCamera();
    }
  },

  voltarDaCamera() {
    if (typeof MapearModule !== 'undefined') MapearModule.encerrarCamera();
    this.abrirPainel();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-planta');
  if (modal) modal.addEventListener('click', evento => {
    if (evento.target === modal) UIShell.fecharPainel();
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') {
      const camera = document.getElementById('camera-mapeamento');
      if (camera && !camera.hidden) UIShell.voltarDaCamera();
      else {
        const scanner = document.getElementById('scanner-overlay');
        if (scanner && !scanner.hidden) ScannerModule.fechar();
        else {
          const painel = document.getElementById('modal-planta');
          if (painel && painel.style.display === 'flex') UIShell.fecharPainel();
        }
      }
    }
  });
});
