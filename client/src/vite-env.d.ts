/// <reference types="vite/client" />

declare module 'ansi-to-html' {
  interface AnsiOptions {
    fg?: string;
    bg?: string;
    newline?: boolean;
    escapeXML?: boolean;
    stream?: boolean;
  }
  export default class Ansi {
    constructor(options?: AnsiOptions);
    toHtml(input: string): string;
  }
}

declare module 'lucide-react';
