import type { ElectronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      token: {
        get: () => Promise<{ accessToken: string; refreshToken: string } | null>;
        set: (data: {
          accessToken: string;
          refreshToken: string;
        }) => Promise<boolean>;
        clear: () => Promise<boolean>;
      };
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<boolean>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
    };
  }
}
