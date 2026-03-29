export {};

declare global {
  interface Window {
    electron: typeof import('./index').electronAPI;
    api: Record<string, unknown>;
  }
}
