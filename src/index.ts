import { Plugin } from 'vite';
import { exec } from 'child_process';
import path from 'path';
import { Options } from './types';

const biomePlugin = (options: Options = { mode: 'lint', files: '.', applyFixes: false, failOnError: false }): Plugin => {
  const executeCommand = async () => {
    const filesPath = path.join(process.cwd(), options.files ?? ".");
    const commandBase = `npx @biomejs/biome`;
    const command = `${commandBase} ${options.mode} ${filesPath} ${options.applyFixes ? (options.mode === 'format' ? '--write' : '--apply') : ''
      } --colors=force`;

    return new Promise<void>((resolve, reject) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (stderr) {
          console.error(`Biome Stderr:\n${stderr}`);
        }
        if (stdout) {
          console.log(`Biome Output:\n${stdout}`);
        }
        if (error) {
          console.log(error.code)
          if (!stderr.includes("lint/style")) {
            console.error(`Biome Execution Error: ${error.message}`);
          }
          if (options.failOnError) reject(`Build failed due to Biome errors.`);
        }
        resolve();
      });
    });
  };

  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      const context = this;
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  const debouncedExecuteCommand = debounce(executeCommand, 500);

  return {
    name: 'vite-plugin-biome',
    async buildStart() {
      await executeCommand();
    },
    async handleHotUpdate() {
      await debouncedExecuteCommand();
    },
  };
};

export default biomePlugin;

