import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import biomePlugin from './index';

interface InvocationRecord {
  args: string[];
}

const repoRoot = process.cwd();
const fixtureRoot = path.join(repoRoot, 'fixtures', 'hmr-workspace');
const fixtureScope = path.relative(repoRoot, path.join(fixtureRoot, 'src'));
const fullScopePath = path.join(repoRoot, fixtureScope);
const recordBiomeScript = path.join(repoRoot, 'fixtures', 'record-biome.cjs');

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readInvocationRecords = async (logFile: string): Promise<InvocationRecord[]> => {
  try {
    const content = await fs.readFile(logFile, 'utf8');
    const trimmed = content.trim();
    if (!trimmed) {
      return [];
    }

    return trimmed.split('\n').map((line) => JSON.parse(line) as InvocationRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const waitForInvocationRecords = async (
  logFile: string,
  minimumRecords: number,
): Promise<InvocationRecord[]> => {
  const timeoutAt = Date.now() + 5000;

  while (Date.now() < timeoutAt) {
    const records = await readInvocationRecords(logFile);
    if (records.length >= minimumRecords) {
      return records;
    }

    await sleep(50);
  }

  throw new Error(`Timed out waiting for ${minimumRecords} Biome invocation(s).`);
};

describe.sequential('biome plugin HMR integration', () => {
  let server: ViteDevServer | null = null;
  let logFile = '';

  beforeEach(async () => {
    logFile = path.join(
      os.tmpdir(),
      `vite-plugin-biome-${Date.now()}-${Math.random().toString(16).slice(2)}.log`,
    );
    await fs.writeFile(logFile, '');

    server = await createServer({
      root: fixtureRoot,
      configFile: false,
      logLevel: 'silent',
      server: {
        port: 0,
      },
      plugins: [
        biomePlugin({
          files: fixtureScope,
          hotUpdateMode: 'changed',
          biomeCommandBase: `"${process.execPath}" "${recordBiomeScript}" "${logFile}"`,
        }),
      ],
    });

    await server.listen();
    await server.transformRequest('/src/main.ts');
    await waitForInvocationRecords(logFile, 1);
    await fs.writeFile(logFile, '');
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }

    if (logFile) {
      await fs.rm(logFile, { force: true });
    }
  });

  it('reruns Biome only for the edited source file during HMR', async () => {
    const changedFile = path.join(fixtureRoot, 'src', 'main.ts');

    server!.watcher.emit('change', changedFile);

    const [record] = await waitForInvocationRecords(logFile, 1);

    expect(record.args[0]).toBe('lint');
    expect(record.args).toContain(changedFile);
    expect(record.args).not.toContain(fullScopePath);
  });

  it('falls back to the configured scope when a Biome config file changes', async () => {
    const changedConfigFile = path.join(fixtureRoot, 'biome.json');

    server!.watcher.emit('change', changedConfigFile);

    const [record] = await waitForInvocationRecords(logFile, 1);

    expect(record.args[0]).toBe('lint');
    expect(record.args).toContain(fullScopePath);
    expect(record.args).not.toContain(changedConfigFile);
  });
});
