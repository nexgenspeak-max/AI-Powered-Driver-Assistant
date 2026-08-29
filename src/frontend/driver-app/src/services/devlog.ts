/**
 * Structured development traces. Grep Metro / browser console for `DEV `.
 *
 * Silent in production builds (`__DEV__` is false). Line shape is owned by
 * `services/logger` — callers pass event + facts only.
 */
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getLogger, type LogFields } from "./logger";

type TimedConfig = InternalAxiosRequestConfig & { _devlogStartedAt?: number };

export const devlog = {
  event(kind: string, fields: LogFields & { ok?: boolean } = {}) {
    const ok = fields.ok !== false;
    const rest: LogFields = { ...fields };
    delete rest.ok;
    const log = getLogger(kind);
    const msg = `DEV ok=${ok ? "true" : "false"} event=${kind}`;
    if (ok) {
      log.info(msg, rest);
      return;
    }
    log.error(msg, rest);
  },
};

/** Success + failure HTTP traces. Register after the client's own interceptors. */
export function attachHttpDevlog(client: AxiosInstance) {
  client.interceptors.request.use((config: TimedConfig) => {
    config._devlogStartedAt = Date.now();
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const startedAt = (response.config as TimedConfig)._devlogStartedAt;
      devlog.event("http", {
        ok: true,
        method: (response.config.method ?? "get").toUpperCase(),
        path: response.config.url,
        status: response.status,
        duration_ms: startedAt != null ? Date.now() - startedAt : undefined,
      });
      return response;
    },
    (err) => {
      if (err.response?.status === 401) {
        return Promise.reject(err);
      }
      const config = err.config as TimedConfig | undefined;
      const startedAt = config?._devlogStartedAt;
      devlog.event("http", {
        ok: false,
        method: (config?.method ?? "get").toUpperCase(),
        path: config?.url,
        status: err.response?.status,
        duration_ms: startedAt != null ? Date.now() - startedAt : undefined,
        error: err.message,
      });
      return Promise.reject(err);
    },
  );
}
