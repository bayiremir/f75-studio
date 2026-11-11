export {};

declare global {
  interface Window {
    aula?: {
      minimize(): void;
      maximize(): void;
      close(): void;
      quit(): void;
      setCloseToTray(v: boolean): void;
      getAutostart(): Promise<boolean>;
      setAutostart(v: boolean): Promise<boolean>;
      info(): Promise<{ version: string; globalKeys: boolean }>;
      onKey(cb: (k: { id: string; down: boolean }) => void): () => void;
      onMaximized(cb: (v: boolean) => void): () => void;
      onTrayToggle(cb: () => void): () => void;
      onBeforeQuit(cb: () => Promise<void>): void;
    };
  }
}
