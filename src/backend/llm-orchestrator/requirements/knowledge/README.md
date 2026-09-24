# Knowledge Base (RAG)

Playbook markdown is split by language for easier maintenance:

```
knowledge/
├── vi/          ← Vietnamese playbook + FAQ
│   └── app-playbook.md
└── en/          ← English playbook + FAQ
    └── app-playbook.md
```

Each language has its own LlamaIndex vector index under `data/faq_index/{vi,en}/`.

## Build vector index

```bash
cd src/backend/llm-orchestrator
ENV=local python scripts/build_faq_index.py           # vi + en
ENV=local python scripts/build_faq_index.py --lang vi # Vietnamese only
ENV=local python scripts/build_faq_index.py --rebuild
```

Requires `OPENAI_API_KEY` in `envs/.env.local`.

## Adding content

1. Edit or add `.md` files in `vi/` or `en/` (keep languages in sync when possible)
2. Rebuild the index for that language (or both)
3. Restart llm-orchestrator

## Runtime

```env
FAQ_RAG_ENABLED=true
FAQ_KNOWLEDGE_DIR=requirements/knowledge
FAQ_INDEX_DIR=data/faq_index
```

The `answer_app_faq` tool loads `data/faq_index/vi` or `data/faq_index/en` based on voicebot language.
