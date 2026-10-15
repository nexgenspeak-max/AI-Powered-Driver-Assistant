# Biến môi trường cho SC-01, SC-02, RS-03: LiveKit cục bộ (--dev), nhà cung cấp AI giả lập, không có khóa thật.
# Dùng: source sc_agent_env.sh (từ src/backend/llm-orchestrator)
export ENV=bench CONFIG_FILE=/nonexistent JWT_SECRET=bench-secret
export LIVEKIT_URL=ws://127.0.0.1:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret
export AGENT_NAME=bench-agent AGENT_LANG=vn
export STT_PROVIDER=openai STT_MODEL=whisper-1 STT_LANGUAGE=vi-VN STT_FALLBACK=
export LLM_PROVIDER=openai LLM_MODEL=gpt-4o-mini LLM_FALLBACK=
export TTS_PROVIDER=openai OPENAI_TTS_MODEL=tts-1 TTS_FALLBACK=
export OPENAI_API_KEY=fake OPENAI_BASE_URL=http://127.0.0.1:18600/v1
export TRIP_SERVICE_URL=http://127.0.0.1:18503 CALL_LOGGER_URL=http://127.0.0.1:18503
export FAQ_RAG_ENABLED=false PROMPT_TRACE_ENABLED=false
