import { Command } from 'commander';
import { execa } from 'execa';
import { ManUpClient, type Secret } from '../api/client.js';
import { getLocalConfig } from '../config/store.js';
import { logger, createSpinner } from '../utils/logger.js';

export const runCommand = new Command('run')
  .description('Run a command with secrets injected into process environment')
  .option('-e, --env <environmentId>', 'Environment ID (defaults to linked environment)')
  .allowUnknownOption(true)
  .argument('<command...>', 'Command and arguments to execute')
  .action(async (commandArgs: string[], options) => {
    const localCfg = getLocalConfig();
    const envId = options.env || localCfg?.environmentId;

    if (!envId) {
      logger.error('Environment ID is required. Pass --env <envId> or run `manup init` to link a workspace.');
      process.exit(1);
    }

    const spinner = createSpinner('Fetching vault secrets...');
    spinner.start();

    let secretMap: Record<string, string> = {};

    try {
      const client = new ManUpClient();
      const secrets = await client.getSecrets(envId);
      spinner.stop();

      secrets.forEach((s: Secret) => {
        secretMap[s.key] = s.value;
      });

      logger.info(`Injected ${secrets.length} secrets into environment.`);
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
