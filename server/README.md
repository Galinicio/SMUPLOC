# SMUPLOC API (fase inicial)

Esta API é um backend próprio do SMUPLOC. Ela **não integra a API oficial da SMUP** e não substitui o smuPweb.

## Estado da implementação

- API Node.js/Express com PostgreSQL.
- Isolamento de dados por organização.
- Login com senha armazenada em hash bcrypt e token JWT com expiração.
- Papéis iniciais: `admin`, `technician` e `client`.
- Ambientes e ativos com operações de leitura/criação/atualização/remoção conforme papel.
- Registro de auditoria para alterações.
- Validação de entrada, limite de requisições de login, Helmet e CORS.
- Migração inicial idempotente em `schema.sql`.

A API ainda não está publicada e o frontend ainda não sincroniza automaticamente com ela. O modo local atual permanece preservado até concluir a camada cliente e validar a migração sem perda.

## Variáveis de ambiente

Obrigatórias:
- `DATABASE_URL`: conexão PostgreSQL.
- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `CORS_ORIGINS`: origens do frontend separadas por vírgula (obrigatório em produção).
- `PORT`: fornecida pela plataforma (padrão local 10000).

Bootstrap opcional da primeira conta:
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ORG_NAME`

O bootstrap cria a organização e o administrador somente quando ainda não há usuários. Não coloque segredos no Git. Configure-os no painel de hospedagem.

## Executar localmente

1. Instale Node.js 20 ou superior e PostgreSQL.
2. Crie um banco e defina as variáveis acima.
3. Execute `npm install`.
4. Execute `npm start`.
5. Consulte `GET /api/health`.

## Rotas iniciais

- `GET /api/health`: saúde da API e conexão com banco.
- `POST /api/auth/login`: autenticação.
- `GET /api/me`: identidade do usuário autenticado.
- `POST /api/users`: cria usuário da organização (somente administrador; senha inicial forte definida pelo administrador).
- `GET /api/environments`: lista ambientes da organização.
- `POST /api/environments`: cria/atualiza ambiente (admin/técnico).
- `GET /api/environments/:environmentId/assets`: lista ativos do ambiente.
- `POST /api/assets`: cria ativo (admin/técnico).
- `PATCH /api/assets/:assetId`: atualiza ativo (admin/técnico).
- `DELETE /api/assets/:assetId`: remove ativo (admin).

## Próximas etapas necessárias

1. Criar fluxo administrativo seguro de convite/gestão de usuários e troca de senha.
2. Implementar cliente frontend autenticado, com sincronização incremental e fila offline.
3. Migrar cadastros locais para a API sem apagar dados existentes; manter exportação JSON como backup.
4. Adicionar testes de integração com PostgreSQL e autorização multi-organização.
5. Provisionar PostgreSQL e serviço web no Render após revisar plano/custos e configurar segredos.
6. Só depois habilitar a sincronização remota por configuração, mantendo fallback local.

## Limitações deliberadas

- A senha `wifismup` nunca deve ser persistida como ID ou segredo de ativo.
- Assinaturas de categoria UC/UC HYB não identificam sozinhas unidades individuais.
- Telemetria, alarmes, histórico e certificados oficiais continuam fora desta API até a futura integração autorizada com a SMUP.
