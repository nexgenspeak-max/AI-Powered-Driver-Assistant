/*
 * Agent config snapshot baked into the Lambda bundle (AGENT_SOURCE=bundled).
 * The deployed ops-service cannot read llm-orchestrator's files, so
 * infra/ops-service/deploy.sh runs `npm run snapshot:agent` before `sam build`
 * to overwrite this file, then restores this placeholder. Keep it `null` in git.
 */
import type { AgentSnapshot, PromptsSnapshot } from './index';

export const BUNDLED_AGENT: { agent: AgentSnapshot; prompts: PromptsSnapshot } | null = null;
