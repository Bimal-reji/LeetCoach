"""RAG-style retrieval over the DSA knowledge base.

Uses FAISS (HNSW/IVF) when ``faiss-cpu`` is installed and the index exists,
otherwise falls back to a fast keyword/BM25-lite scorer. The retriever
grounds the AI chat and hint generation in curated DSA explanations, patterns,
and interview tips.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import settings
from app.logging_conf import get_logger

logger = get_logger(__name__)

try:
    import numpy as np  # type: ignore

    _NP_OK = True
except Exception:  # pragma: no cover
    np = None  # type: ignore
    _NP_OK = False

try:
    import faiss  # type: ignore

    _FAISS_OK = True
except Exception:  # pragma: no cover
    faiss = None  # type: ignore
    _FAISS_OK = False


class Retriever:
    """Retrieve relevant knowledge-base chunks for a query."""

    def __init__(self) -> None:
        self._documents: list[dict] = []
        self._index: Any = None
        self._loaded = False

    def load(self) -> None:
        """Load the knowledge base and (optionally) the FAISS index."""
        path = Path(settings.knowledge_base_path)
        if not path.exists():
            logger.info("Knowledge base %s missing; retriever inactive", path)
            return
        try:
            self._documents = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            logger.warning("Corrupt knowledge base; retriever inactive")
            return

        if _FAISS_OK and _NP_OK and Path(settings.faiss_index_path).exists():
            try:
                self._index = faiss.read_index(settings.faiss_index_path)
                logger.info("FAISS index loaded (%d vectors)", self._index.ntotal)
            except Exception as exc:  # pragma: no cover
                logger.warning("FAISS load failed (%s); using keyword fallback", exc)
                self._index = None
        self._loaded = True

    def _keyword_score(self, query: str, doc: dict) -> float:
        q = query.lower()
        text = " ".join(
            [doc.get("title", ""), doc.get("summary", ""), " ".join(doc.get("tags", [])), doc.get("pattern", "")]
        ).lower()
        if q in text:
            return 5.0
        terms = [t for t in q.replace("-", " ").split() if len(t) > 2]
        if not terms:
            return 0.0
        return sum(2.0 if t in text else 0.0 for t in terms) / len(terms)

    def retrieve(self, query: str, k: int = 5) -> list[dict]:
        """Return the top-k knowledge chunks for a query."""
        if not self._loaded:
            self.load()
        if not self._documents:
            return []

        if self._index is not None and _NP_OK:
            # Crude but functional embedding: character-frequency bag.
            vocab = "etaoinshrdlucmfwypvbgkjqxz"
            vecs = np.zeros((len(self._documents), len(vocab)), dtype="float32")
            for i, doc in enumerate(self._documents):
                text = (doc.get("title", "") + " " + doc.get("summary", "")).lower()
                for j, ch in enumerate(vocab):
                    vecs[i][j] = text.count(ch)
            try:
                qvec = np.zeros((1, len(vocab)), dtype="float32")
                for j, ch in enumerate(vocab):
                    qvec[0][j] = query.lower().count(ch)
                _, idxs = self._index.search(qvec, min(k, self._index.ntotal))
                return [self._documents[int(i)] for i in idxs[0] if int(i) >= 0]
            except Exception:  # pragma: no cover - index mismatch
                self._index = None

        scored = [(self._keyword_score(query, d), d) for d in self._documents]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [d for s, d in scored[:k] if s > 0]


retriever = Retriever()
