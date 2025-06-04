from abc import ABC, abstractmethod
from typing import List

from src.models.models import SearchResult


class SearchClient(ABC):
    """Abstract base class for search client implementations."""

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> List[SearchResult]:
        """
        Search for documents similar to the query.

        Args:
            query: The search query text
            limit: Maximum number of results to return

        Returns:
            List of search results
        """
        pass
