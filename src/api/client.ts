import axios, { type AxiosInstance } from 'axios';
import { getGlobalConfig, setGlobalConfig, getLocalConfig } from '../config/store.js';

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  type?: string;
  organizationId: string;
  organizationName?: string;
  apiKeyId?: string | null;
  apiKeyScope?: 'full' | 'read-only' | null;
  apiKeyProjectId?: string | null;
  apiKeyProjectName?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Secret {
  id: string;
  name?: string;
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  apiKey?: string;
  scope: 'full' | 'read-only';
  projectId?: string | null;
  projectName?: string | null;
  rateLimit?: number;
  requestCount?: number;
  createdAt?: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
}

export class ManUpClient {
  private axiosInstance: AxiosInstance;
  private serverUrl: string;

  constructor(customServerUrl?: string, customApiKey?: string, customToken?: string) {
    const globalCfg = getGlobalConfig();
    const localCfg = getLocalConfig();

    this.serverUrl =
      customServerUrl || localCfg?.serverUrl || globalCfg.serverUrl || 'http://localhost:7780';
    const apiKey = customApiKey || globalCfg.apiKey;
    const token = customToken || globalCfg.token;

    // Ensure baseUrl includes /api
    const baseUrl = this.serverUrl.replace(/\/$/, '') + '/api';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers,
      timeout: 15000,
    });

    // Auto Refresh Interceptor for expired JWT access tokens
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/users/login') &&
          !originalRequest.url?.includes('/users/refresh')
        ) {
          originalRequest._retry = true;
          const currentConfig = getGlobalConfig();
          if (currentConfig.refreshToken) {
            try {
              const refreshRes = await axios.post(
                `${baseUrl}/users/refresh`,
                { refreshToken: currentConfig.refreshToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
              );
              const newToken = refreshRes.data.token;
              const newRefreshToken = refreshRes.data.refreshToken || currentConfig.refreshToken;

              if (newToken) {
                setGlobalConfig({ token: newToken, refreshToken: newRefreshToken });
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return this.axiosInstance(originalRequest);
              }
            } catch {
              // Session expired
            }
          }
        }
        return Promise.reject(error);
      },
    );
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  // --- Auth / User Endpoints ---

  public async login(
    emailOrUsername: string,
    password: string,
  ): Promise<{ user: User; token?: string; refreshToken?: string; apiKey?: string }> {
    const isEmail = emailOrUsername.includes('@');
    const payload = isEmail
      ? { email: emailOrUsername, password }
      : { username: emailOrUsername, password };

    const res = await this.axiosInstance.post('/users/login', payload);
    return res.data;
  }

  public async getCurrentUser(): Promise<User> {
    const res = await this.axiosInstance.get('/users/me');
    return res.data;
  }

  public async createApiKey(
    name: string,
    scope: 'full' | 'read-only' = 'full',
    expiresAt?: string,
    projectId?: string | null,
    expiresInDays?: number,
  ): Promise<ApiKeyItem> {
    const res = await this.axiosInstance.post('/users/api-keys', {
      name,
      scope,
      expiresAt,
      projectId,
      expiresInDays,
    });
    return res.data;
  }

  public async listApiKeys(): Promise<ApiKeyItem[]> {
    const res = await this.axiosInstance.get('/users/api-keys');
    return res.data;
  }

  public async deleteApiKey(id: string): Promise<void> {
    await this.axiosInstance.delete(`/users/api-keys/${id}`);
  }

  // --- Projects Endpoints ---

  public async listProjects(): Promise<Project[]> {
    const res = await this.axiosInstance.get('/projects');
    return res.data;
  }

  public async getProject(id: string): Promise<Project> {
    const res = await this.axiosInstance.get(`/projects/${id}`);
    return res.data;
  }

  public async createProject(name: string, description?: string): Promise<Project> {
    const res = await this.axiosInstance.post('/projects', { name, description });
    return res.data;
  }

  // --- Environments Endpoints ---

  public async listEnvironments(projectId: string): Promise<Environment[]> {
    const res = await this.axiosInstance.get(`/environments/${projectId}`);
    return res.data;
  }

  public async createEnvironment(
    projectId: string,
    name: string,
    type: string = 'development',
  ): Promise<Environment> {
    const res = await this.axiosInstance.post('/environments', { projectId, name, type });
    return res.data;
  }

  // --- Secrets Endpoints ---

  public async getSecrets(environmentId: string): Promise<Secret[]> {
    const res = await this.axiosInstance.get(`/secrets/${environmentId}`);
    return res.data;
  }

  public async setSecret(
    environmentId: string,
    key: string,
    value: string,
    name?: string,
  ): Promise<Secret> {
    const res = await this.axiosInstance.post('/secrets', { environmentId, key, value, name });
    return res.data;
  }

  public async updateSecret(secretId: string, value: string, name?: string): Promise<Secret> {
    const res = await this.axiosInstance.put(`/secrets/${secretId}`, { value, name });
    return res.data;
  }

  public async deleteSecret(secretId: string): Promise<void> {
    await this.axiosInstance.delete(`/secrets/${secretId}`);
  }

  // --- Resolution and Query Helpers ---

  public async querySecrets(params: {
    env: string;
    project?: string;
    format?: 'json' | 'dotenv' | 'kv';
  }): Promise<{ data: any; headers: any }> {
    const queryParams: Record<string, string> = { env: params.env };
    if (params.project) {
      queryParams.project = params.project;
    }
    if (params.format) {
      queryParams.format = params.format;
    }
    const res = await this.axiosInstance.get('/secrets', {
      params: queryParams,
      transformResponse: params.format === 'dotenv' ? [(data) => data] : undefined,
    });
    return { data: res.data, headers: res.headers };
  }

  public async resolveProject(projectQuery?: string): Promise<Project> {
    const localCfg = getLocalConfig();
    const query = (projectQuery || localCfg?.projectId || localCfg?.projectName)?.trim();

    const projects = await this.listProjects();
    if (projects.length === 0) {
      throw new Error('No projects found in organization.');
    }

    if (query) {
      const match = projects.find(
        (p) => p.id === query || p.name.toLowerCase() === query.toLowerCase(),
      );
      if (match) return match;
      throw new Error(
        `Project '${query}' not found. Available projects: ${projects.map((p) => p.name).join(', ')}`,
      );
    }

    if (projects.length === 1) {
      return projects[0];
    }

    throw new Error(
      `Multiple projects found (${projects.map((p) => p.name).join(', ')}). Please specify --project <name_or_id>.`,
    );
  }

  public async resolveEnvironment(
    envQuery?: string,
    projectQuery?: string,
  ): Promise<{ project: Project; environment: Environment }> {
    const localCfg = getLocalConfig();
    const project = await this.resolveProject(projectQuery);
    const environments = await this.listEnvironments(project.id);

    if (environments.length === 0) {
      throw new Error(`Project '${project.name}' has no configured environments.`);
    }

    const query = (envQuery || localCfg?.environmentId || localCfg?.environmentName)?.trim();

    if (!query) {
      if (environments.length === 1) {
        return { project, environment: environments[0] };
      }
      throw new Error(
        `Environment is required. Pass --env <name_or_id>. Available: ${environments.map((e) => e.name).join(', ')}`,
      );
    }

    const cleanQuery = query.toLowerCase();

    // 1. Direct ID match
    let match = environments.find((e) => e.id === query);

    // 2. Exact name match (case-insensitive)
    if (!match) {
      match = environments.find((e) => e.name.toLowerCase() === cleanQuery);
    }

    // 3. Common abbreviations (prod -> production, dev -> development, stage -> staging)
    if (!match) {
      match = environments.find((e) => {
        const n = e.name.toLowerCase();
        if (cleanQuery === 'prod' && (n === 'production' || n.startsWith('prod'))) return true;
        if (cleanQuery === 'dev' && (n === 'development' || n.startsWith('dev'))) return true;
        if (cleanQuery === 'stage' && (n === 'staging' || n.startsWith('stag'))) return true;
        return false;
      });
    }

    if (match) {
      return { project, environment: match };
    }

    throw new Error(
      `Environment '${query}' not found in project '${project.name}'. Available: ${environments.map((e) => e.name).join(', ')}`,
    );
  }

  public async fetchSecrets(options: { env?: string; project?: string }): Promise<{
    secrets: Secret[];
    environment: { id: string; name: string };
    project: { id: string; name: string };
  }> {
    const localCfg = getLocalConfig();
    const envQuery = options.env || localCfg?.environmentId || localCfg?.environmentName;
    const projectQuery = options.project || localCfg?.projectId || localCfg?.projectName;

    if (envQuery) {
      try {
        const { data, headers } = await this.querySecrets({
          env: envQuery,
          project: projectQuery,
          format: 'json',
        });

        if (Array.isArray(data)) {
          const envId = headers?.['x-environment-id'] || localCfg?.environmentId || '';
          const envName =
            headers?.['x-environment-name'] ||
            options.env ||
            localCfg?.environmentName ||
            'Environment';
          const projId = headers?.['x-project-id'] || localCfg?.projectId || '';
          const projName =
            headers?.['x-project-name'] || options.project || localCfg?.projectName || 'Project';

          return {
            secrets: data,
            environment: { id: envId, name: envName },
            project: { id: projId, name: projName },
          };
        }
      } catch (err: any) {
        if (err.response?.status !== 404 && err.response?.status !== 400) {
          throw err;
        }
      }
    }

    const { project, environment } = await this.resolveEnvironment(options.env, options.project);
    const secrets = await this.getSecrets(environment.id);
    return {
      secrets,
      environment: { id: environment.id, name: environment.name },
      project: { id: project.id, name: project.name },
    };
  }
}
