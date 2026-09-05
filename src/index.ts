import { Command } from 'commander';
import { loginCommand, logoutCommand } from './commands/login.js';
import { whoamiCommand } from './commands/whoami.js';
import { initCommand } from './commands/init.js';
import { projectsCommand } from './commands/projects.js';
import { envCommand } from './commands/environments.js';
import { secretsCommand } from './commands/secrets.js';
import { runCommand } from './commands/run.js';
import { keysCommand } from './commands/apiKeys.js';

const program = new Command();

program
  .name('manup')
  .description('🔒 Official CLI for ManUp Secrets Vault — Manage & inject environment secrets')
  .version('0.3.0');

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(initCommand);
program.addCommand(projectsCommand);
program.addCommand(envCommand);
program.addCommand(keysCommand);
program.addCommand(secretsCommand);
program.addCommand(runCommand);

program.parse(process.argv);
