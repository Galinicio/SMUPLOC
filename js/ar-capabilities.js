/**
 * Diagnóstico de compatibilidade AR. Não inicia uma sessão nem solicita permissões:
 * apenas verifica capacidades disponíveis para orientar a implementação por aparelho.
 */
const ARCapabilityModule = {
  async verificar() {
    const secure = typeof window !== 'undefined' && window.isSecureContext === true;
    const camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const motion = typeof DeviceMotionEvent !== 'undefined' || typeof DeviceOrientationEvent !== 'undefined';
    let webgl2 = false;
    try {
      const canvas = document.createElement('canvas');
      webgl2 = !!canvas.getContext('webgl2');
    } catch (_) {}
    let immersiveAR = false;
    let xrError = '';
    try {
      immersiveAR = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar'));
    } catch (erro) {
      xrError = String(erro && erro.message || 'não disponível');
    }
    const resultado = { secure, camera, motion, webgl2, immersiveAR, xrError };
    this.ultimoResultado = resultado;
    const itens = [
      ['Conexão segura', secure],
      ['Acesso à câmera pelo navegador', camera],
      ['Sensores de movimento', motion],
      ['WebGL 2', webgl2],
      ['WebXR immersive-ar', immersiveAR]
    ];
    const texto = itens.map(([nome, ok]) => (ok ? '✓ ' : '— ') + nome).join(' · ');
    const status = document.getElementById('tracking-status');
    if (status) status.textContent = 'Compatibilidade deste aparelho: ' + texto;
    return resultado;
  },
  ultimoResultado: null
};
