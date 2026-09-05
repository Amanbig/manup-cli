import { Command } from 'commander';
import { execa } from 'execa';
import { ManUpClient, type Secret } from '../api/client.js';
import { logger, createSpinner } from '../utils/logger.js';

export const runCommand = new Command('run')
  .description('Run a command with secrets injected into process environment')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .allowUnknownOption(true)
  .argument('<command...>', 'Command and arguments to execute')
  .action(async (commandArgs: string[], options) => {
    const spinner = createSpinner('Fetching vault secrets...');
    spinner.start();

    const secretMap: Record<string, string> = {};

    try {
      const client = new ManUpClient();
      const res = await client.fetchSecrets({ env: options.env, project: options.project });
      spinner.stop();

      res.secrets.forEach((s: Secret) => {
        secretMap[s.key] = s.value;
      });

      logger.info(
        `Injected ${res.secrets.length} secrets from ${res.project.name} [${res.environment.name}] into environment.`,
      );
    } catch (err: any) {
      spinner.fail('Failed to fetch secrets from vault');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }

    const [cmd, ...args] = commandArgs;

    try {
      const subprocess = execa(cmd, args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...secretMap,
        },
      });

      const result = await subprocess;
      process.exit(result.exitCode || 0);
    } catch (err: any) {
      if (err.exitCode !== undefined) {
        process.exit(err.exitCode);
      }
      logger.error(`Failed to execute command: ${err.message}`);
      process.exit(1);
    }
  });
