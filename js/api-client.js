/**
 * Cliente da API própria SMUPLOC.
 * Desativado por padrão: sem apiBaseUrl configurada, o app continua 100% no modo local.
 * Token fica apenas na sessão do navegador; não salva credenciais no localStorage.
 */
const SmupLocApi = {
  token: null,
  baseUrl: '',

  init() {
    const config = window.SMUPLOC_CONFIG || {};
    this.baseUrl = String(config.apiBaseUrl || '').trim().replace(/\/+$/, '');
    try { this.token = sessionStorage.getItem('smuploc_api_token') || null; }
    catch (_) { this.token = null; }
    return !!this.baseUrl;
  },

  configurado() { return !!this.baseUrl; },
  autenticado() { return !!this.token; },

  definirBaseUrl(url) {
    const valor = String(url || '').trim().replace(/\/+$/, '');
    if (valor && !/^https?:\/\//i.test(valor)) throw new Error('Informe uma URL HTTP ou HTTPS válida.');
    this.baseUrl = valor;
    return this.baseUrl;
  },

  async requisitar(caminho, opcoes = {}) {
    if (!this.configurado()) throw new Error('API SMUPLOC não configurada; os dados continuam locais.');
    const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    const resposta = await fetch(this.baseUrl + caminho, { ...opcoes, headers });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      if (resposta.status === 401) this.logout();
      throw new Error(dados.error || 'Falha ao consultar a API SMUPLOC (' + resposta.status + ').');
    }
    return dados;
  },

  async login(email, password) {
    const dados = await this.requisitar('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {}
    });
    this.token = dados.token;
    try { sessionStorage.setItem('smuploc_api_token', this.token); } catch (_) {}
    return dados.user;
  },

  logout() {
    this.token = null;
    try { sessionStorage.removeItem('smuploc_api_token'); } catch (_) {}
  },

  async obterUsuario() { return this.requisitar('/api/me'); },
  async listarUsuarios() { return this.requisitar('/api/users'); },
  async criarUsuario(usuario) { return this.requisitar('/api/users', { method: 'POST', body: JSON.stringify(usuario) }); },
  async listarAmbientes() { return this.requisitar('/api/environments'); },
  async salvarAmbiente(ambiente) {
    return this.requisitar('/api/environments', { method: 'POST', body: JSON.stringify(ambiente) });
  },
  async listarAtivos(environmentId) {
    return this.requisitar('/api/environments/' + encodeURIComponent(environmentId) + '/assets');
  },
  async criarAtivo(ativo) {
    return this.requisitar('/api/assets', { method: 'POST', body: JSON.stringify(ativo) });
  },
  async atualizarAtivo(id, alteracoes) {
    return this.requisitar('/api/assets/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(alteracoes) });
  },
  async excluirAtivo(id) {
    return this.requisitar('/api/assets/' + encodeURIComponent(id), { method: 'DELETE' });
  }
};

SmupLocApi.init();
