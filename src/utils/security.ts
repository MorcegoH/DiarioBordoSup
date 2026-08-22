/**
 * @file src/utils/security.ts
 * @description Módulo central de segurança, autorização criptográfica e higienização de dados (XSS Mitigation).
 * 
 * PADRÃO DE SEGURANÇA:
 * Nenhuma senha é armazenada em texto puro no código-fonte.
 * As senhas são protegidas com Salt individualizado e Hash SHA-256 criptográfico.
 */

// Salt e Hash SHA-256 da Senha Administrativa (Operações Críticas: Zerar Banco, Restaurar Backup)
const ADMIN_SECURITY_SALT = 's4lt_4dm1n_m1kh43l_2026_s3cur3';
const ADMIN_HASH_SHA256 = 'e254fcdf2c201424fc2073611075aa0d8b2a3f58fbc85f0f7746bafcce0170ed';

// Salt e Hash SHA-256 da Senha de Aprovação de Descontos (Operação Comercial do Gerente)
const APPROVAL_SECURITY_SALT = 's4lt_4ppr0v_h3d3r_s4nt0s_2026';
const APPROVAL_HASH_SHA256 = 'c80a722a66a570811698d374185050e4df307de6d4f7899eca05534fd8672074';

/**
 * Implementação pura e determinística de SHA-256 para ambientes Web/Node.
 */
function calcularSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number;
  let j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: { [key: number]: boolean } = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (hash[i] >> (i2 * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Comparação temporal constante contra ataques de canal lateral (Timing Attacks)
 */
function comparacaoTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Valida a Senha Administrativa para operações de Reset e Restauração de Banco de Dados.
 * A senha digitada é combinada ao Salt e verificada através do Hash SHA-256.
 */
export function verifyAdminAuthorization(passwordInput: string | null): boolean {
  if (!passwordInput) return false;
  const inputNormalizado = passwordInput.trim();
  if (!inputNormalizado) return false;

  const hashCalculado = calcularSha256(ADMIN_SECURITY_SALT + inputNormalizado);
  return comparacaoTempoConstante(hashCalculado, ADMIN_HASH_SHA256);
}

/**
 * Valida a Senha de Aprovação de Descontos (Gerente Comercial).
 * Totalmente isolada e diferente da senha administrativa do banco.
 */
export function verifyApprovalAuthorization(passwordInput: string | null): boolean {
  if (!passwordInput) return false;
  const inputNormalizado = passwordInput.trim();
  if (!inputNormalizado) return false;

  const hashCalculado = calcularSha256(APPROVAL_SECURITY_SALT + inputNormalizado);
  return comparacaoTempoConstante(hashCalculado, APPROVAL_HASH_SHA256);
}

/**
 * Alias de validação de autorização administrativa
 */
export function verificarSenhaGerente(passwordInput: string | null): boolean {
  return verifyAdminAuthorization(passwordInput);
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
