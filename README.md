# Vite Plugin Biome

This is a Vite plugin for integrating the Biome linter into your Vite project.

## Features

- Integrates Biome linter into the Vite build process.
- Prints Biome linter output to the console.

## Installation

```bash
npm install vite-plugin-biome
```

## Usage

Add the plugin to your `vite.config.js`

```javascript
import biomePlugin from 'vite-plugin-biome';

export default {
  plugins: [biomePlugin()],
};
```

[Check it out on GitHub](https://github.com/skrulling/vite-plugin-biome)