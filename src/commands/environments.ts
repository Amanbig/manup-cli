import { Command } from 'commander';
import { ManUpClient } from '../api/client.js';
import { getLocalConfig } from '../config/store.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';

export const envCommand = new Command('env')
  .alias('environments')
  .description('List project environments')
  .option('-p, --project <projectId>', 'Project ID (defaults to linked project in .manup.json)')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const localCfg = getLocalConfig();
    const projectId = options.project || localCfg?.projectId;

    if (!projectId) {
      logger.error('Project ID is required. Pass --project <id> or run `manup init` first.');
      process.exit(1);
    }

    const spinner = createSpinner('Fetching environments...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const environments = await client.listEnvironments(projectId);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(environments, null, 2));
        return;
      }

      if (environments.length === 0) {
        logger.info('No environments found for this project.');
        return;
      }

      logger.title('Environments');
      const rows = environments.map((e) => [
        e.id,
        e.name,
        e.description || '-',
        e.createdAt ? new Date(e.createdAt).toLocaleString() : '-',
      ]);
      printTable(['Environment ID', 'Name', 'Description', 'Created At'], rows);
    } catch (err: any) {
      spinner.fail('Failed to fetch environments');
      logger.error(err.response?.data?.detail || err.message);
    }
  });
