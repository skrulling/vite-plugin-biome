import { Plugin } from 'vite';
import { exec } from 'child_process';

const biomePlugin = (): Plugin => {
  return {
    name: 'vite-plugin-biome',
    buildStart() {
      exec('npx @biomejs/biome lint <files>', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Stderr: ${stderr}`);
          return;
        }
        console.log(`Biome Linter Output:\n${stdout}`);
      });
    },
  };
};

export default biomePlugin;