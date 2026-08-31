export type ProbeResult = {
  id: string;
  ok: boolean;
  latency_ms: number;
  detail: string;
};

export type HealthProbe = () => Promise<ProbeResult>;
