# SMUPLOC — política de identidade, acesso e hierarquia

## Estado desta entrega
A interface de autenticação e o fluxo de primeiro acesso estão preparados no frontend. **Não há autenticação real até publicar e configurar a API HTTPS e PostgreSQL.** O botão “Demonstração local” é explicitamente não autenticado, usa perfil cliente e não deve ser usado para dados reais.

Nenhuma senha, CPF, token de bootstrap ou credencial administrativa pode ser gravada em HTML, JavaScript, CSS, Git, localStorage ou documentação operacional.

## Primeiro acesso do administrador
1. O servidor provisiona uma única conta bootstrap `admin`, com credencial temporária definida fora do repositório (secret manager/variável protegida).
2. O único e-mail autorizado para ativação inicial é o endereço fornecido pelo proprietário do sistema e configurado em `BOOTSTRAP_ADMIN_EMAIL` no ambiente protegido do servidor. Não publicar esse endereço no repositório nem confiar no valor enviado pelo navegador.
3. A API envia um código aleatório de verificação para esse endereço. O código deve expirar em poucos minutos, ser armazenado somente como hash, ser de uso único e ter limites rígidos de envio e tentativas.
4. O administrador apresenta a credencial temporária e o código recebido por e-mail, escolhe nome de usuário e senha forte (mínimo 12 caracteres).
5. A API verifica e-mail autorizado, código, validade, tentativas e estado bootstrap ainda não consumido. O primeiro administrador é criado atomicamente; o código e a credencial bootstrap são invalidados.
6. A senha é armazenada exclusivamente como hash Argon2id (preferencial) ou bcrypt com fator de custo adequado. Nunca reversível.
7. O endereço confirmado comprova acesso à caixa postal, não identidade civil. Não coletar CPF neste fluxo. Para verificação de identidade civil futura, usar provedor autorizado e finalidade/base legal definidas.

**Importante sobre admin/admin:** a combinação foi indicada pelo usuário como credencial inicial temporária. Não pode ser embutida no frontend ou armazenada no Git. A API deve aceitar eventual credencial bootstrap somente uma vez, exigir troca imediata e nunca permitir seu uso como senha permanente. Antes de exposição pública, substituir por segredo aleatório forte entregue por canal seguro.

## Hierarquia e permissões

| Recurso | Administrador | Técnico | Cliente |
|---|---|---|---|
| Ver ambientes e ativos autorizados | Sim | Sim | Sim |
| Criar/editar ambientes e ativos | Sim | Sim | Não |
| Excluir ativos | Sim | Não | Não |
| Gerenciar usuários e papéis | Sim | Não | Não |
| Configurar organização e integrações | Sim | Não | Não |
| Posicionar ativos e calibrar planta | Sim | Conforme atribuição | Não |
| Desenhar obstáculos/ajustar rotas | Sim | Sim | Consultar rota |
| Exportar dados da organização | Sim | Conforme autorização | Não por padrão |
| Consultar telemetria/certificados | Conforme autorização | Conforme autorização | Conforme autorização |

## Regras obrigatórias de segurança
- Negar por padrão; autorização validada na API em cada rota, nunca apenas escondendo botões.
- Toda consulta/mutação deve filtrar por `organization_id` derivado do token validado, nunca do corpo enviado pelo cliente.
- Usuário não pode escolher seu próprio papel, organização ou privilégios.
- Administrador não pode criar administrador global; novos admins exigem confirmação/auditoria.
- JWT curto, rotação/revogação de sessão e armazenamento preferencial em cookie HttpOnly + Secure + SameSite quando arquitetura permitir. O token atual em sessionStorage é provisório e não é o destino de produção.
- HTTPS obrigatório, CORS por allowlist, rate limit, proteção contra enumeração, logs sem segredos/CPF, auditoria imutável para ações críticas.
- MFA obrigatório para administradores antes de produção.
- Recuperação de senha por fluxo verificado, nunca por envio da senha existente.
- Testes de autorização negativa, isolamento entre organizações, abuso de sessão, CSRF/XSS e restauração de backup antes da liberação.
- CPF é dado pessoal: coletar somente quando necessário, com aviso de privacidade, base legal, controle de acesso e retenção definida.


## Autenticação dos usuários pela SMUP e acesso administrativo local

### Decisão de arquitetura

O SMUPLOC terá duas vias de acesso, com finalidades e autoridades distintas:

