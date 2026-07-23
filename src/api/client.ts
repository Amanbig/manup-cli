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
  ): Promise<ApiKeyItem> {
    const res = await this.axiosInstance.post('/users/api-keys', { name, scope, expiresAt });
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
}
