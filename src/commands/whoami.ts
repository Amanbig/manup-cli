import { Command } from 'commander';
import { getGlobalConfig, getLocalConfig } from '../config/store.js';
import { ManUpClient } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';
import chalk from 'chalk';

export const whoamiCommand = new Command('whoami')
  .alias('status')
  .description('Display active user authentication and local project context')
  .action(async () => {
    const globalCfg = getGlobalConfig();
    const localCfg = getLocalConfig();

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
      
      const rows: string[][] = [
        ['Server URL', client.getServerUrl()],
        ['User Email', user.email],
        ['User Name', user.name || user.username || 'N/A'],
        ['Organization ID', user.organizationId],
      ];

      if (localCfg) {
        rows.push(['Linked Project', `${localCfg.projectName || 'Project'} (${localCfg.projectId})`]);
        rows.push(['Linked Environment', `${localCfg.environmentName || 'Environment'} (${localCfg.environmentId})`]);
      } else {
        rows.push(['Linked Directory', chalk.gray('Not linked. Run `manup init` to link.')]);
      }

      printTable(['Property', 'Value'], rows);
    } catch (err: any) {
      spinner.fail('Failed to fetch status');
      logger.error(err.response?.data?.detail || err.message);
    }
  });
