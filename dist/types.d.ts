export interface Options {
    mode?: Mode;
    files?: string;
    failOnError?: boolean;
    applyFixes?: boolean;
}
export type Mode = 'lint' | 'format' | 'check';
