# SMUPLOC — Roadmap do projeto

> Documento vivo de planejamento. Atualizar sempre que uma melhoria for definida, iniciada, concluída ou descartada.
>
> **Legenda**
> - [ ] Pendente
> - [x] Concluído
> - [~] Em andamento
> - [!] Depende de validação, API, infraestrutura ou hardware

## 1. Agora — estabilização e validação

Objetivo: garantir que o fluxo atual seja confiável antes de ampliar as funcionalidades.

### Autenticação, primeiro acesso e hierarquia
- [x] Criar tela de login e primeiro acesso, com validação local dos dígitos verificadores do CPF e contrato de API documentado.
- [x] Remover seletor de perfil livre da interface; perfil passa a derivar da sessão autenticada.
- [!] Login real, bootstrap de uso único, verificação de identidade do CPF, sessão segura e autorização server-side dependem da API HTTPS/PostgreSQL.
- [!] Modo demonstração local é explicitamente não autenticado e somente perfil cliente; não usar com dados reais.
- [ ] Implementar backend de bootstrap único, CPF com proteção de dados, nome de usuário e troca obrigatória da credencial temporária.
- [ ] Adicionar MFA administrativo, revogação de sessão, recuperação segura e testes de isolamento multi-organização.

### Leitura de QR Code e ficha digital
- [x] Leitura de QR Code validada pelo usuário no dispositivo testado; falta repetir no outro tipo de aparelho (computador/celular).
- [x] Confirmar que a leitura de QR Code abre a ficha digital sobre a câmera (validado pelo usuário).
- [x] Testar as seis páginas da ficha em navegador real: Resumo, Monitoramento, Gráficos, Notificações, Calibração e Localização (validado pelo usuário).
- [x] Simular a abertura da ficha e a navegação pelas seis páginas, verificando abas, contador e limites dos botões anterior/próximo.
- [x] Validar pelo usuário a navegação entre as seis páginas e o fechamento da ficha; botões/abas também passaram pela simulação estática.
- [x] Confirmar que a câmera/leitor volta a funcionar depois de fechar a ficha (validado pelo usuário).
- [ ] Testar QR Code desconhecido, inválido, repetido e equipamento sem dados opcionais.
- [x] Alinhar a busca no inventário aos identificadores aceitos pelo leitor (ID, UUID, código, código único, serial, número de série, tag e IDs externos); validar a correspondência em simulação.
- [x] Simular QR desconhecido e conteúdo textual que não é JSON, confirmando que a ficha informa que o cadastro ainda não está vinculado.
- [~] Revisar a experiência em telas pequenas: controles de parede ficaram mais simples e responsivos; falta teste em aparelhos reais.
- [ ] Melhorar mensagens de erro e estados vazios para que o usuário saiba o que aconteceu e como continuar.
- [ ] Verificar se os elementos da ficha continuam funcionando quando faltam informações de certificado, localização ou monitoramento.

### Estabilidade geral
- [ ] Fazer uma revisão dos módulos JavaScript, ordem de carregamento, eventos e referências ao HTML.
- [ ] Verificar erros no console do navegador durante os principais fluxos.
- [x] Conferir a ordem de carregamento dos scripts e confirmar que todos os IDs HTML usados pelo leitor QR, ficha digital e inicialização principal existem no HTML.
- [~] Criar rotina de testes de regressão: CI e testes iniciais de QR, HTML, sintaxe, API e navegação adicionados; execução verde confirmada no commit atual da branch; ampliar cobertura.
- [x] Verificar sintaxe de todos os 14 módulos JavaScript atuais (validação estática; não substitui teste no navegador).
- [x] Documentar como a API deve ser ativada com segurança e como a AR será evoluída; ainda falta um guia operacional de cadastro de equipamentos de teste.

