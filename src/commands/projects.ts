import { Command } from 'commander';
import { ManUpClient } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';

export const projectsCommand = new Command('projects')
  .alias('project')
  .description('List and manage projects')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const spinner = createSpinner('Fetching projects...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const projects = await client.listProjects();
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
        return;
      }

      if (projects.length === 0) {
        logger.info('No projects found in organization.');
        return;
      }

      logger.title('Projects List');
      const rows = projects.map((p) => [p.id, p.name, p.description || '-', p.createdAt || '-']);
      printTable(['Project ID', 'Name', 'Description', 'Created At'], rows);
    } catch (err: any) {
      spinner.fail('Failed to fetch projects');
      logger.error(err.response?.data?.detail || err.message);
    }
  });
