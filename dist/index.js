"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const biomePlugin = () => {
    return {
        name: 'vite-plugin-biome',
        buildStart() {
            (0, child_process_1.exec)('npx @biomejs/biome lint <files>', (error, stdout, stderr) => {
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
exports.default = biomePlugin;
