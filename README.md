# Vite Plugin Biome

This is a Vite plugin for integrating the Biome linter into your Vite project. It allows you to lint, format, or check your project files using Biome directly within the Vite build process.

## Features

- Integrates Biome linter, formatter, and checker into the Vite build process.
- Supports different modes: linting, formatting, and checking.
- Prints Biome output to the console.
- Configurable to apply fixes and handle errors.

## Installation

```bash
npm install vite-plugin-biome
```

## Usage

First, add the plugin to your `vite.config.js` file. You can specify the mode (`lint`, `format`, `check`), the files to be processed, and other options.

### Basic Usage

For basic linting:

```javascript
import biomePlugin from 'vite-plugin-biome';

export default {
  plugins: [biomePlugin()],
};
```

### Advanced Usage

#### Linting

To lint files without applying fixes:

```javascript
import biomePlugin from 'vite-plugin-biome';

export default {
  plugins: [biomePlugin({
    mode: 'lint',
    files: '.' // This is the default, it will lint all files in a project
  })],
};
```

#### Formatting

To format and write changes to files:

```javascript
import biomePlugin from 'vite-plugin-biome';

export default {
  plugins: [biomePlugin({
    mode: 'format',
    files: 'src/**/*.js', // Format only JavaScript files in src
    applyFixes: true
  })],
};
```

#### Checking

To perform both linting and formatting with applied fixes:

```javascript
import biomePlugin from 'vite-plugin-biome';

export default {
  plugins: [biomePlugin({
    mode: 'check',
    files: '.',
    applyFixes: true
  })],
};
```

### Options

- `mode`: `'lint'` (default), `'format'`, or `'check'`.
- `files`: File or glob pattern to process (e.g., `'src/**/*.js'`). The default is `'.'`, for all files.
- `applyFixes`: `true` to apply fixes (for `format` and `check` modes), `false` otherwise.
- `failOnError`: Set to `true` to fail the build on errors, `false` by default.

## License

[MIT LICENSE](LICENSE)

[GitHub](https://github.com/skrulling/vite-plugin-biome)