/**
 * Assinaturas públicas de categoria observadas nos QR Codes SMUP.
 * Não extrai nem persiste credenciais; uma assinatura de categoria não identifica
 * uma unidade física individual.
 */
(function (root) {
  function detectar(payload) {
    const original = String(payload || '').trim();
    const normalizado = original.toLocaleLowerCase('pt-BR').replace(/\s+/g, '');
    if (normalizado === 'wifismup') {
      return {
        tipo: 'UC HYB',
        assinatura: 'smup-hyb-access-point',
        identificacaoIndividual: false,
        conteudoSensivel: true
      };
    }
    if (
      normalizado.includes('www.smupweb.com.br') &&
      normalizado.includes('el5200.05vusb') &&
      normalizado.includes('correntout2000ma')
    ) {
      return {
        tipo: 'UC',
        modelo: 'EL5200.05VUSB',
        informacaoEletrica: 'correntout2000mA',
        assinatura: 'smup-uc-el5200-05vusb',
        identificacaoIndividual: false,
        conteudoSensivel: false
      };
    }
    return null;
  }
  root.DeviceSignatures = Object.freeze({ detectar });
})(typeof globalThis !== 'undefined' ? globalThis : window);
