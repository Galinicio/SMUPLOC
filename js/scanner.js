/**
 * POI Explorer — busca de equipamentos previamente posicionados e guia visual.
 * A posição do técnico é manual nesta versão; não simula rastreamento indoor.
 */
const ScannerModule = {
  aguardandoPosicao: false,
  aguardandoMarcoZero: false,
  destinoAtual: null,

  abrir() {
    if (typeof UIShell !== 'undefined' && !UIShell.fecharPainel()) return;
    if (typeof EquipmentModule !== 'undefined') EquipmentModule.fechar();
    const overlay = document.getElementById('scanner-overlay');
    const ambiente = State.obterAmbienteAtual();
    if (!ambiente) {
      alert('Nenhum ambiente está selecionado. Importe ou cadastre um ambiente primeiro.');
      return;
    }
    const lista = document.getElementById('scanner-lista');
    const titulo = document.getElementById('scanner-ambiente');
    if (titulo) titulo.textContent = [ambiente.cliente, ambiente.unidade, ambiente.andar, ambiente.setor, ambiente.nome].filter(Boolean).join(' · ');
    if (overlay) overlay.hidden = false;
    document.body.classList.add('scanner-ativo');
    this.renderLista('');
    const busca = document.getElementById('scanner-busca');
    if (busca) {
      busca.value = '';
      busca.oninput = () => this.renderLista(busca.value);
      busca.focus();
    }
  },

  fechar() {
    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('scanner-ativo');
  },

  renderLista(filtro) {
    const lista = document.getElementById('scanner-lista');
    if (!lista) return;
    lista.replaceChildren();
    const termo = String(filtro || '').trim().toLocaleLowerCase('pt-BR');
    const encontrados = State.equipamentos.filter(eq => eq && eq.posicionado !== false &&
      [eq.nome, eq.id, eq.tipo, eq.setor].some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)));
    if (!encontrados.length) {
      const vazio = document.createElement('p');
      vazio.className = 'scanner-vazio';
      vazio.textContent = State.equipamentos.length
        ? 'Nenhum equipamento posicionado corresponde à busca.'
        : 'Ainda não existem equipamentos cadastrados neste ambiente.';
      lista.appendChild(vazio);
      return;
    }
    encontrados.forEach(eq => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'scanner-item';
      item.addEventListener('click', () => this.selecionar(eq.id));
      const nome = document.createElement('strong');
      nome.textContent = eq.nome || eq.id;
      const meta = document.createElement('span');
      meta.textContent = [eq.tipo || 'Equipamento', eq.setor || 'Setor não informado', 'ID: ' + eq.id].join(' · ');
      const acao = document.createElement('small');
      acao.textContent = String(eq.id) === String(State.destinoId) ? 'DESTINO SELECIONADO' : 'Toque para navegar';
      item.append(nome, meta, acao);
      lista.appendChild(item);
    });
  },

  selecionar(id) {
    const eq = State.equipamentos.find(item => String(item.id) === String(id) && item.posicionado !== false);
    if (!eq) return;
    State.destinoId = eq.id;
    State.sincronizarAmbienteAtual();
    this.fechar();
    MinimapModule.abrirModal();
    this.atualizarPainelDestino();
    MinimapModule.renderPequeno();
    MinimapModule.renderExpandido();
    if (!State.posicaoUsuario) {
      alert('Destino marcado. Para mostrar a orientação no mapa, toque em “Marcar minha posição no mapa” e indique onde você está na planta.');
    }
  },

  atualizarPainelDestino() {
    const eq = State.equipamentos.find(item => String(item.id) === String(State.destinoId));
    const painel = document.getElementById('navegacao-destino');
    const botao = document.querySelector('#navegacao-controles button');
    if (painel) {
      if (!eq) painel.textContent = 'Nenhum destino selecionado';
      else if (!State.posicaoUsuario) painel.textContent = 'Destino: ' + (eq.nome || eq.id) + ' · marque sua posição no mapa';
      else {
        const distancia = Math.hypot(Number(eq.x) - Number(State.posicaoUsuario.x), Number(eq.z) - Number(State.posicaoUsuario.z));
        painel.textContent = 'Destino: ' + (eq.nome || eq.id) + ' · distância em linha reta no mapa: ' + distancia.toFixed(1) + ' m';
      }
    }
    if (botao) botao.textContent = this.aguardandoPosicao ? 'Toque na planta para marcar sua posição…' : 'Marcar minha posição no mapa';

    const status = document.getElementById('tracking-status');
    if (status && !this.aguardandoMarcoZero && !(typeof IndoorTracker !== 'undefined' && IndoorTracker.ativo)) {
      if (this.aguardandoPosicao) {
        status.textContent = 'Toque na planta para marcar sua posição.';
        status.dataset.active = 'false';
      } else if (!State.posicaoUsuario) {
        status.textContent = 'Marque sua posição na planta.';
        status.dataset.active = 'false';
      } else if (!eq) {
        status.textContent = 'Posição definida · selecione um equipamento.';
        status.dataset.active = 'false';
      } else {
        status.textContent = 'Tudo pronto · inicie a orientação.';
        status.dataset.active = 'false';
      }
    }
  },

  marcarMinhaPosicao() {
    if (!State.obterAmbienteAtual()) return;
    this.aguardandoPosicao = true;
    MinimapModule.abrirModal();
    this.atualizarPainelDestino();
  },

  registrarPosicao(evento) {
    const canvas = document.getElementById('canvas-expandido');
    if (!canvas || evento.target !== canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const px = (evento.clientX - rect.left) * (canvas.width / rect.width);
    const py = (evento.clientY - rect.top) * (canvas.height / rect.height);
    const escala = (typeof MapearModule !== 'undefined' && MapearModule.escalaPxPorMetro) || 22;
    const coordenada = { x: Number(((px - canvas.width / 2) / escala).toFixed(3)), z: Number(((py - canvas.height / 2) / escala).toFixed(3)) };
    if (this.aguardandoMarcoZero) {
      State.marcoZero = coordenada;
      State.posicaoUsuario = { ...coordenada };
      this.aguardandoMarcoZero = false;
      State.sincronizarAmbienteAtual();
      MinimapModule.renderExpandido();
      MinimapModule.renderPequeno();
      this.atualizarPainelDestino();
      alert('Marco zero salvo. Gere novamente o QR Code e fixe a nova versão exatamente neste ponto do ambiente.');
      return true;
    }
    State.posicaoUsuario = {
      x: coordenada.x,
      z: coordenada.z
    };
    this.aguardandoPosicao = false;
    State.sincronizarAmbienteAtual();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
    this.atualizarPainelDestino();
    return true;
  },

  definirMarcoZero() {
    if (State.perfilAtual !== 'admin') {
      alert('Somente administrador local pode definir o marco zero.');
      return;
    }
    this.aguardandoMarcoZero = true;
    MinimapModule.abrirModal();
    const status = document.getElementById('tracking-status');
    if (status) status.textContent = 'Toque na planta exatamente onde o QR Code ficará fixado.';
  },

  limparDestino() {
    State.destinoId = null;
    State.sincronizarAmbienteAtual();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
    this.atualizarPainelDestino();
  }
};

document.addEventListener('DOMContentLoaded', () => ScannerModule.atualizarPainelDestino());
