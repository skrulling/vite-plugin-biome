export interface Options {
    mode?: Mode;
    files?: string;
    /**
     * Controls how hot updates trigger Biome during Vite dev.
     * `full` reruns Biome for the configured `files` scope on every hot update.
     * `changed` reruns only the edited files when possible, with a full fallback
     * for Biome config changes.
     *
     * Defaults to `full`.
     */
    hotUpdateMode?: HotUpdateMode;
    /**
     * Force color of outputted logs (adds `--colors=force`).
     * Defaults to `true`.
     */
    forceColor?: boolean;
    /** Defaults to `npx @biomejs/biome` */
    biomeCommandBase?: string;
    /**
     * Specify your own arguments to follow the calls to biome cli.
     * For example, `"--changed --config-path=..."` would
     * limit the files checked to only the ones changed compared to your base branch,
     * and it would specify a different config file or directory to use.
     */
    biomeAdditionalArgs?: string;
    /**
     * The level of diagnostics to show. In order, from the lowest
     * to the most important: info, warn, error. Passing `--diagnostic-level=error`
     * will cause Biome to print only diagnostics that contain only errors.
     * [default: info]
     */
    diagnosticLevel?: DiagnosticLevel;
    /** How the log should look like. [default: pretty] */
    logKind?: LogKind;
    failOnError?: boolean;
    applyFixes?: boolean;
    unsafe?: boolean;
}
export type Mode = 'lint' | 'format' | 'check';
export type HotUpdateMode = 'full' | 'changed';
export type LogKind = "pretty" | "compact" | "check";
export type DiagnosticLevel = "info" | "warn" | "error";
