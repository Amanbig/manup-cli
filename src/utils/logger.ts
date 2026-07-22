import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import Table from 'cli-table3';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
  title: (msg: string) => console.log(chalk.bold.cyan(`\n🔒 ManUp: ${msg}`)),
  subdued: (msg: string) => console.log(chalk.gray(msg)),
};

export const createSpinner = (text: string): Ora => {
  return ora({ text, color: 'cyan' });
};

export const printTable = (headers: string[], rows: (string | number)[][]): void => {
  const table = new Table({
    head: headers.map((h) => chalk.cyan.bold(h)),
    style: { head: [], border: [] },
  });
  rows.forEach((row) => table.push(row));
  console.log(table.toString());
};
