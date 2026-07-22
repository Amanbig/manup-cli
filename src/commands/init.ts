import { Command } from 'commander';
import * as p from '@clack/prompts';
import { ManUpClient } from '../api/client.js';
import { setLocalConfig } from '../config/store.js';
import { logger, createSpinner } from '../utils/logger.js';

export const initCommand = new Command('init')
  .description('Link current workspace directory to a ManUp project and environment')
  .action(async () => {
    p.intro('🔗 ManUp Link Project');

    const spinner = createSpinner('Fetching projects...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const projects = await client.listProjects();
      spinner.stop();

      if (projects.length === 0) {
        logger.error('No projects found in organization. Please create one on the dashboard first.');
        process.exit(1);
      }

      const selectedProjectVal = await p.select({
        message: 'Select a project to link:',
        options: projects.map((proj) => ({
          label: proj.name,
          value: proj.id,
          hint: proj.description || undefined,
        })),
      });

      if (p.isCancel(selectedProjectVal)) {
        p.cancel('Init cancelled.');
        process.exit(0);
      }

      const selectedProject = projects.find((proj) => proj.id === selectedProjectVal);

      spinner.text = 'Fetching project environments...';
      spinner.start();
      const environments = await client.listEnvironments(selectedProjectVal as string);
      spinner.stop();

      if (environments.length === 0) {
        logger.error('No environments found for this project.');
        process.exit(1);
      }

      const selectedEnvVal = await p.select({
        message: 'Select an environment:',
        options: environments.map((env) => ({
          label: env.description ? `${env.name} (${env.description})` : env.name,
          value: env.id,
        })),
      });

      if (p.isCancel(selectedEnvVal)) {
        p.cancel('Init cancelled.');
        process.exit(0);
      }

      const selectedEnv = environments.find((env) => env.id === selectedEnvVal);

      const filePath = setLocalConfig({
        projectId: selectedProjectVal as string,
        projectName: selectedProject?.name,
        environmentId: selectedEnvVal as string,
        environmentName: selectedEnv?.name,
      });

      p.outro(`Successfully linked directory to project "${selectedProject?.name}" [${selectedEnv?.name}]!\nSaved configuration to ${filePath}`);
    } catch (err: any) {
      spinner.fail('Initialization failed');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });
