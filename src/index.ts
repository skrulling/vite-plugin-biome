import { Plugin, createFilter, normalizePath } from 'vite';
import { exec } from 'child_process';
import path from 'path';
import { createRequire } from 'module';
import { Options } from './types';

const BIOME_CONFIG_FILES = new Set([
  '.editorconfig',
  'biome.json',
  'biome.jsonc',
]);

const hasGlobPattern = (value: string): boolean => /[*?[\]{}()!+@]/.test(value);

const quoteForShell = (value: string): string =>
  `"${value.replace(/(["\\$`])/g, '\\$1')}"`;

const resolveTargetPath = (cwd: string, value: string): string =>
  path.resolve(cwd, value);

const createFileMatcher = (cwd: string, files?: string) => {
  if (!files || files === '.') {
    return () => true;
  }

  if (hasGlobPattern(files)) {
    const filter = createFilter(files);
    return (file: string) => filter(normalizePath(path.relative(cwd, file)));
  }

  const targetPath = resolveTargetPath(cwd, files);

  return (file: string) =>
    file === targetPath || file.startsWith(`${targetPath}${path.sep}`);
};

const isBiomeConfigFile = (file: string): boolean =>
  BIOME_CONFIG_FILES.has(path.basename(file));

const resolveBiomeBin = (): string => {
  const require = createRequire(process.cwd() + "/");
  try {
    // Resolve Biome from the consumer project (process.cwd()).
    const pkgPath = require.resolve('@biomejs/biome/package.json', { paths: [process.cwd()] });
    const pkgDir = path.dirname(pkgPath);
    return path.join(pkgDir, 'bin', 'biome');
  } catch (error) {
    throw new Error('Could not find @biomejs/biome. Please install it in your project.');
  }
};

const biomePlugin = (options: Options = {}): Plugin => {
  const cwd = process.cwd();
  const useChangedFileHotUpdates = options.hotUpdateMode === 'changed';
  const matchesConfiguredFiles = createFileMatcher(cwd, options.files);
  let running: Promise<void> | null = null;
  let pendingFullRun = false;
  const pendingFiles = new Set<string>();

  const runBiome = async (targetFiles?: readonly string[]) => {
    // Use process.execPath to invoke Node.js explicitly (Windows doesn't support shebangs)
    const biomeCommandBase =
      options.biomeCommandBase ??
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
      .filter((a: undefined | false | string): a is string => !!a)
      .join(" ");

    return new Promise<void>((resolve, reject) => {
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

  const queueFileRun = (file: string) => {
    if (!pendingFullRun) {
      pendingFiles.add(file);
    }
  };

  const takePendingRun = () => {
    if (pendingFullRun) {
      pendingFullRun = false;
      pendingFiles.clear();
      return { kind: 'full' } as const;
    }

    if (pendingFiles.size === 0) {
      return { kind: 'none' } as const;
    }

    const files = Array.from(pendingFiles);
    pendingFiles.clear();
    return { kind: 'files', files } as const;
  };

  const executePendingRun = async () => {
    if (running) return running;

    const nextRun = takePendingRun();
    if (nextRun.kind === 'none') {
      return;
    }

    running = runBiome(nextRun.kind === 'files' ? nextRun.files : undefined);
    try {
      await running;
    } finally {
      running = null;
      if (pendingFullRun || pendingFiles.size > 0) {
        debouncedExecuteCommand();
      }
    }
  };

  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
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
      } else if (matchesConfiguredFiles(changedFile)) {
        queueFileRun(changedFile);
      } else {
        return;
      }

      debouncedExecuteCommand();
    },
  };
};

export default biomePlugin;
