import { Command } from 'commander';
import chalk from 'chalk';
import { ManUpClient, type ApiKeyItem } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';

export const keysCommand = new Command('keys')
  .alias('api-keys')
  .alias('key')
  .description('Manage API keys (list, create, revoke)');

// --- Command: keys list (default) ---
keysCommand
  .command('list', { isDefault: true })
  .alias('ls')
  .description('List all active API keys')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const spinner = createSpinner('Fetching API keys...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const keys = await client.listApiKeys();
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(keys, null, 2));
        return;
      }

      if (keys.length === 0) {
        logger.info('No API keys found for this account.');
        return;
      }

      logger.title('API Keys');
      const rows = keys.map((k: ApiKeyItem) => {
        const projectScope = k.projectName
          ? `${k.projectName} (${k.projectId})`
          : chalk.gray('All Projects (Org-wide)');

        const expires = k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never';
        const lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never';

        return [
          k.id,
          k.name,
          k.scope,
          projectScope,
          k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '-',
          lastUsed,
          expires,
        ];
      });

      printTable(
        ['Key ID', 'Name', 'Scope', 'Project Scope', 'Created', 'Last Used', 'Expires'],
        rows,
      );
    } catch (err: any) {
      spinner.fail('Failed to fetch API keys');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: keys create <name> ---
keysCommand
  .command('create <name>')
  .description('Create a new API key')
  .option('-s, --scope <scope>', 'Key scope: "full" (read/write) or "read-only"', 'full')
  .option('-p, --project <project>', 'Scope key to a specific project name or ID (optional)')
  .option('-d, --days <days>', 'Expiration in days (e.g. 30, 90)')
  .option('--json', 'Output result as JSON')
  .action(async (nameArg: string, options) => {
    const name = nameArg.trim();
    if (!name) {
      logger.error('API key name is required.');
      process.exit(1);
    }

    const scope = options.scope === 'read-only' ? 'read-only' : 'full';
    let projectId: string | null = null;
    let projectName: string | null = null;

    const spinner = createSpinner('Generating API key...');
    spinner.start();

    try {
      const client = new ManUpClient();

      if (options.project) {
        const project = await client.resolveProject(options.project);
        projectId = project.id;
        projectName = project.name;
      }

      const days = options.days ? parseInt(options.days, 10) : undefined;
      const result = await client.createApiKey(name, scope, undefined, projectId, days);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      logger.success(`API Key created successfully for "${result.name}"!`);
      if (result.apiKey) {
        console.log('\n' + chalk.bgGreen.black.bold(' YOUR NEW API KEY ') + '\n');
        console.log(chalk.bold.green(result.apiKey));
        console.log(
          '\n' +
            chalk.yellow(
              '⚠️  Save this key securely! It will NEVER be displayed again by the server.',
            ) +
            '\n',
        );
      }

      const rows = [
        ['Key ID', result.id],
        ['Name', result.name],
        ['Scope', result.scope],
        [
          'Project Scope',
          projectName ? `${projectName} (${projectId})` : 'All Projects (Org-wide)',
        ],
        ['Expires At', result.expiresAt ? new Date(result.expiresAt).toLocaleString() : 'Never'],
      ];

      printTable(['Property', 'Value'], rows);
    } catch (err: any) {
      spinner.fail('Failed to create API key');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: keys delete <id> ---
keysCommand
  .command('delete <id>')
  .alias('rm')
  .alias('revoke')
  .description('Revoke and delete an API key by ID')
  .action(async (idArg: string) => {
    const keyId = idArg.trim();
    const spinner = createSpinner(`Revoking API key "${keyId}"...`);
    spinner.start();

    try {
      const client = new ManUpClient();
      await client.deleteApiKey(keyId);
      spinner.succeed(`API Key "${keyId}" has been revoked.`);
    } catch (err: any) {
      spinner.fail('Failed to revoke API key');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });
