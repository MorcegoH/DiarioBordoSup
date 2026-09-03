/**
 * @file src/utils/safeStorage.ts
 * @description Utilitário de persistência resiliente para LocalStorage com proteção contra QuotaExceededError,
 * tratamento de corrupção de dados, retenção inteligente de backups e exportação de emergência.
 * 
 * ARQUITETURA DE RESILIÊNCIA:
 * 1. Previne que exceções de quota (DOMException / QuotaExceededError) quebrem a aplicação.
 * 2. Em caso de disco cheio, executa autopurgação dos snapshots de restauração mais antigos (mantendo os 3 mais recentes).
 * 3. Faz parsing defensivo de JSON para não travar a UI caso haja dados corrompidos.
 * 4. Fornece geração de backup emergencial em um clique para salvaguarda dos dados locais do operador.
 */

const LOCAL_KEY_SNAPSHOTS = 'diario_bordo_backup_snapshots_v1';

export interface StorageUsageReport {
  usedBytes: number;
  usedKb: number;
  percentageUsed: number;
  isNearQuota: boolean;
}

/**
 * Calcula o consumo de memória do LocalStorage para os dados do Diário de Bordo.
 * O teto padrão dos navegadores varia de 5MB a 10MB (usamos 5MB = 5.242.880 bytes como referência segura).
 */
export function getStorageUsageReport(): StorageUsageReport {
  let totalBytes = 0;
  const ESTIMATED_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        // 2 bytes por caractere UTF-16
        totalBytes += (key.length + val.length) * 2;
      }
    }
  } catch (e) {
    console.warn('[SafeStorage] Não foi possível calcular o uso exato do LocalStorage:', e);
  }

  const usedKb = Math.round(totalBytes / 1024);
  const percentage = Math.min(100, Math.round((totalBytes / ESTIMATED_MAX_BYTES) * 100));

  return {
    usedBytes: totalBytes,
    usedKb,
    percentageUsed: percentage,
    isNearQuota: percentage >= 85
  };
}

/**
 * Libera espaço em caso de QuotaExceededError removendo backups antigos locais.
 */
function purgeOlderSnapshotsToFreeSpace(): boolean {
  try {
    const rawSnapshots = localStorage.getItem(LOCAL_KEY_SNAPSHOTS);
    if (!rawSnapshots) return false;

    const parsed = JSON.parse(rawSnapshots);
    if (Array.isArray(parsed) && parsed.length > 3) {
      // Ordena pelos mais recentes e mantém apenas os 3 últimos
      parsed.sort((a, b) => new Date(b.dataHoraCriacao || 0).getTime() - new Date(a.dataHoraCriacao || 0).getTime());
      const preserved = parsed.slice(0, 3);
      localStorage.setItem(LOCAL_KEY_SNAPSHOTS, JSON.stringify(preserved));
      console.warn('[SafeStorage] Quota liberada com sucesso: snapshots antigos podados, mantidos os 3 mais recentes.');
      return true;
    }
  } catch (e) {
    console.error('[SafeStorage] Falha ao tentar liberar espaço nos snapshots:', e);
  }
  return false;
}

/**
 * Grava dados no LocalStorage de forma resiliente.
 * Em caso de estouro de cota, tenta expurgar históricos secundários e retenta a gravação.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError = 
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuotaError) {
      console.warn(`[SafeStorage] Quota de armazenamento atingida ao salvar "${key}". Tentando liberar espaço...`);
      const freed = purgeOlderSnapshotsToFreeSpace();
      if (freed) {
        try {
          localStorage.setItem(key, value);
          console.info(`[SafeStorage] Gravação da chave "${key}" bem-sucedida após liberação de cota.`);
          return true;
        } catch (retryErr) {
          console.error(`[SafeStorage] Falha persistente de cota ao salvar "${key}":`, retryErr);
        }
      }
    } else {
      console.error(`[SafeStorage] Erro ao gravar chave "${key}":`, err);
    }
    return false;
  }
}

/**
 * Lê e decodifica JSON do LocalStorage com fallback seguro caso o conteúdo esteja truncado ou corrompido.
 */
export function safeLocalStorageGetJSON<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.error(`[SafeStorage] Falha ao decodificar JSON da chave "${key}". Usando fallback de segurança. Erro:`, err);
    return fallback;
  }
}

/**
 * Exporta todos os dados operacionais armazenados no navegador em formato JSON.
 * Usado em casos de emergência para recuperação ou migração.
 */
export function exportEmergencyStorageDump(): string {
  const dump: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    environment: 'Diário de Bordo Inside Sales',
    storageData: {}
  };

  try {
    const targetPrefixes = [
      'diario_bordo_',
      'sb-',
      'supabase'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && targetPrefixes.some(p => key.startsWith(p))) {
        try {
          const val = localStorage.getItem(key);
          dump.storageData[key] = val ? JSON.parse(val) : null;
        } catch {
          dump.storageData[key] = localStorage.getItem(key);
        }
      }
    }
  } catch (e) {
    console.error('[SafeStorage] Erro ao gerar dump de emergência:', e);
  }

  return JSON.stringify(dump, null, 2);
}
