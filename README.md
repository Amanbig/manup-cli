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

## 🔑 Authentication

Log in to your self-hosted ManUp server instance (`http://localhost:7780` by default):

```bash
# Interactive login (select API key or Email/Password)
manup login

# Non-interactive API key login
manup login --server http://localhost:7780 --api-key mp_your_api_key
```

Verify your active session & server connection:

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
manup init
```

This interactively prompts you to select a project and environment, creating a local `.manup.json` configuration file in your directory.

---

## 🔐 Managing Secrets

### List Secrets

```bash
# List masked secrets
manup secrets

# Reveal plain values
manup secrets ls --reveal

# Output JSON
manup secrets --json
```

### Get a Specific Secret

```bash
manup secrets get DATABASE_URL
```

### Create or Update a Secret

```bash
# Using argument pair
manup secrets set API_TOKEN super_secret_val

# Using KEY=VALUE syntax
manup secrets set API_TOKEN=super_secret_val
```

### Delete a Secret

```bash
manup secrets delete API_TOKEN
```

### Export Secrets

```bash
# Export to .env file
manup secrets export --out .env

# Export as shell export commands
manup secrets export --format export

# Output JSON map
manup secrets export --format json
```

---

## 🚀 Running Commands with Vault Secrets (`manup run`)

Inject all environment secrets from your linked ManUp vault into any command without writing them to disk:

```bash
# Node.js app
manup run -- node index.js

# NPM script
manup run -- npm start

# Python / Docker / Custom scripts
manup run -- python app.py
```

Override environment on the fly:

```bash
manup run --env <environmentId> -- npm test
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
