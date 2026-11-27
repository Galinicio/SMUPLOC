/**
 * Minimap — renderização dos mapas e importação da planta.
 * O minimapa é redesenhado sob demanda, sem loop infinito de animação.
 */
const MinimapModule = {
  objetoArrastando: null,

  abrirModal() {
    const modal = document.getElementById('modal-planta');
    if (modal) modal.style.display = 'flex';
    this.renderExpandido();
  },

  fecharModal() {
    const modal = document.getElementById('modal-planta');
    if (modal) modal.style.display = 'none';
  },

  desenharFundo(ctx, w, h, pequeno) {
    if (State.imgPlantaObj.complete && State.imgPlantaObj.naturalWidth > 0) {
      ctx.drawImage(State.imgPlantaObj, 0, 0, w, h);
      return;
    }

    ctx.fillStyle = pequeno ? '#0a2540' : '#07192b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = pequeno ? 'rgba(0, 82, 204, 0.3)' : 'rgba(0, 82, 204, 0.25)';
    ctx.lineWidth = 1;
    const passo = pequeno ? 15 : 30;

    for (let x = 0; x < w; x += passo) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += passo) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  },

  desenharCantos(ctx, escala, cx, cy, expandido) {
    if (!Array.isArray(State.cantosMapear) || State.cantosMapear.length < 2) return;

    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = expandido ? 3 : 2;
    if (expandido) ctx.fillStyle = 'rgba(255, 193, 7, 0.12)';
    ctx.beginPath();

    State.cantosMapear.forEach((canto, idx) => {
      const px = cx + (Number(canto.x) * escala);
      const py = cy + (Number(canto.z) * escala);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    if (State.cantosMapear.length >= 3) {
      ctx.closePath();
      if (expandido) ctx.fill();
    }
    ctx.stroke();

    if (expandido) {
      State.cantosMapear.forEach(canto => {
        const px = cx + (Number(canto.x) * escala);
        const py = cy + (Number(canto.z) * escala);
        ctx.fillStyle = '#ffc107';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  },

  desenharEquipamentos(ctx, escala, cx, cy, expandido) {
    State.equipamentos.forEach(eq => {
      // Equipamentos recém-cadastrados não aparecem até serem posicionados.
      if (eq.posicionado === false) return;
      const px = cx + (Number(eq.x) * escala);
      const py = cy + (Number(eq.z) * escala);

      ctx.fillStyle = eq.cor || '#ffc107';
      ctx.beginPath();
      ctx.arc(px, py, expandido ? 10 : 4, 0, 2 * Math.PI);
      ctx.fill();

      if (expandido) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffc107';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(eq.nome || eq.id || 'Equipamento').slice(0, 40), px - 25, py - 14);
      }
    });
  },

  renderPequeno() {
    const canvas = document.getElementById('mapa-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width || 130;
    const h = canvas.height || 105;
    const cx = w / 2;
    const cy = h / 2;
    const escala = 8;

    ctx.clearRect(0, 0, w, h);
    this.desenharFundo(ctx, w, h, true);
    this.desenharCantos(ctx, escala, cx, cy, false);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fill();

    this.desenharEquipamentos(ctx, escala, cx, cy, false);
  },

  renderExpandido() {
    const canvas = document.getElementById('canvas-expandido');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const escala = 22;

    ctx.clearRect(0, 0, w, h);
    this.desenharFundo(ctx, w, h, false);
    this.desenharCantos(ctx, escala, cx, cy, true);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.fillText('ÂNCORA (0,0)', cx - 25, cy + 18);

    this.desenharEquipamentos(ctx, escala, cx, cy, true);
  },

  uploadPlanta(event) {
    if (State.perfilAtual !== 'admin') {
      alert('Ação disponível apenas no modo administrador local.');
      return;
    }

    const file = event && event.target && event.target.files
      ? event.target.files[0]
      : null;
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido.');
      event.target.value = '';
      return;
    }

    const limiteBytes = 5 * 1024 * 1024;
    if (file.size > limiteBytes) {
      alert('A imagem deve ter no máximo 5 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      if (typeof e.target.result !== 'string') return;
      if (!State.salvarPlantaImage(e.target.result)) {
        alert('Não foi possível salvar a planta. Tente uma imagem menor.');
      }
    };
    reader.onerror = () => alert('Falha ao ler a imagem selecionada.');
    reader.readAsDataURL(file);
  }
};