### Situação conhecida
- [x] Corrigida a redeclaração de variável que impedia o módulo do leitor QR de carregar (PR #18).
- [x] Publicação do commit da correção confirmada como `live` no Render.
- [x] Validação prática da câmera, leitura da etiqueta, abertura/navegação da ficha e retomada da câmera após fechar (confirmado pelo usuário na versão publicada anteriormente).
- [!] O deploy publicado não equivale a um teste funcional em todos os navegadores e celulares.

## 2. Próximas etapas — evolução planejada

### Reconhecimento de dispositivos por assinatura do QR Code
- [x] Implementar reconhecimento automático da categoria UC pela combinação observada: `www.smupweb.com.br`, `EL5200.05VUSB` e `correntout2000mA` (regra implementada na branch; significado técnico dos campos ainda precisa ser confirmado).
- [x] Implementar reconhecimento automático da categoria UC HYB quando o conteúdo lido for exatamente `wifismup` (regra implementada na branch; o conteúdo é tratado como senha do Access Point, não como ID individual).
- [ ] Validar no navegador, com etiquetas reais, as regras de reconhecimento da UC e da UC HYB.
- [!] Não confundir reconhecimento da categoria com cadastro automático de uma unidade: a criação individual ainda exige ID único e fluxo de confirmação.
- [ ] Descobrir e documentar a assinatura QR dos dispositivos US.
- [!] Cadastro automático de uma unidade individual ainda depende de identificador único: os dados conhecidos da UC não incluem número de série confirmado e o QR da UC HYB contém somente a senha do Access Point. A senha é tratada como informação sensível e não é usada como ID nem exibida na ficha.
- [~] Criar fluxo de cadastro provisório a partir de assinatura reconhecida, com confirmação do técnico, ID local gerado e posicionamento pendente; QR compartilhado ainda exige confirmação humana.
- [ ] Após obter identificadores individuais confiáveis, automatizar vínculo definitivo e evitar duplicidades.

### Cadastro e ficha dos ativos
- [ ] Padronizar o cadastro de qualquer ativo físico: nome, categoria, fabricante, modelo, código, cliente, unidade, prédio, andar, setor e ambiente.
- [ ] Diferenciar claramente **ativo/localizável** de **dispositivo monitorado**.
- [ ] Permitir anexar fotos, manuais, documentos e certificados ao cadastro.
- [ ] Melhorar a ficha QR para apresentar informações conforme o tipo de ativo e o nível de acesso.
- [ ] Definir um identificador único e estável para cada ativo, independente da descrição impressa no QR Code.

### Certificados e calibração
- [ ] Definir os campos de calibração: número do certificado, laboratório, data, validade e resultado.
- [ ] Permitir visualizar e abrir o PDF do certificado na ficha do equipamento.
- [ ] Exibir claramente quando o certificado estiver ausente, vencido ou próximo do vencimento.
- [ ] Planejar histórico de certificados e calibrações, quando houver dados disponíveis.

### Dados, persistência e integração SMUP
- [~] Fonte central de dados: esquema PostgreSQL, API própria inicial e cliente frontend opcional criados; login e sincronização continuam bloqueados até publicar/testar API e banco. A interface não deve simular um login funcional antes disso.
- [~] Backend inicial com Express, JWT, papéis, isolamento por organização, validação e auditoria implementado; criação administrativa de usuários adicionada; redefinição de acesso, testes de integração e publicação pendentes.
- [ ] Sincronização autenticada entre dispositivos. Cliente API carregado, mas ainda sem sincronização automática; preservar modo local e exportação/importação até validar migração.
- [!] Integração com API oficial SMUP adiada conforme decisão do projeto.
- [ ] Integrar dados de monitoramento da SMUP: leituras, temperatura, umidade, sinal, histórico e atualização mais recente, conforme disponibilidade da API.
- [ ] Integrar alarmes, notificações e ocorrências, respeitando permissões.
- [ ] Evitar duplicar no SMUPLOC funções já oferecidas pelo smuPweb: o SMUPLOC deve acrescentar localização, orientação e contexto espacial.
- [ ] Planejar funcionamento com conexão instável, fila offline e resolução de conflitos.

### Plantas e navegação indoor
- [ ] Padronizar cadastro de clientes, locais, prédios, andares, plantas, setores e ambientes.
- [ ] Permitir posicionar ativos cadastrados na planta baixa.
- [ ] Calibrar a escala da planta com medidas reais.
- [ ] Cadastrar QR Codes como marcos espaciais com posição conhecida.
- [ ] Permitir que o usuário defina ou corrija manualmente sua posição.
- [~] Melhorar a orientação até um ativo: roteador A* em grade, desenho de obstáculos por dois pontos e rota visual evitando paredes cadastradas implementados; controles de largura no painel e bloqueio do arraste durante o desenho adicionados; falta validar em plantas reais e calibrar escala.
- [ ] Testar a navegação em locais reais, medir o erro de posicionamento e verificar rotas com paredes/portas reais.

### Itens de maior esforço — precisam de projeto técnico e decisões antes de implementar

Estes itens não são pequenas correções. Precisam de arquitetura, testes e/ou dependências externas; devem ser analisados em etapas antes de começar a codificação:

- [~] **Backend compartilhado e sincronização:** esquema PostgreSQL, API Express, login JWT, perfis, isolamento por organização, auditoria, listagem/criação de usuários e cliente API opcional implementados em código; faltam interface de login, sincronização real, testes com banco, infraestrutura e migração com backup.
- [!] **Integração com a API oficial SMUP:** deliberadamente adiada; não iniciar nesta fase.
- [~] **Cadastro automático seguro:** reconhecimento de categoria e cadastro provisório com confirmação humana implementados; vínculo definitivo ainda depende de identificador individual e regras para QR compartilhado.
- [~] **Navegação indoor confiável:** A* e cadastro manual de obstáculos implementados em código; falta estrutura completa por pavimento, portas/áreas restritas, escala real e validação de campo.
- [~] **AR ancorada no ambiente:** diagnóstico de compatibilidade e documento técnico `docs/AR-ROADMAP.md` implementados; sessão AR, hit-test, ancoragem persistente e reconhecimento de planos/profundidade continuam pendentes.
- [~] **Experiência mobile:** reforçar alvos de toque, rolagem, foco acessível e comportamento do painel em telas pequenas; controles de obstáculos simplificados; testes em aparelhos/navegadores reais ainda pendentes.
- [~] **Testes automatizados de regressão:** CI verde confirmado no commit atual; testes iniciais de QR, sintaxe, integridade HTML, cliente API e A* adicionados; ampliar cobertura de cadastro, ficha, planta, API real e persistência.

## 3. Futuro — recursos avançados

### Realidade aumentada (AR)
- [x] Documentar arquitetura, limites e matriz de testes em `docs/AR-ROADMAP.md`.
- [~] Diagnóstico de compatibilidade WebXR/câmera/sensores/WebGL sem solicitar permissões; sessão AR ancorada e integração ARCore/ARKit continuam pendentes.
- [ ] Ancorar marcadores e fichas de ativos em posições físicas reconhecidas pela câmera.
- [ ] Avaliar reconhecimento de paredes, planos, profundidade e obstáculos em dispositivos compatíveis.
- [ ] Criar uma experiência de orientação visual que indique o caminho até o ativo.
- [ ] Implementar alternativas para celulares sem suporte aos recursos avançados de AR.

### Localização e precisão
- [ ] Combinar marcos QR cadastrados com sensores do celular para corrigir deriva de movimento.
- [ ] Avaliar sensores adicionais, como Bluetooth beacons, UWB ou infraestrutura disponível no cliente.
- [ ] Comparar precisão, custo, consumo de bateria e compatibilidade das tecnologias.
- [ ] Criar ferramentas para medir e registrar a precisão em diferentes ambientes.

### Rotas e inteligência espacial
- [ ] Criar rotas entre a posição do usuário e o ativo desejado.
- [ ] Considerar paredes, portas, corredores, áreas restritas e obstáculos.
- [ ] Permitir rotas por andar e orientação entre pavimentos.
- [ ] Avaliar rotas acessíveis e restrições específicas de cada ambiente.

## 4. Ideias futuras — explorar antes de assumir compromisso

- [ ] Modo de onboarding para visitantes, novos funcionários e prestadores de serviço.
- [ ] Perfis e permissões diferentes para técnicos SMUP, manutenção, calibração, funcionários e visitantes.
- [ ] Histórico de intervenções e anotações de campo por ativo.
- [ ] Registro de fotos do local e observações feitas durante uma visita.
- [ ] Alertas de certificado vencendo e manutenção preventiva.
- [ ] Busca por linguagem natural: por exemplo, “encontrar o freezer do laboratório de microbiologia”.
- [ ] Leitura de QR para abrir instruções de segurança e procedimentos do equipamento.
- [ ] Painel administrativo para gerenciar vários clientes, unidades e prédios.
- [ ] Importação de plantas e cadastros a partir de planilhas.
- [ ] Modo offline para consultar plantas e dados previamente sincronizados.
- [ ] Relatórios de ativos sem localização, com cadastro incompleto ou com documentação vencida.
- [ ] Mapa de calor de ativos e áreas com maior concentração de equipamentos.
- [ ] Integração com sistemas de chamados e manutenção, caso existam APIs autorizadas.
- [ ] Avaliar uso de visão computacional para reconhecer equipamentos e apoiar o cadastro, sempre com confirmação do usuário.

## 5. Princípios do produto

1. **O SMUPLOC localiza e orienta.** O smuPweb continua sendo a referência para o monitoramento já existente.
2. **Qualquer ativo pode ser localizado.** Nem todo ativo precisa ser um dispositivo monitorado pela SMUP.
3. **QR identifica; cadastro espacial localiza.** O QR Code identifica o ativo. A posição física precisa estar cadastrada ou ser determinada por um recurso de localização.
4. **Dados reais não podem ser simulados como se fossem reais.** Enquanto a API não estiver integrada, a interface deve indicar claramente dados indisponíveis ou de demonstração.
5. **Compatibilidade importa.** Recursos avançados de câmera e AR devem ter alternativas para aparelhos incompatíveis.
6. **Validar antes de expandir.** Priorizar testes em ambientes reais antes de adicionar camadas complexas.

## 6. Dependências e limitações conhecidas

- A integração com a API oficial da SMUP ainda não foi realizada. Depende de documentação, credenciais e autorização.
- O projeto atual é publicado como site estático e utiliza armazenamento local no navegador para os dados locais. Isso não substitui um backend compartilhado.
- A ficha com aparência 3D é uma apresentação visual; ainda não significa que o painel esteja ancorado espacialmente no ambiente por AR.
- A leitura de QR Code não determina, sozinha, a posição do usuário nem a posição do ativo.
- Precisão indoor depende de marcos conhecidos, sensores, calibração e validação no local.
- Disponibilidade de profundidade, rastreamento e AR varia conforme aparelho, sistema operacional e navegador.

---

**Regra de manutenção:** quando uma ideia nova surgir, registrá-la em “Ideias futuras”. Quando houver decisão de implementar, movê-la para “Próximas etapas” ou “Agora”, conforme prioridade. Marcar como concluída somente depois de validar o resultado.
