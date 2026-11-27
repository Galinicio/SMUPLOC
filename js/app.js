/**
 * Main Controller & Event Dispatcher
 */
document.addEventListener('DOMContentLoaded', () => {
  State.setPerfil(State.perfilAtual);
  MinimapModule.renderPequeno();
  QRScannerModule.iniciarLoop();

  const canvasExp = document.getElementById('canvas-expandido');
  if (!canvasExp) return;

  function getPosCanvas(e) {
    const rect = canvasExp.getBoundingClientRect();
    const ponto = e.touches ? e.touches[0] : e;
    return {
      x: (ponto.clientX - rect.left) * (canvasExp.width / rect.width),
      y: (ponto.clientY - rect.top) * (canvasExp.height / rect.height)
    };
  }

  const iniciarArraste = e => {
    if (State.perfilAtual === 'cliente' || MapearModule.ativo || MinimapModule.bloquearArraste) return;

    const pos = getPosCanvas(e);
    const cx = canvasExp.width / 2;
    const cy = canvasExp.height / 2;
    const escala = MapearModule.escalaPxPorMetro || 22;

    State.equipamentos.forEach(eq => {
      if (eq.posicionado === false) return;

      const px = cx + (Number(eq.x) * escala);
      const py = cy + (Number(eq.z) * escala);

      if (Math.hypot(pos.x - px, pos.y - py) < 20) {
        MinimapModule.objetoArrastando = eq;
      }
    });
  };

  const moverArraste = e => {
    const eq = MinimapModule.objetoArrastando;
    if (!eq || State.perfilAtual === 'cliente' || MapearModule.ativo) return;

    if (e.cancelable) e.preventDefault();

    const pos = getPosCanvas(e);
    const cx = canvasExp.width / 2;
    const cy = canvasExp.height / 2;
    const escala = MapearModule.escalaPxPorMetro || 22;

    eq.x = parseFloat(((pos.x - cx) / escala).toFixed(1));
    eq.z = parseFloat(((pos.y - cy) / escala).toFixed(1));
    eq.posicionado = true;

    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
  };

  const pararArraste = () => {
    if (MinimapModule.objetoArrastando) {
      State.salvarEquipamentos();
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
    }
    MinimapModule.objetoArrastando = null;
    MinimapModule.bloquearArraste = false;
  };

  canvasExp.addEventListener('pointerdown', evento => {
    if (typeof ScannerModule !== 'undefined' && (ScannerModule.aguardandoPosicao || ScannerModule.aguardandoMarcoZero)) {
      if (ScannerModule.registrarPosicao(evento)) MinimapModule.bloquearArraste = true;
      return;
    }
    if (MinimapModule.equipamentoAguardandoPosicao) {
      if (MinimapModule.posicionarEquipamento(evento)) MinimapModule.bloquearArraste = true;
      return;
    }
    MapearModule.registrarToque(evento);
  });
  canvasExp.addEventListener('mousedown', iniciarArraste);
  canvasExp.addEventListener('mousemove', moverArraste);
  window.addEventListener('mouseup', pararArraste);

  canvasExp.addEventListener('touchstart', iniciarArraste, { passive: true });
  canvasExp.addEventListener('touchmove', moverArraste, { passive: false });
  canvasExp.addEventListener('touchend', pararArraste);
  canvasExp.addEventListener('touchcancel', pararArraste);
});
