import { createFilter, normalizePath } from 'vite';
import { exec } from 'child_process';
import path from 'path';
import { createRequire } from 'module';
const BIOME_CONFIG_FILES = new Set([
    '.editorconfig',
    'biome.json',
    'biome.jsonc',
]);
const hasGlobPattern = (value) => /[*?[\]{}()!+@]/.test(value);
const quoteForShell = (value) => `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
const resolveTargetPath = (cwd, value) => path.resolve(cwd, value);
const createFileMatcher = (cwd, files) => {
    if (!files || files === '.') {
        return () => true;
    }
    if (hasGlobPattern(files)) {
        const filter = createFilter(files);
        return (file) => filter(normalizePath(path.relative(cwd, file)));
    }
    const targetPath = resolveTargetPath(cwd, files);
    return (file) => file === targetPath || file.startsWith(`${targetPath}${path.sep}`);
};
const isBiomeConfigFile = (file) => BIOME_CONFIG_FILES.has(path.basename(file));
const resolveBiomeBin = () => {
    const require = createRequire(process.cwd() + "/");
    try {
        // Resolve Biome from the consumer project (process.cwd()).
        const pkgPath = require.resolve('@biomejs/biome/package.json', { paths: [process.cwd()] });
        const pkgDir = path.dirname(pkgPath);
        return path.join(pkgDir, 'bin', 'biome');
    }
    catch (error) {
        throw new Error('Could not find @biomejs/biome. Please install it in your project.');
    }
};
const biomePlugin = (options = {}) => {
    const cwd = process.cwd();
    const useChangedFileHotUpdates = options.hotUpdateMode === 'changed';
    const matchesConfiguredFiles = createFileMatcher(cwd, options.files);
    let running = null;
    let pendingFullRun = false;
    const pendingFiles = new Set();
    const runBiome = async (targetFiles) => {
        // Use process.execPath to invoke Node.js explicitly (Windows doesn't support shebangs)
        const biomeCommandBase = options.biomeCommandBase ??
            `${quoteForShell(process.execPath)} ${quoteForShell(resolveBiomeBin())}`;
        const filesToProcess = targetFiles?.length
            ? targetFiles
            : [resolveTargetPath(cwd, options.files ?? '.')];
        const command = [
            biomeCommandBase,
            options.mode ?? 'lint',
            ...filesToProcess.map(quoteForShell),
            (options.forceColor ?? true) && '--colors=force',
            options.diagnosticLevel && `--diagnostic-level=${options.diagnosticLevel}`,
            options.logKind && `--log-kind=${options.logKind}`,
            options.applyFixes && '--write',
            options.applyFixes && options.unsafe && '--unsafe',
            options.biomeAdditionalArgs,
        ]
            // remove excluded args
            .filter((a) => !!a)
            .join(" ");
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (stderr) {
                    console.error(`Biome Stderr:\n${stderr}`);
                }
                if (stdout) {
                    console.log(`Biome Output:\n${stdout}`);
                }
                if (error && options.failOnError) {
                    reject('Build failed due to Biome errors.');
                }
                resolve();
            });
        });
    };
    const queueFullRun = () => {
        pendingFullRun = true;
        pendingFiles.clear();
    };
    const queueFileRun = (file) => {
        if (!pendingFullRun) {
            pendingFiles.add(file);
        }
    };
    const takePendingRun = () => {
        if (pendingFullRun) {
            pendingFullRun = false;
            pendingFiles.clear();
            return { kind: 'full' };
        }
        if (pendingFiles.size === 0) {
            return { kind: 'none' };
        }
        const files = Array.from(pendingFiles);
        pendingFiles.clear();
        return { kind: 'files', files };
    };
    const executePendingRun = async () => {
        if (running)
            return running;
        const nextRun = takePendingRun();
        if (nextRun.kind === 'none') {
            return;
        }
        running = runBiome(nextRun.kind === 'files' ? nextRun.files : undefined);
        try {
            await running;
        }
        finally {
            running = null;
            if (pendingFullRun || pendingFiles.size > 0) {
                debouncedExecuteCommand();
            }
        }
    };
    const debounce = (func, wait) => {
        let timeout = null;
        return (...args) => {
            if (timeout !== null) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => func(...args), wait);
        };
    };
    const debouncedExecuteCommand = debounce(() => {
        void executePendingRun();
    }, 500);
    return {
        name: 'vite-plugin-biome',
        async buildStart() {
            queueFullRun();
            await executePendingRun();
        },
        async handleHotUpdate(context) {
            if (!useChangedFileHotUpdates) {
                queueFullRun();
                debouncedExecuteCommand();
                return;
            }
            const changedFile = path.resolve(context.file);
            if (isBiomeConfigFile(changedFile)) {
                queueFullRun();
            }
            else if (matchesConfiguredFiles(changedFile)) {
                queueFileRun(changedFile);
            }
            else {
                return;
            }
            debouncedExecuteCommand();
        },
    };
};
export default biomePlugin;
