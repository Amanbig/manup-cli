import { Command } from 'commander';
import { ManUpClient } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';

export const envCommand = new Command('env')
  .alias('environments')
  .description('List project environments')
  .option(
    '-p, --project <project>',
    'Project name or ID (defaults to linked project in .manup.json)',
  )
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const spinner = createSpinner('Fetching environments...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const project = await client.resolveProject(options.project);
      const environments = await client.listEnvironments(project.id);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(environments, null, 2));
        return;
      }

      if (environments.length === 0) {
        logger.info(`No environments found for project "${project.name}".`);
        return;
      }

      logger.title(`Environments — ${project.name}`);
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
      process.exit(1);
    }
  });
