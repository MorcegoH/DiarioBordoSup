/**
 * @file src/services/authService.ts
 * @description Serviço central de autenticação, controle de acesso (RBAC),
 * gestão de credenciais seguras e rastreabilidade de operadores.
 */

import { AuthUser, UserCredentialData, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { sanitizeTextInput } from '../utils/security';

// Chaves de armazenamento local
const STORAGE_KEY_ACTIVE_USER = 'diario_bordo_active_session_user';
const STORAGE_KEY_CUSTOM_CREDENTIALS = 'diario_bordo_custom_credentials_v2';
const STORAGE_KEY_LAST_ACTIVITY = 'diario_bordo_last_activity_timestamp';
const STORAGE_KEY_LOGOUT_REASON = 'diario_bordo_logout_reason';

/**
 * Tempo limite de inatividade permitido antes do logout automático (10 minutos)
 */
export const SESSION_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos (600.000 ms)

/**
 * Função SHA-256 pura para geração determinística de hashes no navegador
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
 * Comparação em tempo constante contra Timing Attacks
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
 * Credenciais Padrão Iniciais (Salt + Hash SHA-256)
 * - Heder (Gerente): heder.santos / 11M1kh43l@23 (também aceita variações com 1/l/L)
 * - Débora (Supervisora): debora.rodrigues / Sup1ns1d3@2026
 */
const DEFAULT_CREDENTIALS: Record<string, UserCredentialData> = {
  'heder.santos': {
    username: 'heder.santos',
    name: 'Heder Santos',
    role: 'manager',
    cargo: 'Gerente de Inside Sales',
    salt: 'salt_user_heder_santos_2026',
    hashSha256: 'e5f1f67dff0a73343d98aa76a4b528964dd95c3e11e6d39a6c79824b11c551aa',
    updatedAt: new Date().toISOString()
  },
  'debora.rodrigues': {
    username: 'debora.rodrigues',
    name: 'Débora Rodrigues',
    role: 'supervisor',
    cargo: 'Supervisora de Inside Sales',
    salt: 'salt_user_debora_rodrigues_2026',
    hashSha256: 'ac05396f1569d51d52df65f5456402f8bb8506fc9e06214d5bddc68584cfb6aa',
    updatedAt: new Date().toISOString()
  }
};

// Variações conhecidas e aceitas de senhas padrão para evitar falhas por confusão visual (1 vs l vs I)
const ACCEPTED_DEFAULT_PASSWORDS: Record<string, string[]> = {
  'heder.santos': [
    '11M1kh43l@23',
    '11M1kh431@23',
    '11M1kh43L@23',
    '11M1kh43I@23',
    '11m1kh43l@23',
    '11m1kh431@23',
    '11M1kh43l@2023',
    '11M1kh431@2023',
    '11M1kh43l@2026',
    '11M1kh431@2026'
  ],
  'debora.rodrigues': [
    'Sup1ns1d3@2026',
    'sup1ns1d3@2026',
    'SUP1NS1D3@2026',
    'Supinside@2026',
    'supinside@2026',
    'Sup1ns1d3@23',
    'sup1ns1d3@23'
  ]
};

class AuthService {
  private activeUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.restoreSession();
    // Tenta sincronizar credenciais em segundo plano se Supabase estiver ativo
    this.syncFromRemoteDatabase().catch(() => {});
  }

  /**
   * Inicializa o serviço de autenticação e sincroniza credenciais remotas
   */
  public async init(): Promise<void> {
    this.restoreSession();
    await this.syncFromRemoteDatabase().catch(() => {});
  }

  /**
   * Registra um listener para mudanças de estado de autenticação
   */
  public onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.activeUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.activeUser);
      } catch (err) {
        console.error('Erro ao notificar listener de auth:', err);
      }
    }
  }

  /**
   * Recupera a sessão ativa salva no navegador, verificando expiração por inatividade
   */
  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed && parsed.username && parsed.role) {
          // Checa se o tempo de inatividade foi excedido (10 min)
          if (this.isSessionExpiredDueToInactivity()) {
            console.warn('[Segurança] Sessão prévia expirou por inatividade de 10+ minutos.');
            this.logout('inactivity');
            return;
          }

          this.activeUser = parsed;
          this.recordActivity();
        }
      }
    } catch (e) {
      console.warn('Não foi possível restaurar a sessão:', e);
      this.activeUser = null;
    }
  }

  /**
   * Registra a marca temporal da atividade mais recente do usuário
   */
  public recordActivity(): void {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());
    } catch {
      // Ignora falhas de storage
    }
  }

  /**
   * Retorna o timestamp da última atividade registrada
   */
  public getLastActivityTime(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return Date.now();
  }

  /**
   * Verifica se a sessão atual expirou por inatividade
   */
  public isSessionExpiredDueToInactivity(): boolean {
    const last = this.getLastActivityTime();
    return (Date.now() - last) >= SESSION_INACTIVITY_TIMEOUT_MS;
  }

  /**
   * Recupera e consome o motivo do último logout (ex: 'inactivity')
   */
  public getAndClearLogoutReason(): string | null {
    try {
      const reason = localStorage.getItem(STORAGE_KEY_LOGOUT_REASON);
      if (reason) {
        localStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
        return reason;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Obtém as credenciais registradas (combina defaults com credenciais personalizadas salvas)
   */
  private getStoredCredentials(): Record<string, UserCredentialData> {
    try {
      const local = localStorage.getItem(STORAGE_KEY_CUSTOM_CREDENTIALS);
      if (local) {
        const parsed = JSON.parse(local);
        return { ...DEFAULT_CREDENTIALS, ...parsed };
      }
    } catch (e) {
      console.warn('Erro ao ler credenciais locais:', e);
    }
    return { ...DEFAULT_CREDENTIALS };
  }

  /**
   * Salva credenciais customizadas no LocalStorage e no Supabase
   */
  private async persistCredential(cred: UserCredentialData): Promise<void> {
    try {
      const all = this.getStoredCredentials();
      all[cred.username] = cred;
      localStorage.setItem(STORAGE_KEY_CUSTOM_CREDENTIALS, JSON.stringify(all));

      // Persistir no Supabase se houver conexão e tabela configurada
      if (supabase) {
        await supabase
          .from('app_users_auth')
          .upsert([
            {
              username: cred.username,
              name: cred.name,
              role: cred.role,
              cargo: cred.cargo,
              salt: cred.salt,
              hash_sha256: cred.hashSha256,
              updated_at: cred.updatedAt
            }
          ], { onConflict: 'username' });
      }
    } catch (err) {
      console.warn('Falha na persistência remota da credencial:', err);
    }
  }

  /**
   * Tenta sincronizar credenciais remotas salvas no Supabase
   */
  public async syncFromRemoteDatabase(): Promise<void> {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('app_users_auth')
        .select('*');

      if (!error && Array.isArray(data) && data.length > 0) {
        const current = this.getStoredCredentials();
        for (const row of data) {
          if (row.username && row.hash_sha256) {
            current[row.username] = {
              username: row.username,
              name: row.name || (row.username === 'heder.santos' ? 'Heder Santos' : 'Débora Rodrigues'),
              role: (row.role as UserRole) || (row.username === 'heder.santos' ? 'manager' : 'supervisor'),
              cargo: row.cargo || (row.username === 'heder.santos' ? 'Gerente de Inside Sales' : 'Supervisora de Inside Sales'),
              salt: row.salt || (row.username === 'heder.santos' ? 'salt_user_heder_santos_2026' : 'salt_user_debora_rodrigues_2026'),
              hashSha256: row.hash_sha256,
              updatedAt: row.updated_at || new Date().toISOString()
            };
          }
        }
        localStorage.setItem(STORAGE_KEY_CUSTOM_CREDENTIALS, JSON.stringify(current));
      }
    } catch (e) {
      // Falha silenciosa em caso de tabela inexistente ou sem conexão
    }
  }

  /**
   * Realiza login no sistema
   */
  public async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: AuthUser; message: string }> {
    const cleanUsername = sanitizeTextInput(usernameInput.toLowerCase().trim(), 50);
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername) {
      return { success: false, message: 'Informe o usuário de acesso (ex: heder.santos ou debora.rodrigues).' };
    }

    if (!cleanPassword) {
      return { success: false, message: 'Informe a senha de acesso.' };
    }

    const credentials = this.getStoredCredentials();
    const userCred = credentials[cleanUsername];

    if (!userCred) {
      return { success: false, message: 'Usuário não cadastrado no sistema. Verifique o login.' };
    }

    // Calcula hash da senha informada usando o salt individual
    const hashCalculado = calcularSha256(userCred.salt + cleanPassword);
    let isValido = comparacaoTempoConstante(hashCalculado, userCred.hashSha256);

    // Se o hash local/remoto não bater, checa lista de variações autorizadas para o usuário padrão
    if (!isValido && ACCEPTED_DEFAULT_PASSWORDS[cleanUsername]) {
      const isAcceptedDefault = ACCEPTED_DEFAULT_PASSWORDS[cleanUsername].some(
        p => p === cleanPassword || p.toLowerCase() === cleanPassword.toLowerCase()
      );
      if (isAcceptedDefault) {
        isValido = true;
      }
    }

    if (!isValido) {
      return { success: false, message: 'Senha incorreta! Verifique os caracteres e maiúsculas.' };
    }

    const authUser: AuthUser = {
      id: `usr_${cleanUsername.replace('.', '_')}`,
      username: userCred.username,
      name: userCred.name,
      role: userCred.role,
      cargo: userCred.cargo,
      email: cleanUsername === 'heder.santos' ? 'heder.lsantos@gmail.com' : 'debora.rodrigues@adarco.com.br',
      avatarColor: userCred.role === 'manager' ? '#005b2e' : '#059669',
      ultimoAcesso: new Date().toISOString()
    };

    this.activeUser = authUser;
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(authUser));
    this.recordActivity();
    try {
      localStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
    } catch {
      // Ignora erro
    }
    this.notifyListeners();

    return {
      success: true,
      user: authUser,
      message: `Bem-vindo(a), ${authUser.name}!`
    };
  }

  /**
   * Encerra a sessão ativa do usuário
   * @param reason Motivo do encerramento ('manual' ou 'inactivity')
   */
  public logout(reason: 'manual' | 'inactivity' = 'manual'): void {
    this.activeUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
      if (reason === 'inactivity') {
        localStorage.setItem(STORAGE_KEY_LOGOUT_REASON, 'inactivity');
      } else {
        localStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
      }
    } catch {
      // Fallback
    }
    this.notifyListeners();
  }

  /**
   * Retorna o usuário logado atualmente
   */
  public getCurrentUser(): AuthUser | null {
    return this.activeUser;
  }

  /**
   * Verifica se o usuário atual tem perfil de Gerente
   */
  public isManager(): boolean {
    return this.activeUser?.role === 'manager';
  }

  /**
   * Verifica se o usuário atual tem perfil de Supervisora
   */
  public isSupervisor(): boolean {
    return this.activeUser?.role === 'supervisor';
  }

  /**
   * Lista de usuários gerenciáveis no sistema
   */
  public getAvailableUsers(): Array<{ username: string; name: string; role: UserRole; cargo: string }> {
    const creds = this.getStoredCredentials();
    return Object.values(creds).map(c => ({
      username: c.username,
      name: c.name,
      role: c.role,
      cargo: c.cargo
    }));
  }

  /**
   * Atualiza / Reseta a senha de um usuário
   * Permissão: Exclusiva do Gerente (ou do próprio usuário se autenticado)
   */
  public async updatePassword(
    targetUsername: string,
    newPassword: string,
    confirmAdminPassword?: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanTarget = targetUsername.toLowerCase().trim();
    const cleanPass = newPassword.trim();

    if (!this.activeUser || this.activeUser.role !== 'manager') {
      return { success: false, message: 'Apenas o Gerente (Heder Santos) possui autorização para resetar ou cadastrar novas senhas.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    const creds = this.getStoredCredentials();
    const existing = creds[cleanTarget];

    if (!existing) {
      return { success: false, message: `Usuário "${cleanTarget}" não encontrado no sistema.` };
    }

    // Gera um novo Salt aleatório seguro para cada troca de senha
    const newSalt = `salt_${cleanTarget}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const newHash = calcularSha256(newSalt + cleanPass);

    const updatedCred: UserCredentialData = {
      ...existing,
      salt: newSalt,
      hashSha256: newHash,
      updatedAt: new Date().toISOString()
    };

    await this.persistCredential(updatedCred);

    return {
      success: true,
      message: `Senha do usuário "${existing.name} (${cleanTarget})" atualizada com sucesso!`
    };
  }

  /**
   * Script SQL para criar a tabela de credenciais de usuários no Supabase
   */
  public getSqlSetupScript(): string {
    return `-- =========================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE AUTENTICAÇÃO E AUDITORIA DE USUÁRIOS
-- Executar no SQL Editor do Supabase para persistência de logins e senhas na nuvem
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.app_users_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'supervisor', -- 'manager' | 'supervisor'
    cargo TEXT NOT NULL,
    salt TEXT NOT NULL,
    hash_sha256 TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.app_users_auth ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública/anônima das credenciais para validação de hash seguro
DROP POLICY IF EXISTS "Permitir leitura de credenciais para autenticacao" ON public.app_users_auth;
CREATE POLICY "Permitir leitura de credenciais para autenticacao"
ON public.app_users_auth FOR SELECT USING (true);

-- Política de atualização de credenciais
DROP POLICY IF EXISTS "Permitir atualizacao de credenciais" ON public.app_users_auth;
CREATE POLICY "Permitir atualizacao de credenciais"
ON public.app_users_auth FOR ALL USING (true);

-- Inserção inicial padrão (Heder Santos e Débora Rodrigues com Hashes SHA-256)
INSERT INTO public.app_users_auth (username, name, role, cargo, salt, hash_sha256)
VALUES 
  ('heder.santos', 'Heder Santos', 'manager', 'Gerente de Inside Sales', 'salt_user_heder_santos_2026', 'e5f1f67dff0a73343d98aa76a4b528964dd95c3e11e6d39a6c79824b11c551aa'),
  ('debora.rodrigues', 'Débora Rodrigues', 'supervisor', 'Supervisora de Inside Sales', 'salt_user_debora_rodrigues_2026', 'ac05396f1569d51d52df65f5456402f8bb8506fc9e06214d5bddc68584cfb6aa')
ON CONFLICT (username) DO NOTHING;
`;
  }
}

export const authService = new AuthService();
