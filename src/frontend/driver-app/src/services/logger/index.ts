/**
 * Canonical structured logger for driver-app.
 *
 *   bind({ room, conv })
 *   const log = getLogger("voice_connect")
 *   log.info("DEV ok=true event=voice_connect", { duration_ms: 42 })
 *
 * Silent in production builds (`__DEV__` is false). Line shape matches
 * backend `services/logger`.
 */
import { formatLine, type LogFields } from "./format";

export { formatLine, fmtValue } from "./format";
export type { LogFields } from "./format";

const SERVICE = "driver-app";

let store: { room: string; conv: string } = { room: "-", conv: "-" };

export function bind(ctx: { room?: string; conv?: string }): void {
  store = {
    room: ctx.room ?? store.room,
    conv: ctx.conv ?? store.conv,
  };
}

export function clearLogContext(): void {
  store = { room: "-", conv: "-" };
}

function nowTs(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function shouldEmit(): boolean {
  return typeof __DEV__ === "undefined" || __DEV__;
}

export function getLogger(fn: string, service = SERVICE) {
  const emit = (level: "debug" | "info" | "warning" | "error", msg: string, fields?: LogFields) => {
    if (!shouldEmit()) {
      return;
    }
    const line = formatLine({
      ts: nowTs(),
      level: level.toUpperCase(),
      service,
      fn,
      room: store.room,
      conv: store.conv,
      msg,
      fields,
    });
    if (level === "error") {
      console.error(line);
      return;
    }
    if (level === "warning") {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
    info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
    warning: (msg: string, fields?: LogFields) => emit("warning", msg, fields),
    error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
  };
}
