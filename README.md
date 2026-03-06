# Vite Plugin Biome

Run [Biome](https://biomejs.dev/) inside your Vite dev loop.

`vite-plugin-biome` lets you lint, format, or check files with the Biome version already installed in your project. It runs on Vite startup and reacts to hot updates, so feedback shows up while you build instead of in a separate step.

By default, each hot update reruns Biome for the configured `files` scope. If you want faster feedback during development, you can opt into rerunning only the edited files.

## Why Use It

- Keep Biome output inside the normal Vite workflow.
- Run `lint`, `format`, or `check` without wiring extra scripts into your day-to-day loop.
- Apply fixes automatically when you want them.
- Fail the build on Biome errors when you need stricter enforcement.
- Pass through extra Biome CLI args such as `--changed` or `--config-path=...`.

## AI-Assisted Development

This plugin is not AI-specific, but it fits well into AI-assisted workflows with tools like Cursor, Claude Code, Codex, and Windsurf. When generated edits touch many files quickly, keeping Biome in the Vite loop helps surface feedback immediately without changing your existing setup.

## Compatibility

This plugin is compatible with:

- **Biome**: 1.8.0 and higher, including 2.x
- **Vite**: 4.x and higher
- **Node.js**: 16.x and higher

By default, the plugin resolves and runs the `@biomejs/biome` binary installed in your project. If you need to use a different command, override `biomeCommandBase`.

## Installation

```bash
npm install -D vite-plugin-biome @biomejs/biome
```

## Usage

Add the plugin to your `vite.config.js` or `vite.config.ts` file.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [biomePlugin()],
});
```

## Common Setups

### Fast Local Guardrails

Run Biome in `lint` mode during development.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [
    biomePlugin({
      mode: 'lint',
      files: '.',
    }),
  ],
});
```

### Auto-Fix During Development

Run Biome in `check` mode and write fixes back to disk.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [
    biomePlugin({
      mode: 'check',
      files: '.',
      applyFixes: true,
    }),
  ],
});
```

### Recheck Only Edited Files During HMR

Keep the initial startup run broad, but limit hot updates to the files you just edited.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [
    biomePlugin({
      mode: 'check',
      files: 'src',
      hotUpdateMode: 'changed',
    }),
  ],
});
```

### Strict Build Feedback

Fail the build when Biome reports errors.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [
    biomePlugin({
      mode: 'check',
      failOnError: true,
    }),
  ],
});
```

### Pass Extra Biome Arguments

Forward additional CLI args to Biome.

```ts
import { defineConfig } from 'vite';
import biomePlugin from 'vite-plugin-biome';

export default defineConfig({
  plugins: [
    biomePlugin({
      mode: 'check',
      biomeAdditionalArgs: '--changed',
    }),
  ],
});
```

## Options

| Option | Description | Values | Default |
|---|---|---|---|
| `mode` | The Biome command to run | `lint`, `format`, `check` | `lint` |
| `files` | File or glob pattern to process | e.g. `'src/**/*.js'` | `'.'` |
| `hotUpdateMode` | How Vite hot updates trigger Biome. `full` reruns the configured scope on every change. `changed` reruns only edited files when possible, with a full fallback for Biome config changes. Startup still runs against the configured scope. | `full`, `changed` | `full` |
| `applyFixes` | Apply Biome fixes automatically | `true`, `false` | `false` |
| `unsafe` | Allow unsafe fixes, requires `applyFixes` | `true`, `false` | `false` |
| `failOnError` | Fail the build when Biome returns errors | `true`, `false` | `false` |
| `forceColor` | Force color output by adding `--colors=force` | `true`, `false` | `true` |
| `diagnosticLevel` | Minimum diagnostic level to show | `info`, `warn`, `error` | `info` |
| `logKind` | Output style for Biome logs | `pretty`, `compact`, `check` | `pretty` |
| `biomeCommandBase` | Override the command used to invoke Biome | e.g. `'npx @biomejs/biome'` | Auto-resolved |
| `biomeAdditionalArgs` | Additional CLI arguments passed to Biome | e.g. `'--changed --config-path=...'` | — |

## License

[MIT LICENSE](LICENSE)

If this plugin saves you time, consider starring the repo:
[GitHub](https://github.com/skrulling/vite-plugin-biome)
