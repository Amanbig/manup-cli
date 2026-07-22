import { Command } from 'commander';
import * as p from '@clack/prompts';
import { ManUpClient } from '../api/client.js';
import { setGlobalConfig, clearGlobalAuth, getGlobalConfig } from '../config/store.js';
import { logger, createSpinner } from '../utils/logger.js';

export const loginCommand = new Command('login')
  .description('Authenticate with ManUp vault server')
  .option('-s, --server <url>', 'ManUp server URL (e.g. http://localhost:7780)')
  .option('-k, --api-key <key>', 'API key (mp_...)')
  .action(async (options) => {
    p.intro('🔒 ManUp Login');

    const globalConfig = getGlobalConfig();
    let serverUrl = options.server;
    let apiKey = options.apiKey;

    if (!serverUrl) {
      const serverInput = await p.text({
        message: 'Enter ManUp Server URL:',
        placeholder: globalConfig.serverUrl || 'http://localhost:7780',
        defaultValue: globalConfig.serverUrl || 'http://localhost:7780',
      });
      if (p.isCancel(serverInput)) {
        p.cancel('Login cancelled.');
        process.exit(0);
      }
      serverUrl = serverInput;
    }

    if (!apiKey) {
      const method = await p.select({
        message: 'How would you like to authenticate?',
        options: [
          { label: 'API Key (mp_...)', value: 'apikey' },
          { label: 'Email & Password', value: 'credentials' },
        ],
      });

      if (p.isCancel(method)) {
        p.cancel('Login cancelled.');
        process.exit(0);
      }

      if (method === 'apikey') {
        const keyInput = await p.text({
          message: 'Enter your ManUp API Key:',
          placeholder: 'mp_...',
          validate: (val) => (!val ? 'API key cannot be empty' : undefined),
        });
        if (p.isCancel(keyInput)) {
          p.cancel('Login cancelled.');
          process.exit(0);
        }
        apiKey = keyInput;
      } else {
        const email = await p.text({
          message: 'Email:',
          validate: (val) => (!val ? 'Email is required' : undefined),
        });
        if (p.isCancel(email)) {
          p.cancel('Login cancelled.');
          process.exit(0);
        }

        const password = await p.password({
          message: 'Password:',
          validate: (val) => (!val ? 'Password is required' : undefined),
        });
        if (p.isCancel(password)) {
          p.cancel('Login cancelled.');
          process.exit(0);
        }

        const spinner = createSpinner('Authenticating with server...');
        spinner.start();
        try {
          const client = new ManUpClient(serverUrl);
          const loginRes = await client.login(email as string, password as string);

          // Optionally generate a persistent CLI API key or use session token
          let userApiKey = loginRes.apiKey;
          if (!userApiKey) {
            setGlobalConfig({ serverUrl, user: loginRes.user });
          }

          setGlobalConfig({
            serverUrl,
            apiKey: userApiKey,
            user: loginRes.user,
          });

          spinner.succeed('Logged in successfully!');
          p.outro(`Authenticated as ${loginRes.user.email}`);
          return;
        } catch (err: any) {
          spinner.fail('Authentication failed');
          logger.error(err.response?.data?.detail || err.message || 'Login failed');
          process.exit(1);
        }
      }
    }

    const spinner = createSpinner('Verifying API Key...');
    spinner.start();

    try {
      const client = new ManUpClient(serverUrl, apiKey);
      const user = await client.getCurrentUser();

      setGlobalConfig({
        serverUrl,
        apiKey,
        user,
      });

      spinner.succeed('Authentication successful!');
      p.outro(`Logged in as ${user.email} (${user.name || user.username || 'User'})`);
    } catch (err: any) {
      spinner.fail('API Key verification failed');
      logger.error(err.response?.data?.detail || err.message || 'Invalid server URL or API Key');
      process.exit(1);
    }
  });

export const logoutCommand = new Command('logout')
  .description('Log out and remove stored authentication credentials')
  .action(() => {
    clearGlobalAuth();
    logger.success('Successfully logged out.');
  });
