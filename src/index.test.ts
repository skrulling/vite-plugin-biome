import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Plugin } from 'vite';

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock module.createRequire so resolveBiomeBin() doesn't throw
vi.mock('module', () => ({
  createRequire: () => ({
    resolve: () => '/fake/node_modules/@biomejs/biome/package.json',
  }),
}));

import { exec } from 'child_process';
import biomePlugin from './index';

const mockedExec = vi.mocked(exec);

type PluginUnderTest = Plugin & {
  buildStart: () => Promise<void>;
  handleHotUpdate: (ctx: { file: string }) => Promise<void>;
};

/** Helper: count how many times a substring appears across all calls to a spy */
function countOccurrences(spy: ReturnType<typeof vi.spyOn>, substring: string): number {
  let count = 0;
  for (const call of spy.mock.calls) {
    for (const arg of call) {
      if (typeof arg === 'string' && arg.includes(substring)) {
        count++;
      }
    }
  }
  return count;
}

const createPlugin = (
  options: Parameters<typeof biomePlugin>[0] = {},
): PluginUnderTest => biomePlugin(options) as PluginUnderTest;

const createHotUpdate = (file: string) => ({ file });

const getExecCommand = (callIndex = 0): string =>
  mockedExec.mock.calls[callIndex]?.[0] as string;

describe('biome plugin output handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  /**
   * Helper to get the plugin and invoke buildStart.
   * Returns after the exec callback fires.
   */
  function createPluginAndRun(
    options: Parameters<typeof biomePlugin>[0] = {},
    execResult: { error: (Error & { code?: number }) | null; stdout: string; stderr: string },
  ): Promise<void> {
    const plugin = createPlugin(options);

    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      const err = execResult.error;
      cb(err, execResult.stdout, execResult.stderr);
      return undefined as any;
    });

    return plugin.buildStart();
  }

  it('logs stderr content only once (no duplicate from error.message)', async () => {
    const stderrText = 'some-biome-diagnostic-output';
    const error = new Error(stderrText) as Error & { code?: number };
    error.code = 1;

    await createPluginAndRun({}, { error, stdout: '', stderr: stderrText });

    const occurrences = countOccurrences(consoleErrorSpy, stderrText);

    expect(occurrences).toBe(1);
  });

  it('does not log stdout content to stderr via error.message', async () => {
    const stdoutText = 'biome-stdout-diagnostics';
    const error = new Error(stdoutText) as Error & { code?: number };
    error.code = 1;

    await createPluginAndRun({}, { error, stdout: stdoutText, stderr: '' });

    const stdoutLogCount = countOccurrences(consoleLogSpy, stdoutText);
    const errorLogCount = countOccurrences(consoleErrorSpy, stdoutText);

    expect(stdoutLogCount).toBeGreaterThanOrEqual(1);
    expect(errorLogCount).toBe(0);
  });

  it('logs only stderr and stdout, not error.message', async () => {
    const diagnosticText = 'shared-diagnostic-text';
    const error = new Error(`Command failed: ${diagnosticText}`) as Error & { code?: number };
    error.code = 1;

    await createPluginAndRun(
      {},
      { error, stdout: diagnosticText, stderr: diagnosticText },
    );

    const errorOccurrences = countOccurrences(consoleErrorSpy, diagnosticText);
    const logOccurrences = countOccurrences(consoleLogSpy, diagnosticText);
    const totalOccurrences = errorOccurrences + logOccurrences;

    expect(totalOccurrences).toBe(2);
  });

  it('logs lint/style errors via stderr and stdout without duplication', async () => {
    const diagnosticText = 'lint/style something wrong';
    const error = new Error(diagnosticText) as Error & { code?: number };
    error.code = 1;

    await createPluginAndRun(
      {},
      { error, stdout: diagnosticText, stderr: diagnosticText },
    );

    const errorOccurrences = countOccurrences(consoleErrorSpy, diagnosticText);
    const logOccurrences = countOccurrences(consoleLogSpy, diagnosticText);
    const totalOccurrences = errorOccurrences + logOccurrences;

    expect(totalOccurrences).toBe(2);
  });

  it('prevents overlapping execution when buildStart is still running', async () => {
    const plugin = createPlugin();

    let execCallCount = 0;
    let resolveCb: (() => void) | null = null;

    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      execCallCount++;
      resolveCb = () => cb(null, 'biome output', '');
      return undefined as any;
    });

    const buildPromise = plugin.buildStart();
    const secondPromise = plugin.buildStart();

    expect(execCallCount).toBe(1);

    resolveCb!();
    await buildPromise;
    await secondPromise;

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  it('produces single output on clean success (no duplication)', async () => {
    const output = 'All checks passed';

    await createPluginAndRun({}, { error: null, stdout: output, stderr: '' });

    const logOccurrences = countOccurrences(consoleLogSpy, output);
    const errorOccurrences = countOccurrences(consoleErrorSpy, output);

    expect(logOccurrences).toBe(1);
    expect(errorOccurrences).toBe(0);
  });
});

