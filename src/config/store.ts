import Conf from 'conf';
import fs from 'node:fs';
import path from 'node:path';

export interface GlobalConfig {
  serverUrl: string;
  apiKey?: string;
  token?: string;
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

const globalStore = new Conf<GlobalConfig>({
  projectName: 'manup-cli',
  defaults: {
    serverUrl: DEFAULT_SERVER_URL,
  },
});

export const getGlobalConfig = (): GlobalConfig => {
  return {
    serverUrl: globalStore.get('serverUrl') || DEFAULT_SERVER_URL,
    apiKey: globalStore.get('apiKey'),
    token: globalStore.get('token'),
    user: globalStore.get('user'),
  };
};

export const setGlobalConfig = (config: Partial<GlobalConfig>): void => {
  if (config.serverUrl !== undefined) globalStore.set('serverUrl', config.serverUrl);
  if (config.apiKey !== undefined) globalStore.set('apiKey', config.apiKey);
  if (config.token !== undefined) globalStore.set('token', config.token);
  if (config.user !== undefined) globalStore.set('user', config.user);
};

export const clearGlobalAuth = (): void => {
  globalStore.delete('apiKey');
  globalStore.delete('token');
  globalStore.delete('user');
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
