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
                    command = `npx @biomejs/biome format ${files} ${options.applyFixes ? '--write' : ''} --colors=force`;
                    break;
                case 'check':
                    command = `npx @biomejs/biome check ${options.applyFixes ? '--apply' : ''} ${files} --colors=force`;
                    break;
                case 'lint':
                default:
                    command = `npx @biomejs/biome lint ${files} ${options.applyFixes ? '--apply' : ''} --colors=force`;
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
