import { Command } from 'commander';
import * as p from '@clack/prompts';
import os from 'node:os';
import { ManUpClient } from '../api/client.js';
import { setGlobalConfig, clearGlobalAuth, getGlobalConfig } from '../config/store.js';
import { logger, createSpinner } from '../utils/logger.js';

export const loginCommand = new Command('login')
  .description('Authenticate with ManUp vault server')
  .option('-s, --server <url>', 'ManUp server URL (e.g. http://localhost:7780)')
  .option('-k, --api-key <key>', 'API Key (mp_...)')
  .option('-u, --user <emailOrUsername>', 'Email or username for direct login')
  .option('-p, --password <password>', 'Password for direct login')
  .action(async (options) => {
    p.intro('🔒 ManUp Login');

    const globalConfig = getGlobalConfig();
    let serverUrl = options.server;
    let apiKey = options.apiKey;
    let usernameInput = options.user;
    let passwordInput = options.password;

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

    // Direct Login via non-interactive username & password flags
    if (usernameInput && passwordInput && !apiKey) {
      const spinner = createSpinner('Authenticating with server...');
      spinner.start();
      try {
        const client = new ManUpClient(serverUrl);
        const loginRes = await client.login(usernameInput, passwordInput);

        let finalApiKey = loginRes.apiKey;
        let finalToken = loginRes.token;

        if (!finalApiKey && finalToken) {
          try {
            const tokenClient = new ManUpClient(serverUrl, undefined, finalToken);
            const keyRecord = await tokenClient.createApiKey(
              `manup-cli (${os.hostname()})`,
              'full',
            );
            if (keyRecord?.apiKey) {
              finalApiKey = keyRecord.apiKey;
              finalToken = undefined;
            }
          } catch {
            // Fall back to session JWT token if key creation is unauthorized
          }
        }

        setGlobalConfig({
          serverUrl,
          apiKey: finalApiKey,
          token: finalToken,
          refreshToken: finalToken ? loginRes.refreshToken : undefined,
          user: loginRes.user,
        });

        spinner.succeed('Logged in successfully!');
        p.outro(
          `Authenticated as ${loginRes.user.email} (${loginRes.user.name || loginRes.user.username || 'User'})`,
        );
        return;
      } catch (err: any) {
        spinner.fail('Authentication failed');
        logger.error(err.response?.data?.detail || err.message || 'Login failed');
        process.exit(1);
      }
    }

    // Interactive method selection if neither API Key nor Username/Password flags were fully passed
    if (!apiKey) {
      const method = await p.select({
        message: 'How would you like to authenticate?',
        options: [
          { label: 'Direct Login (Email / Username & Password)', value: 'credentials' },
          { label: 'API Key (mp_...)', value: 'apikey' },
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
          validate: (val) => (!val ? 'API Key cannot be empty' : undefined),
        });
        if (p.isCancel(keyInput)) {
          p.cancel('Login cancelled.');
          process.exit(0);
        }
        apiKey = keyInput;
      } else {
        const identifier = await p.text({
          message: 'Email or Username:',
          validate: (val) => (!val ? 'Email or Username is required' : undefined),
        });
        if (p.isCancel(identifier)) {
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

        const spinner = createSpinner('Authenticating credentials...');
        spinner.start();
        try {
          const client = new ManUpClient(serverUrl);
          const loginRes = await client.login(identifier as string, password as string);

          let finalApiKey = loginRes.apiKey;
          let finalToken = loginRes.token;

          if (!finalApiKey && finalToken) {
            try {
              const tokenClient = new ManUpClient(serverUrl, undefined, finalToken);
              const keyRecord = await tokenClient.createApiKey(
                `manup-cli (${os.hostname()})`,
                'full',
              );
              if (keyRecord?.apiKey) {
                finalApiKey = keyRecord.apiKey;
                finalToken = undefined;
              }
            } catch {
              // Retain JWT token as fallback
            }
          }

          setGlobalConfig({
            serverUrl,
            apiKey: finalApiKey,
            token: finalToken,
            refreshToken: finalToken ? loginRes.refreshToken : undefined,
            user: loginRes.user,
          });

          spinner.succeed('Logged in successfully!');
          p.outro(
            `Authenticated as ${loginRes.user.email} (${loginRes.user.name || loginRes.user.username || 'User'})`,
          );
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
        token: undefined,
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
