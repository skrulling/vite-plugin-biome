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

describe('biome plugin output handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
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
    const plugin = biomePlugin(options) as Plugin & {
      buildStart: () => Promise<void>;
      handleHotUpdate: (ctx: { file: string }) => Promise<void>;
    };

    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      const err = execResult.error;
      cb(err, execResult.stdout, execResult.stderr);
      return undefined as any;
    });

    return plugin.buildStart();
  }

  // ── Test 1: stderr content logged only once ─────────────────────────
  it('logs stderr content only once (no duplicate from error.message)', async () => {
    const stderrText = 'some-biome-diagnostic-output';
    const error = new Error(stderrText) as Error & { code?: number };
    error.code = 1;

    await createPluginAndRun({}, { error, stdout: '', stderr: stderrText });

    const occurrences = countOccurrences(consoleErrorSpy, stderrText);

    expect(occurrences).toBe(1);
  });

  // ── Test 2: stdout content not duplicated to stderr ─────────────────
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

  // ── Test 3: no triple output — only stderr + stdout logged ──────────
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

  // ── Test 4: lint/style errors logged correctly (stderr + stdout) ────
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

    // stderr (1) + stdout (1) = 2, which is correct (different streams)
    expect(totalOccurrences).toBe(2);
  });

  // ── Test 5: execution guard prevents concurrent runs ─────────────────
  it('prevents overlapping execution when buildStart is still running', async () => {
    const plugin = biomePlugin() as Plugin & {
      buildStart: () => Promise<void>;
      handleHotUpdate: (ctx: { file: string }) => Promise<void>;
    };

    let execCallCount = 0;
    let resolveCb: (() => void) | null = null;

    // Make exec async — don't call cb until we say so
    mockedExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
      execCallCount++;
      resolveCb = () => cb(null, 'biome output', '');
      return undefined as any;
    });

    // buildStart fires but doesn't resolve yet (exec hasn't called back)
    const buildPromise = plugin.buildStart();

    // While buildStart is still running, directly call executeCommand via buildStart again
    const secondPromise = plugin.buildStart();

    // Only one exec call should have been made — second call reuses the running promise
    expect(execCallCount).toBe(1);

    // Now let the exec callback fire
    resolveCb!();
    await buildPromise;
    await secondPromise;

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 6: clean success produces single output (baseline) ──────────
  it('produces single output on clean success (no duplication)', async () => {
    const output = 'All checks passed';

    await createPluginAndRun({}, { error: null, stdout: output, stderr: '' });

    const logOccurrences = countOccurrences(consoleLogSpy, output);
    const errorOccurrences = countOccurrences(consoleErrorSpy, output);

    // No bug here: only stdout is logged once, no error path triggered
    expect(logOccurrences).toBe(1);
    expect(errorOccurrences).toBe(0);
  });
});
