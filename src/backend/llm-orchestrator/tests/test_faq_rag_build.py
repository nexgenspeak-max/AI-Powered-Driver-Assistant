import os
import time

from app.rag.build import index_is_stale, knowledge_files
from app.rag.service import strip_markdown


def test_index_missing_or_older_than_playbook_is_stale(tmp_path):
    src = tmp_path / "knowledge"
    dst = tmp_path / "index"
    src.mkdir()
    (src / "README.md").write_text("ignored")
    playbook = src / "app-playbook.md"
    playbook.write_text("# Playbook")
    assert [f.name for f in knowledge_files(src)] == ["app-playbook.md"]
    assert index_is_stale(src, dst)

    dst.mkdir()
    (dst / "docstore.json").write_text("{}")
    past = time.time() - 60
    os.utime(playbook, (past, past))
    assert not index_is_stale(src, dst)

    playbook.write_text("# Playbook v2")
    os.utime(playbook, None)
    os.utime(dst / "docstore.json", (past - 10, past - 10))
    assert index_is_stale(src, dst)


def test_strip_markdown_for_spoken_answers():
    raw = "Vào *Cá nhân → Cài đặt trợ lý*, bật **Chế độ rảnh tay** rồi nói **\"hey AI\"**."
    assert strip_markdown(raw) == 'Vào Cá nhân → Cài đặt trợ lý, bật Chế độ rảnh tay rồi nói "hey AI".'
    assert strip_markdown("- Một\n2. Hai") == "Một\nHai"
