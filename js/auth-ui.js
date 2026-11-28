/**
 * SMUPLOC Auth UI — interface preparada para API.
 * Sem API configurada, somente modo local de demonstração (perfil cliente).
 * Verificação de e-mail e autenticação dependem exclusivamente da API; nenhum código é validado no navegador.
 */
const AuthUI = {
  usuario: null,
  modoLocal: false,
  mensagem(texto, erro = false) {
    const el = document.getElementById('auth-message');
    if (!el) return;
    el.textContent = texto;
    el.dataset.state = erro ? 'error' : 'info';
  },
  alternar(tela) {
    document.querySelectorAll('[data-auth-view]').forEach(el => { el.hidden = el.dataset.authView !== tela; });
    this.mensagem('');
  },
  init() {
    const gate = document.getElementById('auth-gate');
    if (!gate) return;
    const config = window.SMUPLOC_CONFIG || {};
    const api = String(config.apiBaseUrl || '').trim();
    const status = document.getElementById('auth-api-status');
    if (status) status.textContent = api ? 'API configurada · aguardando autenticação' : 'Modo protegido · API ainda não conectada';
    document.getElementById('auth-login-form')?.addEventListener('submit', e => this.entrar(e));
    document.getElementById('auth-first-access-form')?.addEventListener('submit', e => this.primeiroAcesso(e));
    document.getElementById('auth-show-first')?.addEventListener('click', () => this.alternar('first'));
    document.getElementById('auth-back-login')?.addEventListener('click', () => this.alternar('login'));
    document.getElementById('auth-local-demo')?.addEventListener('click', () => this.entrarLocal());
    document.getElementById('auth-logout')?.addEventListener('click', () => this.sair());
    document.getElementById('auth-send-code')?.addEventListener('click', () => this.enviarCodigo());
    this.alternar('login');
    gate.hidden = false;
    document.body.classList.add('auth-locked');
    if (api && this.tokenPresente()) this.restaurarSessao(api);
  },
  tokenPresente() { try { return !!sessionStorage.getItem('smuploc_api_token'); } catch (_) { return false; } },
  async restaurarSessao(api) {
    try {
      const token = sessionStorage.getItem('smuploc_api_token');
      const response = await fetch(api.replace(/\/+$/, '') + '/api/me', { headers: { Authorization: 'Bearer ' + token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) throw new Error('Sessão expirada. Entre novamente.');
      if (window.SmupLocApi) { SmupLocApi.token = token; SmupLocApi.baseUrl = api.replace(/\/+$/, ''); }
      this.ativarSessao(data.user, false);
    } catch (_) { try { sessionStorage.removeItem('smuploc_api_token'); } catch (e) {} }
  },
  async entrar(evento) {
    evento.preventDefault();
    const api = String((window.SMUPLOC_CONFIG || {}).apiBaseUrl || '').trim().replace(/\/+$/, '');
    if (!api) return this.mensagem('A autenticação real será liberada quando a API HTTPS estiver publicada. Use a demonstração local apenas para testar a interface.', true);
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!username || !password) return this.mensagem('Informe usuário e senha.', true);
    try {
      const response = await fetch(api + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token || !data.user) throw new Error(data.error || 'Não foi possível autenticar.');
      sessionStorage.setItem('smuploc_api_token', data.token);
      if (window.SmupLocApi) { SmupLocApi.token = data.token; SmupLocApi.baseUrl = api; }
      this.ativarSessao(data.user, false);
    } catch (error) { this.mensagem(error.message || 'Falha de conexão com a API.', true); }
  },
  async enviarCodigo() {
    const api = String((window.SMUPLOC_CONFIG || {}).apiBaseUrl || '').trim().replace(/\/+$/, '');
    const email = document.getElementById('auth-admin-email').value.trim().toLowerCase();
    if (!api) return this.mensagem('A API segura ainda não está conectada. Nenhum código foi enviado.', true);
    if (email !== 'alandesouzalobox@gmail.com') return this.mensagem('Este e-mail não está autorizado para ativar o administrador inicial.', true);
    try {
      const response = await fetch(api + '/api/auth/bootstrap/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o código.');
      this.mensagem('Se o endereço estiver autorizado, o código de verificação foi enviado. Confira sua caixa de entrada e o spam.');
    } catch (error) { this.mensagem(error.message || 'Falha ao solicitar código.', true); }
  },
  async primeiroAcesso(evento) {
    evento.preventDefault();
    const email = document.getElementById('auth-admin-email').value.trim().toLowerCase();
    const code = document.getElementById('auth-email-code').value.trim();
    const username = document.getElementById('auth-new-username').value.trim();
    const password = document.getElementById('auth-new-password').value;
    const confirmacao = document.getElementById('auth-confirm-password').value;
    if (email !== 'alandesouzalobox@gmail.com') return this.mensagem('E-mail não autorizado para o primeiro administrador.', true);
    if (!/^\\d{6}$/.test(code)) return this.mensagem('Informe o código de verificação de 6 dígitos.', true);
    if (!/^[a-zA-Z0-9._-]{4,40}$/.test(username)) return this.mensagem('O usuário deve ter de 4 a 40 caracteres: letras, números, ponto, hífen ou underline.', true);
    if (password.length < 12) return this.mensagem('Crie uma senha com pelo menos 12 caracteres.', true);
    if (password !== confirmacao) return this.mensagem('As senhas não coincidem.', true);
    const api = String((window.SMUPLOC_CONFIG || {}).apiBaseUrl || '').trim().replace(/\/+$/, '');
    if (!api) return this.mensagem('Cadastro ainda indisponível: a API segura não foi conectada. Seus dados não foram enviados nem salvos.', true);
    try {
      const response = await fetch(api + '/api/auth/first-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapUsername: 'admin', bootstrapPassword: document.getElementById('auth-bootstrap-password').value, email, emailCode: code, username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir o primeiro acesso.');
      this.mensagem('Administrador configurado. Entre com o novo usuário e senha.');
      this.alternar('login');
    } catch (error) { this.mensagem(error.message || 'Falha ao configurar administrador.', true); }
  },
  entrarLocal() {
    this.modoLocal = true;
    this.ativarSessao({ name: 'Demonstração local', role: 'client' }, true);
  },
  ativarSessao(usuario, local) {
    this.usuario = usuario;
    this.modoLocal = local;
    const papel = local ? 'cliente' : ({ admin: 'admin', technician: 'tecnico', client: 'cliente' }[usuario.role] || 'cliente');
    if (window.State) State.setPerfil(papel);
    document.getElementById('auth-gate').hidden = true;
    document.body.classList.remove('auth-locked');
    document.getElementById('auth-session-label').textContent = (usuario.name || usuario.username || usuario.email || 'Usuário') + (local ? ' · demonstração' : '');
    document.getElementById('auth-session-actions').hidden = false;
    const selector = document.getElementById('perfil-select');
    if (selector) selector.disabled = true;
  },
  sair() {
    try { sessionStorage.removeItem('smuploc_api_token'); } catch (_) {}
    if (window.SmupLocApi) SmupLocApi.logout();
    this.usuario = null;
    this.modoLocal = false;
    document.getElementById('auth-session-actions').hidden = true;
    document.getElementById('auth-gate').hidden = false;
    document.body.classList.add('auth-locked');
    this.alternar('login');
  }
};
document.addEventListener('DOMContentLoaded', () => AuthUI.init());
