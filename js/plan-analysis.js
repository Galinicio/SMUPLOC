/**
 * Análise visual assistida da planta.
 * Realça bordas/traços de alto contraste para ajudar o técnico a interpretar a imagem.
 * Não classifica automaticamente paredes, portas ou cômodos e não substitui conferência humana.
 */
const PlanAnalysis = {
  canvas: null,
  ativo: false,
  analisar() {
    const img = State.imgPlantaObj;
    if (!img || !img.complete || !img.naturalWidth) {
      alert('Importe uma planta em imagem e aguarde o carregamento antes de analisar.');
      return;
    }
    const maxSide = 1400;
    const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const source = document.createElement('canvas');
    source.width = width; source.height = height;
    const sctx = source.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0, width, height);
    const pixels = sctx.getImageData(0, 0, width, height);
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const p = i * 4;
      gray[i] = pixels.data[p] * .299 + pixels.data[p + 1] * .587 + pixels.data[p + 2] * .114;
    }
    const out = document.createElement('canvas');
    out.width = width; out.height = height;
    const octx = out.getContext('2d');
    const result = octx.createImageData(width, height);
    let edges = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const gx = -gray[i-width-1] + gray[i-width+1] - 2*gray[i-1] + 2*gray[i+1] - gray[i+width-1] + gray[i+width+1];
        const gy = -gray[i-width-1] - 2*gray[i-width] - gray[i-width+1] + gray[i+width-1] + 2*gray[i+width] + gray[i+width+1];
        const magnitude = Math.hypot(gx, gy);
        if (magnitude > 115) {
          const p = i * 4;
          result.data[p] = 0; result.data[p+1] = 229; result.data[p+2] = 255;
          result.data[p+3] = Math.min(220, Math.round(magnitude));
          edges++;
        }
      }
    }
    octx.putImageData(result, 0, 0);
    this.canvas = out;
    this.ativo = !this.ativo;
    if (!this.ativo) this.ativo = true;
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
    const percentual = (edges / (width * height) * 100).toFixed(1);
    alert('Análise visual concluída. ' + edges.toLocaleString('pt-BR') + ' pixels de borda destacados (' + percentual + '% da imagem). Use o realce como auxílio para identificar traços. O sistema ainda não identifica com segurança paredes, portas ou cômodos.');
  },
  limpar() {
    this.ativo = false;
    this.canvas = null;
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
  }
};