describe('biome plugin hot update handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      cb(null, '', '');
      return undefined as any;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('reruns the full configured scope by default on every hot update', async () => {
    const plugin = createPlugin({ files: 'src/**/*.ts' });

    await plugin.buildStart();
    mockedExec.mockClear();

    const changedFile = path.join(process.cwd(), 'README.md');
    void plugin.handleHotUpdate(createHotUpdate(changedFile));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(getExecCommand()).toContain(`"${path.join(process.cwd(), 'src/**/*.ts')}"`);
    expect(getExecCommand()).not.toContain(`"${changedFile}"`);
  });

  it('reruns only the edited file when the hot update is inside the configured scope', async () => {
    const plugin = createPlugin({ files: 'src', hotUpdateMode: 'changed' });

    await plugin.buildStart();
    mockedExec.mockClear();

    const changedFile = path.join(process.cwd(), 'src', 'index.ts');
    void plugin.handleHotUpdate(createHotUpdate(changedFile));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(getExecCommand()).toContain(`"${changedFile}"`);
    expect(getExecCommand()).not.toContain(`"${path.join(process.cwd(), 'src')}"`);
  });

  it('batches multiple hot updates into a single Biome invocation', async () => {
    const plugin = createPlugin({ files: 'src', hotUpdateMode: 'changed' });

    await plugin.buildStart();
    mockedExec.mockClear();

    const changedFileA = path.join(process.cwd(), 'src', 'index.ts');
    const changedFileB = path.join(process.cwd(), 'src', 'types.ts');

    void plugin.handleHotUpdate(createHotUpdate(changedFileA));
    void plugin.handleHotUpdate(createHotUpdate(changedFileB));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(getExecCommand()).toContain(`"${changedFileA}"`);
    expect(getExecCommand()).toContain(`"${changedFileB}"`);
  });

  it('ignores hot updates outside the configured scope', async () => {
    const plugin = createPlugin({ files: 'src/**/*.ts', hotUpdateMode: 'changed' });

    await plugin.buildStart();
    mockedExec.mockClear();

    const changedFile = path.join(process.cwd(), 'README.md');
    void plugin.handleHotUpdate(createHotUpdate(changedFile));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).not.toHaveBeenCalled();
  });

  it('falls back to a full run when a Biome config file changes', async () => {
    const plugin = createPlugin({ files: 'src', hotUpdateMode: 'changed' });

    await plugin.buildStart();
    mockedExec.mockClear();

    const changedConfigFile = path.join(process.cwd(), 'biome.json');
    void plugin.handleHotUpdate(createHotUpdate(changedConfigFile));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(getExecCommand()).toContain(`"${path.join(process.cwd(), 'src')}"`);
    expect(getExecCommand()).not.toContain(`"${changedConfigFile}"`);
  });

  it('runs queued hot updates after the current Biome process finishes', async () => {
    const plugin = createPlugin({ files: 'src', hotUpdateMode: 'changed' });

    await plugin.buildStart();
    mockedExec.mockReset();

    const callbacks: Array<(error: Error | null, stdout: string, stderr: string) => void> = [];
    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      callbacks.push(cb);
      return undefined as any;
    });

    const changedFileA = path.join(process.cwd(), 'src', 'index.ts');
    const changedFileB = path.join(process.cwd(), 'src', 'types.ts');

    void plugin.handleHotUpdate(createHotUpdate(changedFileA));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(getExecCommand(0)).toContain(`"${changedFileA}"`);

    void plugin.handleHotUpdate(createHotUpdate(changedFileB));
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(1);

    callbacks[0](null, '', '');
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);

    expect(mockedExec).toHaveBeenCalledTimes(2);
    expect(getExecCommand(1)).toContain(`"${changedFileB}"`);
  });
});
