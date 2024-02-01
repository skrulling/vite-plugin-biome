import { Plugin } from 'vite';
import { exec } from 'child_process';
import path from 'path';
import { Options } from './types';

const biomePlugin = (options: Options = { mode: 'lint', files: '.', applyFixes: false, failOnError: false }): Plugin => {
  const executeCommand = async () => {
    const filesPath = path.join(process.cwd(), options.files ?? ".");
    const commandBase = `npx @biomejs/biome`;
    const command = `${commandBase} ${options.mode} ${filesPath} ${
      options.applyFixes ? (options.mode === 'format' ? '--write' : '--apply') : ''
    } --colors=force`;

    return new Promise<void>((resolve) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (stdout) {
          console.log(`Biome Output:\n${stdout}`);
        }
        if (stderr) {
          console.error(`Biome Stderr: ${stderr}`);
        }
        if (error) {
          // Log the error message but do not reject the promise if there's useful output
          console.error(`Biome Error: ${error.message}`);
        }
        resolve(); // Always resolve to continue the build process without failing
      });
    });
  };


  return {
    name: 'vite-plugin-biome',
    async buildStart() {
      await executeCommand();
    },
    async handleHotUpdate() {
      await executeCommand();
    },
  };
};

export default biomePlugin;
