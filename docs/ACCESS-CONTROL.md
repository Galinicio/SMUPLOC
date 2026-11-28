# SMUPLOC — política de identidade, acesso e hierarquia

## Estado desta entrega
A interface de autenticação e o fluxo de primeiro acesso estão preparados no frontend. **Não há autenticação real até publicar e configurar a API HTTPS e PostgreSQL.** O botão “Demonstração local” é explicitamente não autenticado, usa perfil cliente e não deve ser usado para dados reais.

Nenhuma senha, CPF, token de bootstrap ou credencial administrativa pode ser gravada em HTML, JavaScript, CSS, Git, localStorage ou documentação operacional.

## Primeiro acesso do administrador
1. A API provisiona uma única conta bootstrap `admin` no servidor, com segredo temporário definido fora do repositório (secret manager/variável protegida).
2. O acesso temporário é de uso único e deve exigir configuração antes de liberar o sistema.
3. A pessoa informa CPF, novo nome de usuário e senha forte (mínimo 12 caracteres; política final deve incluir verificação de senha comprometida, limite de tentativas e MFA para administradores).
4. A API valida os dígitos verificadores do CPF e, se for exigida confirmação de identidade, integra um provedor autorizado. Dígitos verificadores sozinhos não provam titularidade.
5. A API guarda CPF com minimização de acesso, criptografia em repouso/gestão de chave, finalidade definida, retenção e trilha de auditoria. Nunca registrar CPF completo em logs.
6. A senha é armazenada exclusivamente como hash Argon2id (preferencial) ou bcrypt com fator de custo adequado. Nunca reversível.
7. Após concluir, o segredo temporário é invalidado e a conta bootstrap não pode ser reutilizada.

**Importante sobre admin/admin:** essa combinação foi solicitada como identificador/senha inicial temporária, mas não pode ser embutida no frontend ou armazenada no Git. A API deve aceitá-la somente como credencial de bootstrap de uso único, configurada em segredo no servidor, e forçar sua troca no primeiro acesso. Antes de qualquer uso público, substituir por segredo aleatório forte entregue por canal seguro; admin/admin é previsível e não é aceitável como senha permanente.

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
- `POST /api/auth/first-access`: `{ bootstrapUsername, bootstrapPassword, cpf, username, password }` → invalida bootstrap e conclui configuração inicial.
- Futuro: `POST /api/auth/logout`, `GET /api/me`, renovação/revogação de sessão, MFA e recuperação de senha.

As rotas de primeiro acesso devem ser limitadas, idempotentes e fechadas após a criação do primeiro administrador. Não aceitar o CPF como prova de identidade sem validação adicional apropriada.
