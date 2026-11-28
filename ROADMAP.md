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

### Leitura de QR Code e ficha digital
- [ ] Testar a leitura de QR Code em computador e celular, com permissões de câmera concedidas.
- [ ] Confirmar que a leitura de um equipamento cadastrado abre a ficha digital centralizada sobre a câmera.
- [ ] Testar as seis páginas da ficha: Resumo, Monitoramento, Gráficos, Notificações, Calibração e Localização.
- [ ] Testar navegação entre páginas, botões anterior/próximo, abas e fechamento da ficha.
- [ ] Confirmar que a câmera/leitor volta a funcionar depois de fechar a ficha.
- [ ] Testar QR Code desconhecido, inválido, repetido e equipamento sem dados opcionais.
- [ ] Revisar a experiência em telas pequenas: painel, textos, botões, rolagem e toque.
- [ ] Melhorar mensagens de erro e estados vazios para que o usuário saiba o que aconteceu e como continuar.
- [ ] Verificar se os elementos da ficha continuam funcionando quando faltam informações de certificado, localização ou monitoramento.

### Estabilidade geral
- [ ] Fazer uma revisão dos módulos JavaScript, ordem de carregamento, eventos e referências ao HTML.
- [ ] Verificar erros no console do navegador durante os principais fluxos.
- [x] Conferir a ordem de carregamento dos scripts e confirmar que todos os IDs HTML usados pelo leitor QR, ficha digital e inicialização principal existem no HTML.
- [ ] Criar uma rotina de testes de regressão para não quebrar recursos já existentes ao adicionar novos.
- [x] Verificar sintaxe de todos os 14 módulos JavaScript atuais (validação estática; não substitui teste no navegador).
- [ ] Documentar como cadastrar equipamentos de teste e como reproduzir os principais cenários.

### Situação conhecida
- [x] Corrigida a redeclaração de variável que impedia o módulo do leitor QR de carregar (PR #18).
- [x] Publicação do commit da correção confirmada como `live` no Render.
- [ ] Validação prática da câmera, leitura e ficha após o deploy.
- [!] O deploy publicado não equivale a um teste funcional em todos os navegadores e celulares.

## 2. Próximas etapas — evolução planejada

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
- [ ] Definir uma fonte central de dados para os cadastros, em vez de depender somente do armazenamento local do navegador.
- [ ] Planejar backend, autenticação, permissões e sincronização entre dispositivos.
- [ ] Obter documentação, credenciais e autorização da API oficial da SMUP.
- [ ] Integrar dados de monitoramento da SMUP: leituras, temperatura, umidade, sinal, histórico e atualização mais recente, conforme disponibilidade da API.
- [ ] Integrar alarmes, notificações e ocorrências, respeitando permissões.
- [ ] Evitar duplicar no SMUPLOC funções já oferecidas pelo smuPweb: o SMUPLOC deve acrescentar localização, orientação e contexto espacial.
- [ ] Planejar funcionamento com conexão instável e sincronização posterior.

### Plantas e navegação indoor
- [ ] Padronizar cadastro de clientes, locais, prédios, andares, plantas, setores e ambientes.
- [ ] Permitir posicionar ativos cadastrados na planta baixa.
- [ ] Calibrar a escala da planta com medidas reais.
- [ ] Cadastrar QR Codes como marcos espaciais com posição conhecida.
- [ ] Permitir que o usuário defina ou corrija manualmente sua posição.
- [ ] Melhorar a orientação até um ativo, exibindo destino, direção e distância estimada.
- [ ] Testar a navegação em locais reais e medir o erro de posicionamento.

## 3. Futuro — recursos avançados

### Realidade aumentada (AR)
- [ ] Investigar uso de WebXR e, quando necessário, soluções nativas com ARCore/ARKit.
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
