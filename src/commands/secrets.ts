import { Command } from 'commander';
import fs from 'node:fs';
import { ManUpClient, type Secret } from '../api/client.js';
import { logger, createSpinner, printTable } from '../utils/logger.js';

const maskSecret = (value: string): string => {
  if (!value) return '';
  if (value.includes('\n')) {
    return '**** (multi-line)';
  }
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '****' + value.substring(value.length - 2);
};

export const secretsCommand = new Command('secrets')
  .alias('secret')
  .description('Manage vault secrets (list, get, set, delete, export)');

// --- Command: secrets list (default action) ---
secretsCommand
  .command('list', { isDefault: true })
  .alias('ls')
  .description('List all secrets in current or specified environment')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .option('-r, --reveal', 'Reveal plain secret values instead of masking')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const spinner = createSpinner('Retrieving decrypted secrets...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const res = await client.fetchSecrets({ env: options.env, project: options.project });
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(res.secrets, null, 2));
        return;
      }

      if (res.secrets.length === 0) {
        logger.info(`No secrets found in ${res.project.name} [${res.environment.name}].`);
        return;
      }

      logger.title(`Secrets — ${res.project.name} [${res.environment.name}]`);
      const rows = res.secrets.map((s: Secret) => [
        s.key,
        options.reveal ? s.value : maskSecret(s.value),
        s.name || '-',
        s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '-',
      ]);

      printTable(['Key', 'Value', 'Name / Note', 'Last Updated'], rows);
    } catch (err: any) {
      spinner.fail('Failed to retrieve secrets');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: secrets get <key> ---
secretsCommand
  .command('get <key>')
  .description('Get value of a specific secret by key')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .option('--json', 'Output as JSON object')
  .action(async (keyArg: string, options) => {
    const targetKey = keyArg.toUpperCase().trim();
    const spinner = createSpinner(`Fetching secret "${targetKey}"...`);
    spinner.start();

    try {
      const client = new ManUpClient();
      const res = await client.fetchSecrets({ env: options.env, project: options.project });
      spinner.stop();

      const secret = res.secrets.find((s: Secret) => s.key === targetKey);
      if (!secret) {
        logger.error(
          `Secret with key "${targetKey}" not found in ${res.project.name} [${res.environment.name}].`,
        );
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(secret, null, 2));
      } else {
        console.log(secret.value);
      }
    } catch (err: any) {
      spinner.fail('Failed to fetch secret');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: secrets set <key> [value] ---
secretsCommand
  .command('set <key> [value]')
  .description('Create or update a secret (key=value or separate arguments)')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .option('-n, --name <name>', 'Optional note/name for secret')
  .action(async (keyArg: string, valueArg: string | undefined, options) => {
    let key = keyArg;
    let value = valueArg;

    // Handle KEY=VALUE format
    if (key.includes('=')) {
      const parts = key.split('=');
      key = parts[0];
      value = parts.slice(1).join('=');
    }

    if (value === undefined) {
      logger.error(
        'Value is required. Usage: `manup secrets set KEY VALUE` or `manup secrets set KEY=VALUE`',
      );
      process.exit(1);
    }

    key = key.toUpperCase().trim();

    const spinner = createSpinner('Resolving environment target...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const { project, environment } = await client.resolveEnvironment(
        options.env,
        options.project,
      );

      spinner.text = `Saving secret "${key}" to ${project.name} [${environment.name}]...`;
      await client.setSecret(environment.id, key, value, options.name);
      spinner.succeed(
        `Successfully saved secret "${key}" in ${project.name} [${environment.name}].`,
      );
    } catch (err: any) {
      spinner.fail('Failed to save secret');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: secrets delete <key> ---
secretsCommand
  .command('delete <key>')
  .alias('rm')
  .description('Delete a secret by key')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .action(async (keyArg: string, options) => {
    const targetKey = keyArg.toUpperCase().trim();
    const spinner = createSpinner('Resolving environment target...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const { project, environment } = await client.resolveEnvironment(
        options.env,
        options.project,
      );

      spinner.text = `Locating secret "${targetKey}"...`;
      const secrets = await client.getSecrets(environment.id);
      const secret = secrets.find((s: Secret) => s.key === targetKey);

      if (!secret) {
        spinner.fail(`Secret "${targetKey}" not found in ${project.name} [${environment.name}].`);
        process.exit(1);
      }

      spinner.text = `Deleting secret "${targetKey}"...`;
      await client.deleteSecret(secret.id);
      spinner.succeed(
        `Successfully deleted secret "${targetKey}" from ${project.name} [${environment.name}].`,
      );
    } catch (err: any) {
      spinner.fail('Failed to delete secret');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });

// --- Command: secrets export ---
secretsCommand
  .command('export')
  .description('Export environment secrets to file or stdout')
  .option(
    '-e, --env <environment>',
    'Environment name (e.g. dev, prod), abbreviation, or ID (defaults to linked environment)',
  )
  .option('-p, --project <project>', 'Project name or ID (defaults to linked project)')
  .option('-f, --format <format>', 'Export format: env, json, export (default: env)', 'env')
  .option('-o, --out <filepath>', 'Output file path (e.g. .env)')
  .action(async (options) => {
    const spinner = createSpinner('Fetching secrets for export...');
    spinner.start();

    try {
      const client = new ManUpClient();
      const res = await client.fetchSecrets({ env: options.env, project: options.project });
      spinner.stop();

      let outputContent = '';

      if (options.format === 'json') {
        const secretObj: Record<string, string> = {};
        res.secrets.forEach((s: Secret) => {
          secretObj[s.key] = s.value;
        });
        outputContent = JSON.stringify(secretObj, null, 2);
      } else if (options.format === 'export') {
        outputContent = res.secrets
          .map((s: Secret) => `export ${s.key}="${s.value.replace(/"/g, '\\"')}"`)
          .join('\n');
      } else {
        // standard .env format
        outputContent = res.secrets
          .map((s: Secret) => {
            const val = s.value;
            if (
              val.includes('\n') ||
              val.includes('"') ||
              val.includes(' ') ||
              val.includes('#') ||
              val.includes('$')
            ) {
              return `${s.key}="${val.replace(/"/g, '\\"')}"`;
            }
            return `${s.key}=${val}`;
          })
          .join('\n');
      }

      if (options.out) {
        fs.writeFileSync(options.out, outputContent + '\n', 'utf-8');
        logger.success(
          `Exported ${res.secrets.length} secrets from ${res.project.name} [${res.environment.name}] to ${options.out}`,
        );
      } else {
        console.log(outputContent);
      }
    } catch (err: any) {
      spinner.fail('Export failed');
      logger.error(err.response?.data?.detail || err.message);
      process.exit(1);
    }
  });
