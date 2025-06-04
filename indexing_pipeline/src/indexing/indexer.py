from abc import ABC, abstractmethod
from typing import List

from src.models.document import EmbeddedDocument


class Indexer(ABC):
    """Interface for indexing embedded documents in the RAG pipeline."""

    @abstractmethod
    def index_batch(self, embedded_documents: List[EmbeddedDocument]) -> None:
        """
        Index a batch of embedded documents.

        Args:
            embedded_documents: A list of EmbeddedDocument objects to index
        """
        pass