1. **Usuários comuns — autenticação integral pela SMUP:** o usuário informa e-mail e número de telefone no fluxo oficial já utilizado pela SMUP. A SMUP envia o token por SMS e realiza a validação. Após a autenticação, o SMUPLOC recebe uma confirmação de identidade por integração oficial e confiável com o backend/serviço de identidade da SMUP. O SMUPLOC não envia o SMS, não valida o código e não mantém senha própria para esses usuários.
2. **Administrador de manutenção do SMUPLOC — autenticação local separada:** conta administrativa própria, restrita à manutenção técnica, configuração e administração do SMUPLOC. Essa conta não substitui nem participa do login normal dos usuários autenticados pela SMUP.

O login local de administrador não deve ser apresentado como alternativa comum para usuários finais. A interface deve deixar clara a separação entre “Entrar com a SMUP” e o acesso administrativo restrito.

### Integração com a autenticação SMUP

- O SMUPLOC deve atuar como cliente/consumidor da autenticação oficial da SMUP; não deve recriar o fluxo de e-mail, telefone ou SMS.
- A confirmação de autenticação precisa ser entregue ao backend SMUPLOC por mecanismo oficial e verificável (por exemplo, protocolo de federação/SSO, token assinado ou troca server-to-server), conforme o contrato que a SMUP disponibilizar.
- **Não presumir OIDC, OAuth, API ou webhook específico** antes de receber documentação oficial. O adaptador de identidade deve isolar o protocolo para permitir implementação quando o contrato real for conhecido.
- O backend deve validar origem, assinatura/credenciais, emissor, público, validade, nonce/state ou proteção contra replay, conforme o mecanismo oficial escolhido.
- Não aceitar como prova de identidade isolada o username do Telegram, telefone digitado, e-mail informado, chat_id, captura de tela, mensagem do bot ou payload enviado diretamente pelo navegador.
- O navegador nunca recebe segredos da integração. Credenciais e chaves ficam somente no ambiente protegido/secret manager do backend.
- Após a confirmação oficial, o SMUPLOC resolve a identidade externa para uma conta local e aplica os papéis e organizações cadastrados no próprio SMUPLOC. A autenticação SMUP não concede automaticamente papel administrativo nem acesso a qualquer organização.
- Contas comuns devem ser provisionadas ou vinculadas segundo regra aprovada pela SMUP; contas não reconhecidas devem seguir fluxo controlado, sem criar privilégios automaticamente.
- A indisponibilidade do serviço de identidade SMUP não deve provocar fallback silencioso para login local comum. O acesso administrativo de manutenção permanece separado e restrito.
- Não criar, registrar ou modificar outro bot. O bot/fluxo oficial existente da SMUP permanece sob responsabilidade da SMUP.

### Contrato futuro e preparação do código

Criar uma interface de provedor de identidade (adaptador SMUP) independente do protocolo. Ela deverá receber uma resposta autenticada do serviço oficial e devolver ao núcleo de autenticação uma identidade externa estável e validada. O núcleo então cria a sessão local SMUPLOC e carrega permissões/organizações do banco local.

As rotas definitivas, campos, callbacks e formato dos tokens ficam **pendentes da documentação e autorização da SMUP**. Não implementar endpoints fictícios nem simular validação SMS.

### Acesso administrativo de manutenção

- Manter uma conta local administrativa separada, criada pelo fluxo de primeiro acesso seguro descrito acima.
- A conta local serve para manutenção/configuração do SMUPLOC; não deve ser usada para autenticar clientes, técnicos ou usuários comuns.
- Exigir senha forte, hash Argon2id (preferencial) ou bcrypt, MFA antes de produção, sessão segura, rate limit, auditoria e recuperação controlada.
- Não embutir credenciais administrativas no frontend, no Git ou na documentação.
- Proteger rotas administrativas no backend; esconder telas no frontend não é controle de acesso suficiente.

## Contrato de API esperado pelo frontend
- `POST /api/auth/login`: `{ username, password }` → `{ token, user: { id, username, name, role } }`
- `POST /api/auth/bootstrap/send-code`: `{ email }` → envia código somente ao e-mail bootstrap autorizado, sem revelar se outros endereços existem.\n- `POST /api/auth/first-access`: `{ bootstrapUsername, bootstrapPassword, email, emailCode, username, password }` → valida código e e-mail, invalida bootstrap e conclui configuração inicial.
- Futuro: `POST /api/auth/logout`, `GET /api/me`, renovação/revogação de sessão, MFA e recuperação de senha.

As rotas de primeiro acesso devem ser limitadas, idempotentes e fechadas após a criação do primeiro administrador. Não aceitar o CPF como prova de identidade sem validação adicional apropriada.
