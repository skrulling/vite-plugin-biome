# Vite Plugin Biome

This is a Vite plugin for integrating the [Biome](https://biomejs.dev/) linter into your Vite project. It allows you to lint, format, or check your project files using Biome directly within the Vite build process.
It is much faster than eslint.

## Features

- Integrates Biome linter, formatter, and checker into the Vite build process.
- Supports different modes: linting, formatting, and checking.
- Prints Biome output to the console.
- Configurable to apply fixes and handle errors.
- Reacts to hot reload

## Compatibility

This plugin is compatible with:
- **Biome**: 1.8.0 and higher (including all 2.x versions)
- **Vite**: 4.x and higher
- **Node.js**: 16.x and higher

The plugin uses Biome's stable CLI interface, ensuring compatibility across major Biome versions.

> Note: The plugin now resolves and runs the Biome binary already installed in your project (per the peer dependency). If you need to use a different binary, override `biomeCommandBase`.

## Installation

```bash
npm install vite-plugin-biome @biomejs/biome
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

| Option        | Description                                  | Values              | Default |
|---------------|----------------------------------------------|---------------------|---------|
| `mode`        | The operation mode of the plugin             | `lint`, `format`, `check` | `lint` |
| `files`       | File or glob pattern to process              | e.g., `'src/**/*.js'`| `'.'`   |
| `applyFixes`  | Whether to apply fixes automatically         | `true`, `false`     | `false` |
| `failOnError` | Whether to fail the build on lint errors     | `true`, `false`     | `false` |

## License

[MIT LICENSE](LICENSE)

[GitHub](https://github.com/skrulling/vite-plugin-biome)
