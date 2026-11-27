/**
 * Main Controller & Event Dispatcher
 */
document.addEventListener('DOMContentLoaded', () => {
  MinimapModule.renderPequeno();
  QRScannerModule.iniciarLoop();

  const canvasExp = document.getElementById('canvas-expandido');
  if (!canvasExp) return;

  function getPosCanvas(e) {
    const rect = canvasExp.getBoundingClientRect();
    const ponto = e.touches ? e.touches[0] : e;
    return {
      x: ponto.clientX - rect.left,
      y: ponto.clientY - rect.top
    };
  }

  const iniciarArraste = e => {
    if (State.perfilAtual === 'cliente') return;

    const pos = getPosCanvas(e);
    const cx = canvasExp.width / 2;
    const cy = canvasExp.height / 2;
    const escala = 22;

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
    if (!eq || State.perfilAtual === 'cliente') return;

    if (e.cancelable) e.preventDefault();

    const pos = getPosCanvas(e);
    const cx = canvasExp.width / 2;
    const cy = canvasExp.height / 2;
    const escala = 22;

    eq.x = parseFloat(((pos.x - cx) / escala).toFixed(1));
    eq.z = parseFloat(((pos.y - cy) / escala).toFixed(1));
    eq.posicionado = true;

    State.salvarEquipamentos();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
  };

  const pararArraste = () => {
    MinimapModule.objetoArrastando = null;
  };

  canvasExp.addEventListener('mousedown', iniciarArraste);
  canvasExp.addEventListener('mousemove', moverArraste);
  window.addEventListener('mouseup', pararArraste);

  canvasExp.addEventListener('touchstart', iniciarArraste, { passive: true });
  canvasExp.addEventListener('touchmove', moverArraste, { passive: false });
  canvasExp.addEventListener('touchend', pararArraste);
  canvasExp.addEventListener('touchcancel', pararArraste);
});
