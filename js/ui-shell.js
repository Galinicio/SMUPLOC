/**
 * Shell da interface SMUPLOC: painel lateral esquerdo com três áreas claras.
 * Planta, Mini mapa e Configurações compartilham uma única navegação.
 */
const UIShell = {
  secaoAtiva: 'minimapa',
  zoomMapa: 1,

  montarMenu() {
    const modal = document.getElementById('modal-planta');
    if (!modal || modal.dataset.menuMontado === 'true') return;
    modal.dataset.menuMontado = 'true';

    const nav = document.createElement('nav');
    nav.className = 'menu-principal-nav';
    nav.setAttribute('aria-label', 'Áreas do SMUPLOC');
    const conteudo = document.createElement('div');
    conteudo.className = 'menu-principal-conteudo';
    const cabecalho = modal.querySelector('.modal-header');

    const planta = this.criarSecao('planta', 'Planta baixa', 'Importar, calibrar e mapear');
    const mapa = this.criarSecao('minimapa', 'Mini mapa', 'Visualizar e navegar');
    const config = this.criarSecao('config', 'Configurações', 'Ambiente e preferências');

    const botoes = [
      ['planta','▦','Planta baixa'],
      ['minimapa','⌖','Mini mapa'],
      ['config','⚙','Configurações']
    ];
    botoes.forEach(([id,icone,nome]) => {
      const b=document.createElement('button');
      b.type='button'; b.className='menu-nav-item'; b.dataset.section=id;
      b.innerHTML='<span class="menu-nav-icone" aria-hidden="true">'+icone+'</span><span>'+nome+'</span>';
      b.addEventListener('click',()=>this.mostrarSecao(id));
      nav.appendChild(b);
    });

    const ambientes=document.getElementById('ambientes-acoes');
    const perfil=document.getElementById('perfil-acoes');
    const canvas=document.getElementById('canvas-expandido-container');
    const equipamentos=document.getElementById('painel-equipamentos');
    const ferramentas=document.getElementById('ferramentas-avancadas');
    const seletor=ferramentas?.querySelector('.mapear-seletor');
    const calibrar=ferramentas?.querySelector('[onclick*="iniciarCalibracao"]');
    const analisar=ferramentas?.querySelector('[onclick*="PlanAnalysis.analisar"]');
    const controles=document.getElementById('controles-admin');
    const limpar=controles?.querySelector('[onclick*="limparTudo"]');
    const btnEquipamentos=controles?.querySelector('[onclick*="EquipmentModule.abrir"]');

    if (ambientes) config.body.appendChild(ambientes);
    if (perfil) config.body.appendChild(perfil);
    if (limpar) config.body.appendChild(limpar);
    if (seletor) planta.body.appendChild(seletor);
    if (calibrar) planta.body.appendChild(calibrar);
    if (analisar) planta.body.appendChild(analisar);
    const upload=controles?.querySelector('label');
    if (upload) planta.body.appendChild(upload);
    if (canvas) mapa.body.appendChild(canvas);
    if (equipamentos) mapa.body.appendChild(equipamentos);
    if (btnEquipamentos) mapa.body.appendChild(btnEquipamentos);

    const zoom=document.createElement('div');
    zoom.className='mapa-zoom-controles';
    zoom.innerHTML='<button type="button" aria-label="Diminuir zoom">−</button><span>Zoom</span><button type="button" aria-label="Aumentar zoom">+</button>';
    zoom.children[0].addEventListener('click',()=>this.ajustarZoom(-0.15));
    zoom.children[2].addEventListener('click',()=>this.ajustarZoom(0.15));
    mapa.body.insertBefore(zoom,canvas);

    conteudo.append(planta.root,mapa.root,config.root);
    if (cabecalho) {
      cabecalho.after(nav,conteudo);
      cabecalho.querySelector('.modal-title').textContent='SMUPLOC';
      const subtitulo=cabecalho.querySelector('.subtitle-perfil');
      if(subtitulo) subtitulo.textContent='Ferramentas do ambiente';
    }
    if (ferramentas) ferramentas.remove();
    this.mostrarSecao('minimapa');
  },

  criarSecao(id,titulo,descricao) {
    const root=document.createElement('section');
    root.className='menu-secao';
    root.dataset.section=id;
    root.hidden=true;
    const heading=document.createElement('div');
    heading.className='menu-secao-cabecalho';
    heading.innerHTML='<strong>'+titulo+'</strong><span>'+descricao+'</span>';
    const body=document.createElement('div');
    body.className='menu-secao-corpo';
    root.append(heading,body);
    return {root,body};
  },

  mostrarSecao(id) {
    this.secaoAtiva=id;
    document.querySelectorAll('.menu-secao').forEach(el=>el.hidden=el.dataset.section!==id);
    document.querySelectorAll('.menu-nav-item').forEach(el=>{
      const ativo=el.dataset.section===id;
      el.classList.toggle('ativo',ativo);
      el.setAttribute('aria-current',ativo?'page':'false');
    });
  },

  ajustarZoom(delta) {
    this.zoomMapa=Math.max(0.7,Math.min(2.2,this.zoomMapa+delta));
    const canvas=document.getElementById('canvas-expandido');
    if(!canvas)return;
    const px=Math.round(360*this.zoomMapa);
    canvas.style.width=px+'px';
    canvas.style.height=px+'px';
    const label=document.querySelector('.mapa-zoom-controles span');
    if(label)label.textContent=Math.round(this.zoomMapa*100)+'%';
  },

  abrirPainel() {
    if(typeof ScannerModule!=='undefined')ScannerModule.fechar();
    if(typeof EquipmentModule!=='undefined')EquipmentModule.fechar();
    const camera=document.getElementById('camera-mapeamento');
    if(camera)camera.hidden=true;
    const modal=document.getElementById('modal-planta');
    if(modal){modal.style.display='flex';this.montarMenu();}
    const opcoes=document.getElementById('mapear-opcoes');
    if(opcoes)opcoes.hidden=true;
  },

  fecharPainel() {
    if(typeof MapearModule!=='undefined'&&(MapearModule.ativo||MapearModule.calibracaoAtiva)){
      if(!confirm('Sair do mapeamento atual? Os pontos ainda não salvos serão descartados.'))return false;
      MapearModule.cancelar(true);
    }
    const modal=document.getElementById('modal-planta');
    if(modal)modal.style.display='none';
    if(typeof EquipmentModule!=='undefined')EquipmentModule.fechar();
    return true;
  },

  alternarOpcoesMapeamento() {
    const opcoes=document.getElementById('mapear-opcoes');
    const botao=document.querySelector('.mapear-seletor > button');
    if(!opcoes)return;
    opcoes.hidden=!opcoes.hidden;
    if(botao)botao.setAttribute('aria-expanded',String(!opcoes.hidden));
  },

  selecionarMapeamento(modo) {
    const opcoes=document.getElementById('mapear-opcoes');
    if(opcoes)opcoes.hidden=true;
    if(modo==='planta'){
      if(!State.plantaImageBase64){alert('Importe uma planta baixa antes de iniciar.');return;}
      this.mostrarSecao('planta');MapearModule.iniciar();
    } else if(modo==='camera') MapearModule.iniciarCamera();
  },

  voltarDaCamera() {
    if(typeof MapearModule!=='undefined')MapearModule.encerrarCamera();
    this.abrirPainel();this.mostrarSecao('planta');
  }
};

document.addEventListener('DOMContentLoaded',()=>{
  UIShell.montarMenu();
  const modal=document.getElementById('modal-planta');
  if(modal)modal.addEventListener('click',e=>{if(e.target===modal)UIShell.fecharPainel();});
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    const camera=document.getElementById('camera-mapeamento');
    const scanner=document.getElementById('scanner-overlay');
    if(camera&&!camera.hidden)UIShell.voltarDaCamera();
    else if(scanner&&!scanner.hidden)ScannerModule.fechar();
    else if(modal&&modal.style.display==='flex')UIShell.fecharPainel();
  });
});
