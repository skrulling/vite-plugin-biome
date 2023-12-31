import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const biomePlugin = (options = { lintPath: "." }) => {
    return {
        name: 'vite-plugin-biome',
        buildStart() {
            // Get the directory name of the current module
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const lintPath = options.lintPath;
            // Use the local biome command
            exec(`biome lint ${lintPath}`, (error, stdout, stderr) => {
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
