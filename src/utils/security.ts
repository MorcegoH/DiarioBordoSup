/**
 * @file src/utils/security.ts
 * @description Módulo central de segurança, autorização de ações críticas e higienização de dados (Sanitization/XSS Mitigation).
 */

const ADMIN_ACTION_PASSWORD = '11M0rc3g0@23';

/**
 * Valida a senha administrativa para exclusão ou reset de dados.
 * Utiliza comparação segura contra vazamento de memória/timing.
 */
export function verifyAdminAuthorization(passwordInput: string | null): boolean {
  if (!passwordInput) return false;
  
  // Normalização e verificação exata
  const normalizedInput = passwordInput.trim();
  
  if (normalizedInput.length !== ADMIN_ACTION_PASSWORD.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < ADMIN_ACTION_PASSWORD.length; i++) {
    mismatch |= normalizedInput.charCodeAt(i) ^ ADMIN_ACTION_PASSWORD.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Higieniza entradas de texto para prevenir XSS (Cross-Site Scripting)
 * e limita o tamanho máximo de caracteres para prevenir estouro de payload/DoS.
 */
export function sanitizeTextInput(input: string, maxLength: number = 3000): string {
  if (!input) return '';

  // Truncar para o limite máximo
  let sanitized = input.slice(0, maxLength);

  // Remover tags de script potencialmente maliciosas ou marcadores HTML
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '');

  return sanitized.trim();
}

/**
 * Valida se a string é uma data válida no formato ISO para evitar inconsistências no banco.
 */
export function isValidISODate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const timestamp = Date.parse(dateStr);
  return !isNaN(timestamp);
}
