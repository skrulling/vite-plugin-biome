export interface Options {
  mode?: Mode;
  files?: string;
  failOnError?: boolean;
  applyFixes?: boolean;
  unsafe?: boolean;
}

export type Mode = 'lint' | 'format' | 'check'
