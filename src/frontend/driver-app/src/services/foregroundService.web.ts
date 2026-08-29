type ForegroundServiceModule = {
  register: (opts: unknown) => void;
  start: (opts: unknown) => Promise<void>;
  stop: () => Promise<void>;
};

const noop: ForegroundServiceModule = {
  register: () => {},
  start: async () => {},
  stop: async () => {},
};

export function getForegroundService(): ForegroundServiceModule {
  return noop;
}
