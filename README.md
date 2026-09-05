# ManUp CLI 🔒

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/manup-cli.svg)](https://www.npmjs.com/package/manup-cli)
[![Node.js CI](https://github.com/Amanbig/manup-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Amanbig/manup-cli/actions)

The official Command Line Interface (CLI) for **[ManUp](https://github.com/Amanbig/ManUp)** — an open-source, self-hosted Secrets Vault.

`manup-cli` allows developers and CI/CD pipelines to seamlessly authenticate, manage secrets across environments, export `.env` files, and execute commands with vault secrets injected directly into process environments.

---

## ⚡ Quickstart

### 1. Installation

Install globally via `npm`:

```bash
npm install -g manup-cli
```

Or run directly using `npx`:

```bash
npx manup-cli --help
```

---

## 🔑 Authentication & Security

Log in to your self-hosted ManUp server instance (`http://localhost:7780` by default):

```bash
# Interactive login (select Direct Email/Password or API Key)
manup login

# Direct login via credentials flags
manup login --server http://localhost:7780 --user dev@example.com --password mysecretpass

# Non-interactive API key login
manup login --server http://localhost:7780 --api-key mp_your_api_key
```

### 🔒 Security & Credential Storage

- **AES-256 Machine Encryption**: Credentials are stored in `~/.config/manup-cli-nodejs/` encrypted via AES-256-CBC using a key derived from your machine identity (`scrypt` hash of hostname, username, and homedir).
- **File Permissions**: POSIX file permissions are automatically set to `0600` (`rw-------`, owner read/write only).
- **Environment Overrides**: For CI/CD and automation scripts, set `MANUP_API_KEY` (or `MANUP_TOKEN`) and `MANUP_SERVER_URL` to override local configuration statelessly:

```bash
export MANUP_SERVER_URL="http://localhost:7780"
export MANUP_API_KEY="mp_your_ci_api_key"
manup secrets
```

Verify your active session & authentication method:

```bash
manup whoami
```

To log out and clear stored credentials:

```bash
manup logout
```

---

## 🔗 Linking a Workspace Directory

Link your local project directory to a specific project and environment in ManUp:

```bash
cd /path/to/my-project

# Interactive wizard:
manup init

# Or scriptable non-interactive linking by project & environment name:
manup init -p my-project -e dev
```

This creates a local `.manup.json` configuration file in your directory that automatically scopes subsequent CLI commands.

---

## 🔐 Managing Secrets

All secret commands support environment and project resolution by name (e.g. `dev`, `prod`, `staging`), common abbreviations (`dev`, `prod`, `stage`), or ID:

### List Secrets

```bash
# List secrets for linked environment (masked values)
manup secrets

# Reveal plaintext values
manup secrets ls --reveal

# Specify environment and project by name
manup secrets ls -e dev
manup secrets ls -p backend-api -e prod

# Output JSON
manup secrets --json
```

### Get a Specific Secret

```bash
manup secrets get DATABASE_URL
manup secrets get DATABASE_URL -e prod
```

### Create or Update a Secret

```bash
# Using argument pair
manup secrets set API_TOKEN super_secret_val -e dev

# Using KEY=VALUE syntax
manup secrets set API_TOKEN=super_secret_val -e prod -p backend-api
```

### Delete a Secret

```bash
manup secrets delete API_TOKEN -e dev
```

### Export Secrets

```bash
# Export to .env file
manup secrets export -e prod --out .env

# Export as shell export commands
manup secrets export -e dev --format export

# Output JSON key-value map
manup secrets export -e staging --format json
```

---

## 🚀 Running Commands with Vault Secrets (`manup run`)

Inject all environment secrets from your ManUp vault directly into any process environment without writing secrets to disk:

```bash
# Runs with linked environment secrets
manup run -- npm start
manup run -- node index.js
manup run -- python app.py

# Switch environment or project on the fly by name:
manup run -e dev -- npm start
manup run -e prod -- npm test
manup run -p backend -e staging -- npm run build
```

---

## 🔑 Managing API Keys (`manup keys`)

Provision and manage access tokens (including project-scoped API keys) directly from the CLI:

```bash
# List all API keys
manup keys

# Create an organization-wide key (read/write)
manup keys create ci-runner

# Create a read-only key scoped to a specific project with 90-day expiration
manup keys create prod-deployer --scope read-only --project backend --days 90

# Revoke an API key
manup keys delete <keyId>
```

---

## ⚙️ Configuration Storage

- **Global Auth Credentials**: Stored securely in OS user config directory (`~/.config/manup-cli-nodejs/config.json` on Linux/macOS).
- **Workspace Binding**: Stored in `./.manup.json` in your project folder (automatically ignored by git).

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/Amanbig/manup-cli.git
cd manup-cli

# Install dependencies
npm install

# Run in development mode
npm run dev -- --help

# Build project with tsup
npm run build

# Link binary globally for testing
npm link
```

---

## 🚀 Automated Publishing

Releases are published automatically to [npm](https://www.npmjs.com/package/manup-cli) via GitHub Actions whenever changes are pushed to `main` with a bumped `version` in `package.json`.

To publish a new release:

1. Bump version: `npm version patch` (or `minor`/`major`)
2. Push to main: `git push origin main`

The GitHub Action checks if the version in `package.json` is new and automatically publishes to NPM. _(Requires `NPM_TOKEN` configured in GitHub repository secrets)._

---

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting pull requests.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
