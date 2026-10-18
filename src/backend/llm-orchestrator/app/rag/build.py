"""Build / refresh the per-language FAQ vector index from the playbook markdown.

Shared by scripts/build_faq_index.py and RAGService: the index directory is
gitignored and was never built in the Docker image, so `answer_app_faq`
answered every question with "Sổ tay hướng dẫn tạm thời không khả dụng".
The service now builds a missing or stale index on first use.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

logger = logging.getLogger("llm-orchestrator.rag.build")

_DOCSTORE = "docstore.json"


def knowledge_files(src: Path) -> list[Path]:
    if not src.exists():
        return []
    return sorted(f for f in src.glob("*.md") if f.name.lower() != "readme.md")


def index_is_stale(src: Path, dst: Path) -> bool:
    """True when the index is missing or older than any playbook file."""
    marker = dst / _DOCSTORE
    if not marker.exists():
        return True
    built = marker.stat().st_mtime
    return any(f.stat().st_mtime > built for f in knowledge_files(src))


def build_index(src: Path, dst: Path, embed_model, *, rebuild: bool = True) -> bool:
    files = knowledge_files(src)
    if not files:
        logger.warning("FAQ build skipped — no playbook markdown in %s", src)
        return False
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

    if rebuild and dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True, exist_ok=True)
    documents = SimpleDirectoryReader(input_files=[str(f) for f in files], filename_as_id=True).load_data()
    index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
    index.storage_context.persist(persist_dir=str(dst))
    logger.info("FAQ index built | docs=%d path=%s", len(documents), dst)
    return True
