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

## Contrato de API esperado pelo frontend
- `POST /api/auth/login`: `{ username, password }` → `{ token, user: { id, username, name, role } }`
- `POST /api/auth/bootstrap/send-code`: `{ email }` → envia código somente ao e-mail bootstrap autorizado, sem revelar se outros endereços existem.\n- `POST /api/auth/first-access`: `{ bootstrapUsername, bootstrapPassword, email, emailCode, username, password }` → valida código e e-mail, invalida bootstrap e conclui configuração inicial.
- Futuro: `POST /api/auth/logout`, `GET /api/me`, renovação/revogação de sessão, MFA e recuperação de senha.

As rotas de primeiro acesso devem ser limitadas, idempotentes e fechadas após a criação do primeiro administrador. Não aceitar o CPF como prova de identidade sem validação adicional apropriada.
