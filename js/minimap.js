/**
 * Minimap — renderização dos mapas e importação da planta.
 * O minimapa é redesenhado sob demanda, sem loop infinito de animação.
 */
const MinimapModule = {
  objetoArrastando: null,
  equipamentoAguardandoPosicao: null,
  bloquearArraste: false,

  posicionarEquipamento(evento) {
    const equipamento = this.equipamentoAguardandoPosicao;
    const canvas = document.getElementById('canvas-expandido');
    if (!equipamento || !canvas || evento.target !== canvas) return false;

    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    const px = (evento.clientX - rect.left) * escalaX;
    const py = (evento.clientY - rect.top) * escalaY;
    const escala = (typeof MapearModule !== 'undefined' && MapearModule.escalaPxPorMetro) || 22;

    equipamento.x = Number(((px - canvas.width / 2) / escala).toFixed(3));
    equipamento.z = Number(((py - canvas.height / 2) / escala).toFixed(3));
    equipamento.posicionado = true;
    this.equipamentoAguardandoPosicao = null;

    State.salvarEquipamentos();
    this.renderExpandido();
    this.renderPequeno();
    alert('Equipamento posicionado na planta.');
    return true;
  },

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
      // Mantém a proporção original da planta; não distorce salas ou medidas visuais.
      const imgW = State.imgPlantaObj.naturalWidth;
      const imgH = State.imgPlantaObj.naturalHeight;
      const fator = Math.min(w / imgW, h / imgH);
      const drawW = imgW * fator;
      const drawH = imgH * fator;
      ctx.fillStyle = pequeno ? '#0a2540' : '#07192b';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(State.imgPlantaObj, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
      if (typeof PlanAnalysis !== 'undefined' && PlanAnalysis.ativo && PlanAnalysis.canvas) {
        ctx.save();
        ctx.globalAlpha = 0.78;
        ctx.drawImage(PlanAnalysis.canvas, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
        ctx.restore();
      }
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

  desenharMarcoZero(ctx, escala, cx, cy, expandido) {
    const marco = State.marcoZero || { x: 0, z: 0 };
    const x = cx + Number(marco.x || 0) * escala;
    const y = cy + Number(marco.z || 0) * escala;
    ctx.save();
    ctx.strokeStyle = '#ffc107'; ctx.lineWidth = expandido ? 3 : 2;
    ctx.beginPath(); ctx.arc(x, y, expandido ? 12 : 5, 0, Math.PI * 2); ctx.stroke();
    if (expandido) { ctx.fillStyle = '#ffc107'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('QR / MARCO ZERO', x + 14, y - 8); }
    ctx.restore();
  },

  desenharNavegacao(ctx, escala, cx, cy, expandido) {
    const destino = State.equipamentos.find(eq => String(eq.id) === String(State.destinoId) && eq.posicionado !== false);
    const usuario = State.posicaoUsuario;
    if (destino && usuario) {
      const ux = cx + Number(usuario.x) * escala;
      const uy = cy + Number(usuario.z) * escala;
      const dx = cx + Number(destino.x) * escala;
      const dy = cy + Number(destino.z) * escala;
      ctx.save();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = expandido ? 4 : 2;
      ctx.setLineDash(expandido ? [8, 5] : [4, 3]);
      ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(dx, dy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(ux, uy, expandido ? 8 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    if (destino) {
      const dx = cx + Number(destino.x) * escala;
      const dy = cy + Number(destino.z) * escala;
      ctx.save(); ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = expandido ? 3 : 2;
      ctx.beginPath(); ctx.arc(dx, dy, expandido ? 15 : 7, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
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
    this.desenharMarcoZero(ctx, escala, cx, cy, false);
    this.desenharNavegacao(ctx, escala, cx, cy, false);
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
    const escala = (typeof MapearModule !== 'undefined' && MapearModule.escalaPxPorMetro) || 22;

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
    this.desenharMarcoZero(ctx, escala, cx, cy, true);
    this.desenharNavegacao(ctx, escala, cx, cy, true);
  },

  uploadPlanta(event) {
    if (State.perfilAtual !== 'admin') {
      alert('Ação disponível apenas no modo administrador local.');
      return;
    }
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\\.pdf$/i.test(file.name || '');
    const limiteBytes = isPdf ? 8 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > limiteBytes) {
      alert(isPdf ? 'O PDF deve ter no máximo 8 MB.' : 'A imagem deve ter no máximo 3 MB.');
      event.target.value = '';
      return;
    }
    if (isPdf) {
      if (typeof pdfjsLib === 'undefined') {
        alert('O leitor de PDF não carregou. Verifique a conexão com a internet e tente novamente.');
        event.target.value = '';
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const bytes = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          const page = await pdf.getPage(1);
          const viewportBase = page.getViewport({ scale: 1 });
          const scale = Math.min(2, 2400 / Math.max(viewportBase.width, viewportBase.height));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          if (!State.salvarPlantaImage(dataUrl)) alert('Não foi possível salvar a planta convertida. Tente um PDF menor.');
          else alert('Primeira página do PDF importada como planta. Confira a escala e calibre usando duas medidas conhecidas.');
        } catch (erro) {
          console.error('SMUPLOC: falha ao converter PDF.', erro);
          alert('Não foi possível abrir este PDF. Tente exportar a página como imagem.');
        } finally {
          event.target.value = '';
        }
      };
      reader.onerror = () => { alert('Falha ao ler o PDF selecionado.'); event.target.value = ''; };
      reader.readAsArrayBuffer(file);
      return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      alert('Selecione uma imagem ou um PDF válido.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      if (typeof e.target.result !== 'string') return;
      if (!State.salvarPlantaImage(e.target.result)) alert('Não foi possível salvar a planta. Tente uma imagem menor.');
      else alert('Planta importada. Agora calibre a escala usando dois pontos de distância conhecida.');
      event.target.value = '';
    };
    reader.onerror = () => { alert('Falha ao ler a imagem selecionada.'); event.target.value = ''; };
    reader.readAsDataURL(file);
  }};
