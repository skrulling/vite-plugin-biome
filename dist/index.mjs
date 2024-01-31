import { exec } from 'child_process';
const biomePlugin = (options = { mode: 'lint', files: '.', applyFixes: false, failOnError: false }) => {
    return {
        name: 'vite-plugin-biome',
        buildStart() {
            const files = options.files;
            let command;
            // Determine the command based on the mode
            switch (options.mode) {
                case 'format':
                    command = `biome format ${files} ${options.applyFixes ? '--write' : ''}`;
                    break;
                case 'check':
                    command = `biome check ${options.applyFixes ? '--apply' : ''} ${files}`;
                    break;
                case 'lint':
                default:
                    command = `biome lint ${files} ${options.applyFixes ? '--apply' : ''}`;
                    break;
            }
            // Execute the command
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error: ${error.message}`;
                    if (options.failOnError) {
                        this.error(errorMessage);
                    }
                    else {
                        console.error(errorMessage);
                    }
                    return;
                }
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return;
                }
                console.log(`Biome Output:\n${stdout}`);
            });
        },
    };
};
export default biomePlugin;
