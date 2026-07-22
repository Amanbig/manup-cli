# Contributing to ManUp CLI

Thank you for considering contributing to `manup-cli`! We welcome bug reports, feature suggestions, documentation updates, and pull requests.

## Development Setup

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/your-username/manup-cli.git
   cd manup-cli
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Development Commands**:
   - `npm run dev -- <command>` — Run CLI source directly with `tsx`
   - `npm run build` — Build project to `dist/` with `tsup`
   - `npm run typecheck` — Typecheck TypeScript code with `tsc --noEmit`

4. **Testing local changes globally**:
   ```bash
   npm link
   manup --version
   ```

## Commit Guidelines

We recommend using clear, descriptive commit messages:

- `feat: add export format option`
- `fix: correct environment resolution`
- `docs: update setup guide in README`

## Pull Request Checklist

Before submitting your PR:
- [ ] Run `npm run typecheck` and ensure zero errors.
- [ ] Run `npm run build` and ensure build completes cleanly.
- [ ] Test your CLI commands locally against a running ManUp server instance.
