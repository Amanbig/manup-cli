import { Command } from 'commander';
import { getGlobalConfig, getLocalConfig, getAuthSource } from '../config/store.js';
import { ManUpClient } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';
import chalk from 'chalk';

export const whoamiCommand = new Command('whoami')
  .alias('status')
  .description('Display active user authentication and local project context')
  .action(async () => {
    const globalCfg = getGlobalConfig();
    const localCfg = getLocalConfig();
    const authSource = getAuthSource();

    if (!globalCfg.apiKey && !globalCfg.token) {
      logger.warn('Not logged in. Run `manup login` to authenticate.');
      return;
    }

    const spinner = createSpinner('Fetching status...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const user = await client.getCurrentUser();
      spinner.stop();

      logger.title('Status & Context');

      let authTypeLabel = 'API Key';
      let credentialPreview = 'N/A';

      if (authSource === 'env') {
        authTypeLabel = 'Environment Override';
        const rawKey = process.env.MANUP_API_KEY || process.env.MANUP_TOKEN || '';
        credentialPreview = rawKey ? `${rawKey.substring(0, 7)}...` : 'ENV';
      } else if (globalCfg.apiKey) {
        authTypeLabel = 'API Key (mp_...)';
        credentialPreview = `${globalCfg.apiKey.substring(0, 7)}...${globalCfg.apiKey.slice(-4)}`;
      } else if (globalCfg.token) {
        authTypeLabel = 'Session JWT Token';
        credentialPreview = `${globalCfg.token.substring(0, 10)}...`;
      }

      const rows: string[][] = [
        ['Server URL', client.getServerUrl()],
        ['User Email', user.email],
        ['User Name', user.name || user.username || 'N/A'],
        ['Organization ID', user.organizationId],
        ['Auth Method', `${authTypeLabel} (${credentialPreview})`],
        [
          'Credential Storage',
          authSource === 'env' ? 'Environment Variable' : 'Encrypted Local Store (AES-256)',
        ],
      ];

      if (localCfg) {
        rows.push([
          'Linked Project',
          `${localCfg.projectName || 'Project'} (${localCfg.projectId})`,
        ]);
        rows.push([
          'Linked Environment',
          `${localCfg.environmentName || 'Environment'} (${localCfg.environmentId})`,
        ]);
      } else {
        rows.push(['Linked Directory', chalk.gray('Not linked. Run `manup init` to link.')]);
      }

      printTable(['Property', 'Value'], rows);
    } catch (err: any) {
      spinner.fail('Failed to fetch status');
      logger.error(err.response?.data?.detail || err.message);
    }
  });
