/**
 * Gerenciamento local dos equipamentos cadastrados no SMUPLOC.
 * Não representa estado de comunicação nem substitui a API da SMUP.
 */
const EquipmentModule = {
  painelAberto: false,

  abrir() {
    if (State.perfilAtual === 'cliente') {
      alert('O modo cliente pode apenas visualizar os equipamentos.');
      return;
    }
    this.painelAberto = true;
    const painel = document.getElementById('painel-equipamentos');
    if (painel) painel.hidden = false;
    this.render();
  },

  fechar() {
    this.painelAberto = false;
    const painel = document.getElementById('painel-equipamentos');
    if (painel) painel.hidden = true;
  },

  render() {
    const lista = document.getElementById('lista-equipamentos');
    const contador = document.getElementById('contador-equipamentos');
    if (!lista) return;

    lista.replaceChildren();
    const equipamentos = Array.isArray(State.equipamentos) ? State.equipamentos : [];
    if (contador) contador.textContent = String(equipamentos.length);

    if (!equipamentos.length) {
      const vazio = document.createElement('p');
      vazio.className = 'equipamentos-vazio';
      vazio.textContent = 'Nenhum equipamento cadastrado neste dispositivo.';
      lista.appendChild(vazio);
      return;
    }

    equipamentos.forEach(eq => {
      const card = document.createElement('article');
      card.className = 'equipamento-card';

      const titulo = document.createElement('strong');
      titulo.textContent = String(eq.nome || 'Equipamento sem nome');
      const meta = document.createElement('p');
      meta.textContent = `ID: ${String(eq.id || '—')} · Tipo: ${String(eq.tipo || 'Não informado')}`;
      const local = document.createElement('p');
      local.textContent = eq.posicionado === false
        ? 'Posição: aguardando posicionamento na planta'
        : `Posição local: X ${Number(eq.x || 0).toFixed(2)} m · Z ${Number(eq.z || 0).toFixed(2)} m`;
      const setor = document.createElement('p');
      setor.textContent = `Setor: ${String(eq.setor || 'Não informado')}`;

      const acoes = document.createElement('div');
      acoes.className = 'equipamento-acoes';
      const editar = this.criarBotao('Editar', () => this.editar(eq.id));
      const posicionar = this.criarBotao(eq.posicionado === false ? 'Posicionar' : 'Reposicionar', () => this.reposicionar(eq.id));
      const excluir = this.criarBotao('Excluir', () => this.excluir(eq.id), 'btn-excluir-equipamento');
      acoes.append(editar, posicionar, excluir);
      card.append(titulo, meta, local, setor, acoes);
      lista.appendChild(card);
    });
  },

  criarBotao(rotulo, acao, classe = '') {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = classe;
    botao.textContent = rotulo;
    botao.addEventListener('click', acao);
    return botao;
  },

  localizar(id) {
    return State.equipamentos.find(eq => String(eq.id) === String(id));
  },

  editar(id) {
    const eq = this.localizar(id);
    if (!eq) return;

    const nome = prompt('Nome do equipamento:', String(eq.nome || ''));
    if (nome === null) return;
    if (!nome.trim()) {
      alert('O nome do equipamento não pode ficar vazio.');
      return;
    }

    const setor = prompt('Setor / ambiente:', String(eq.setor || ''));
    if (setor === null) return;
    const tipo = prompt('Tipo do equipamento (UR, UC, US, PT100):', String(eq.tipo || 'UR'));
    if (tipo === null) return;

    const tipoNormalizado = tipo.trim().toUpperCase();
    const tiposPermitidos = ['UR', 'UC', 'US', 'PT100'];
    if (!tiposPermitidos.includes(tipoNormalizado)) {
      alert('Tipo inválido. Utilize UR, UC, US ou PT100.');
      return;
    }

    const anterior = { ...eq };
    eq.nome = nome.trim().slice(0, 100);
    eq.setor = setor.trim().slice(0, 100);
    eq.tipo = tipoNormalizado;
    if (!State.salvarEquipamentos()) {
      Object.assign(eq, anterior);
      return;
    }
    this.render();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
  },

  reposicionar(id) {
    const eq = this.localizar(id);
    if (!eq) return;
    this.fechar();
    MinimapModule.equipamentoAguardandoPosicao = eq;
    MinimapModule.abrirModal();
    alert('Toque no ponto correto da planta para posicionar o equipamento.');
  },

  excluir(id) {
    const eq = this.localizar(id);
    if (!eq) return;
    if (!confirm(`Excluir "${String(eq.nome || eq.id)}" do cadastro local?`)) return;

    const indice = State.equipamentos.indexOf(eq);
    State.equipamentos.splice(indice, 1);
    if (!State.salvarEquipamentos()) {
      State.equipamentos.splice(indice, 0, eq);
      return;
    }
    if (MinimapModule.equipamentoAguardandoPosicao === eq) {
      MinimapModule.equipamentoAguardandoPosicao = null;
    }
    this.render();
    MinimapModule.renderExpandido();
    MinimapModule.renderPequeno();
  }
};
