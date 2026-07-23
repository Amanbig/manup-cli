import Conf from 'conf';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export interface GlobalConfig {
  serverUrl: string;
  apiKey?: string;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    organizationId: string;
    organizationName?: string;
  };
}

export interface LocalConfig {
  projectId: string;
  projectName?: string;
  environmentId: string;
  environmentName?: string;
  serverUrl?: string;
}

const DEFAULT_SERVER_URL = 'http://localhost:7780';
const LOCAL_CONFIG_FILENAME = '.manup.json';

/**
 * Generates a stable machine-bound key for encrypting stored CLI credentials.
 */
function getMachineEncryptionKey(): string {
  const systemId = `${os.hostname()}-${os.userInfo().username}-${os.homedir()}`;
  return crypto.scryptSync(systemId, 'manup-cli-vault-salt-v1', 32).toString('hex');
}

function ensureConfigFilePermissions(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath) && process.platform !== 'win32') {
      fs.chmodSync(filePath, 0o600);
    }
  } catch {
    // Ignore permissions error on non-supported filesystems
  }
}

let globalStore: Conf<GlobalConfig>;

try {
  globalStore = new Conf<GlobalConfig>({
    projectName: 'manup-cli',
    encryptionKey: getMachineEncryptionKey(),
    defaults: {
      serverUrl: DEFAULT_SERVER_URL,
    },
  });
  ensureConfigFilePermissions(globalStore.path);
} catch {
  // Graceful fallback if config file migration fails or format changes
  globalStore = new Conf<GlobalConfig>({
    projectName: 'manup-cli',
    defaults: {
      serverUrl: DEFAULT_SERVER_URL,
    },
  });
  ensureConfigFilePermissions(globalStore.path);
}

export const getGlobalConfig = (): GlobalConfig => {
  const envServerUrl = process.env.MANUP_SERVER_URL;
  const envApiKey = process.env.MANUP_API_KEY;
  const envToken = process.env.MANUP_TOKEN;

  const storedServerUrl = globalStore.get('serverUrl') || DEFAULT_SERVER_URL;
  const storedApiKey = globalStore.get('apiKey');
  const storedToken = globalStore.get('token');
  const storedRefreshToken = globalStore.get('refreshToken');
  const storedUser = globalStore.get('user');

  return {
    serverUrl: envServerUrl || storedServerUrl,
    apiKey: envApiKey || storedApiKey,
    token: envToken || storedToken,
    refreshToken: storedRefreshToken,
    user: storedUser,
  };
};

export const getAuthSource = (): 'env' | 'apikey' | 'token' | 'none' => {
  if (process.env.MANUP_API_KEY || process.env.MANUP_TOKEN) return 'env';
  const cfg = getGlobalConfig();
  if (cfg.apiKey) return 'apikey';
  if (cfg.token) return 'token';
  return 'none';
};

export const setGlobalConfig = (config: Partial<GlobalConfig>): void => {
  if (config.serverUrl !== undefined) globalStore.set('serverUrl', config.serverUrl);
  if (config.apiKey !== undefined) globalStore.set('apiKey', config.apiKey);
  if (config.token !== undefined) globalStore.set('token', config.token);
  if (config.refreshToken !== undefined) globalStore.set('refreshToken', config.refreshToken);
  if (config.user !== undefined) globalStore.set('user', config.user);
  ensureConfigFilePermissions(globalStore.path);
};

export const clearGlobalAuth = (): void => {
  globalStore.delete('apiKey');
  globalStore.delete('token');
  globalStore.delete('refreshToken');
  globalStore.delete('user');
  ensureConfigFilePermissions(globalStore.path);
};

/**
 * Finds .manup.json in the current working directory or parent directories.
 */
export const findLocalConfigPath = (dir = process.cwd()): string | null => {
  const file = path.join(dir, LOCAL_CONFIG_FILENAME);
  if (fs.existsSync(file)) {
    return file;
  }
  const parent = path.dirname(dir);
  if (parent && parent !== dir) {
    return findLocalConfigPath(parent);
  }
  return null;
};

export const getLocalConfig = (): LocalConfig | null => {
  const configPath = findLocalConfigPath();
  if (!configPath) return null;

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as LocalConfig;
  } catch {
    return null;
  }
};

export const setLocalConfig = (config: LocalConfig, targetDir = process.cwd()): string => {
  const existingPath = findLocalConfigPath(targetDir);
  const filePath = existingPath || path.join(targetDir, LOCAL_CONFIG_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return filePath;
};
