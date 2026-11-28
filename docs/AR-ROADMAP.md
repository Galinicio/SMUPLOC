# SMUPLOC — plano técnico de realidade aumentada

**Estado atual:** diagnóstico de capacidades implementado; não existe ainda uma sessão de AR espacial ancorada.

## 1. O que existe hoje

- A interface usa A-Frame e MindAR Image como dependências visuais/de rastreamento de imagem.
- O leitor de QR identifica etiquetas e abre a ficha digital.
- `js/ar-capabilities.js` verifica contexto seguro, câmera, sensores de movimento, WebGL 2 e suporte anunciado a `immersive-ar`.
- O diagnóstico não solicita permissões, não inicia uma sessão e não mede paredes ou profundidade.
- O painel 3D da ficha é uma apresentação sobre a câmera, não uma âncora espacial persistente.
- A posição e a rota indoor atuais dependem da planta, da escala e dos marcos/posições cadastrados.

## 2. Arquitetura recomendada

A AR deve ser uma camada opcional sobre o mapa indoor, nunca a única forma de usar o produto.

### Caminho A — WebXR em aparelhos compatíveis

1. O usuário inicia a experiência por um botão (gesto explícito).
2. Verificar HTTPS, câmera e `navigator.xr.isSessionSupported('immersive-ar')`.
3. Solicitar uma sessão `immersive-ar` somente após explicar o uso da câmera.
4. Usar hit-test para encontrar superfícies e orientar a colocação de um marco.
5. Usar anchors apenas quando a implementação do navegador oferecer suporte real.
6. Converter a pose observada para coordenadas locais da planta e associá-la a um QR/marco conhecido.
7. Ao reabrir a experiência, relocalizar pelo marco; não presumir que uma pose de mundo salva continuará válida depois de reiniciar a câmera ou mudar de sessão.

### Caminho B — fallback por câmera e marcadores

- Manter a leitura QR atual como identificação do ativo.
- Avaliar MindAR Image para alvos visuais preparados e conhecidos; ele não transforma automaticamente qualquer QR em uma âncora de mundo.
- Se não houver rastreamento espacial, mostrar seta, distância e planta 2D com posição manual/QR.
- Evitar abrir simultaneamente dois fluxos de câmera. O leitor QR e a experiência AR precisam compartilhar ou coordenar a sessão de câmera.

### Caminho C — aplicativo nativo, se necessário

Se o piloto exigir profundidade, persistência de âncoras ou estabilidade que os navegadores-alvo não entreguem, avaliar um invólucro/aplicativo nativo com ARCore (Android) e ARKit (iOS). Essa decisão deve vir depois de medir o desempenho real no conjunto de celulares usado pelos clientes.

## 3. Limites que não devem ser escondidos

- WebXR, hit-test, anchors, detecção de planos e profundidade variam por navegador e aparelho.
- MindAR Image é rastreamento de imagem-alvo; não equivale a reconstrução 3D geral do ambiente.
- Sensores inerciais acumulam deriva e não substituem marcos espaciais.
- Uma etiqueta QR identifica um ativo; só vira referência espacial depois de ser cadastrada em uma posição conhecida.
- Não anunciar “escaneamento 3D do ambiente” até haver detecção de planos/profundidade medida e validada.
- Não usar a senha compartilhada do Access Point como identificador ou âncora.

## 4. Etapas de implementação

- [x] Diagnóstico de capacidades do navegador sem pedir permissões.
- [x] Documentar caminhos WebXR, fallback por imagem/QR e alternativa nativa.
- [ ] Criar adaptador de sessão AR isolado do leitor QR e da navegação 2D.
- [ ] Implementar início/fim de sessão WebXR após ação explícita do usuário.
- [ ] Implementar hit-test e posicionamento de um marco de teste.
- [ ] Vincular marco QR a coordenadas da planta, com opção de recalibração.
- [ ] Persistir metadados locais de ancoragem sem presumir persistência da pose de mundo.
- [ ] Testar profundidade/planos em aparelhos compatíveis e manter fallback quando ausente.
- [ ] Validar em Android e iOS reais antes de liberar a funcionalidade.

## 5. Matriz mínima de testes

Registrar modelo do aparelho, sistema operacional, navegador/versão, HTTPS, câmera, WebGL 2, WebXR, hit-test, anchors, estabilidade por 5 minutos, erro de posição em metros, aquecimento e consumo de bateria.

A aprovação deve ser por aparelho/navegador testado, não por uma suposição genérica de compatibilidade da plataforma.
