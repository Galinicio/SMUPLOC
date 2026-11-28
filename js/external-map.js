/** Mapa externo SMUPLOC: Leaflet + tiles OpenStreetMap. Pontos salvos localmente. */
const MapaExternoModule = {
  map:null, camadaPontos:null, marcadorUsuario:null, modoAdicionar:false, pontos:[], chave:'smuploc_pontos_interesse_v1',
  iniciar(){
    if(this.map||typeof L==='undefined')return;
    const el=document.getElementById('mapa-externo-leaflet'); if(!el)return;
    this.map=L.map(el,{zoomControl:false,scrollWheelZoom:true}).setView([-15.7939,-47.8828],12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(this.map);
    this.camadaPontos=L.layerGroup().addTo(this.map);
    try{const s=JSON.parse(localStorage.getItem(this.chave)||'[]');this.pontos=Array.isArray(s)?s.filter(p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))):[]}catch(_){this.pontos=[]}
    this.renderizarPontos();
    this.map.on('click',e=>{if(!this.modoAdicionar)return;const nome=prompt('Nome deste ponto de interesse:');if(nome===null||!nome.trim())return;this.adicionarPonto(nome.trim(),e.latlng.lat,e.latlng.lng);this.alternarModoPonto(false)});
  },
  status(t){const e=document.getElementById('mapa-externo-status');if(e)e.textContent=t},
  mostrar(){const a=document.getElementById('mapa-externo'),b=document.getElementById('mapa-interno-painel');if(a)a.style.display='flex';if(b)b.classList.remove('ativo');document.querySelectorAll('[data-mapa-aba]').forEach(x=>x.classList.toggle('ativa',x.dataset.mapaAba==='externo'));if(!this.map)this.iniciar();requestAnimationFrame(()=>this.map&&this.map.invalidateSize())},
  mostrarInterno(){const a=document.getElementById('mapa-externo'),b=document.getElementById('mapa-interno-painel');if(a)a.style.display='none';if(b)b.classList.add('ativo');document.querySelectorAll('[data-mapa-aba]').forEach(x=>x.classList.toggle('ativa',x.dataset.mapaAba==='interno'));if(typeof MinimapModule!=='undefined')MinimapModule.renderExpandido()},
  localizar(){this.obterGPS(false)},
  marcarCasa(){this.obterGPS(true)},
  obterGPS(casa){
    if(!navigator.geolocation){this.status('Este navegador não oferece geolocalização.');return}
    this.status(casa?'Obtendo GPS para marcar sua casa…':'Solicitando sua localização…');
    navigator.geolocation.getCurrentPosition(pos=>{
      const ll=[pos.coords.latitude,pos.coords.longitude];if(!this.map)this.iniciar();this.map.setView(ll,casa?19:18);
      if(casa){this.pontos=this.pontos.filter(p=>p.tipo!=='casa');this.adicionarPonto('Minha casa (laboratório)',ll[0],ll[1],'casa');this.status('Casa marcada neste navegador. Você pode arrastar o marcador para ajustar.')}
      else{if(this.marcadorUsuario)this.marcadorUsuario.setLatLng(ll);else this.marcadorUsuario=L.marker(ll).addTo(this.map).bindPopup('Você está aqui');this.marcadorUsuario.openPopup();this.status('Localização encontrada. Precisão aproximada informada pelo aparelho: '+Math.round(pos.coords.accuracy)+' m.')}
    },err=>{const m={1:'Permissão de localização negada.',2:'Localização indisponível.',3:'Tempo esgotado ao buscar localização.'};this.status(m[err.code]||'Não foi possível obter a localização.')},{enableHighAccuracy:true,timeout:15000,maximumAge:casa?0:10000})
  },
  alternarModoPonto(ativar){this.modoAdicionar=typeof ativar==='boolean'?ativar:!this.modoAdicionar;const b=document.getElementById('btn-adicionar-ponto');if(b){b.classList.toggle('ativo',this.modoAdicionar);b.textContent=this.modoAdicionar?'Toque no mapa…':'＋ Adicionar ponto'}this.status(this.modoAdicionar?'Toque no mapa para posicionar um ponto de interesse.':'Modo de marcação encerrado.')},
  adicionarPonto(nome,lat,lng,tipo='interesse'){this.pontos.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),nome,lat:Number(lat),lng:Number(lng),tipo});this.salvar();this.renderizarPontos()},
  salvar(){try{localStorage.setItem(this.chave,JSON.stringify(this.pontos))}catch(_){this.status('Não foi possível salvar os pontos neste navegador.')}},
  renderizarPontos(){
    if(!this.camadaPontos)return;this.camadaPontos.clearLayers();
    this.pontos.forEach(p=>{const marker=L.marker([p.lat,p.lng],{draggable:true}).addTo(this.camadaPontos);marker.bindPopup('<strong>'+this.escapar(p.nome)+'</strong><br><small>'+Number(p.lat).toFixed(6)+', '+Number(p.lng).toFixed(6)+'</small><br><button type="button" class="remover-ponto-mapa">Remover ponto</button>');marker.on('dragend',()=>{const ll=marker.getLatLng();p.lat=ll.lat;p.lng=ll.lng;this.salvar()});marker.on('popupopen',e=>{const b=e.popup.getElement()?.querySelector('.remover-ponto-mapa');if(b)b.addEventListener('click',()=>{this.pontos=this.pontos.filter(x=>x.id!==p.id);this.salvar();this.renderizarPontos()},{once:true})})})
  },
  escapar(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
};
document.addEventListener('DOMContentLoaded',()=>MapaExternoModule.iniciar());
