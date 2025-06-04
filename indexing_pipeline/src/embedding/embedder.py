from abc import ABC, abstractmethod
from typing import List

from src.models.document import Document, EmbeddedDocument


class Embedder(ABC):
    """Interface for embedding documents in the RAG pipeline."""

    @abstractmethod
    def embed_batch(self, documents: List[Document]) -> List[EmbeddedDocument]:
        """
        Process a list of Documents and embed them.

        Args:
            documents: A list of Document objects to embed

        Returns:
            A list of EmbeddedDocument objects with embedded text and metadata
        """
        pass