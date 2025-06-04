from typing import List, Optional

from src.clients.qdrant_client import QdrantSearchClient
from src.models.models import SearchResult
from src.use_cases.use_case import UseCase


class VectorSearchInput:
    """Input for vector search use case"""

    def __init__(self, query: str, limit: int = 40000):
        self.query = query
        self.limit = limit


class VectorSearchUseCase(UseCase[VectorSearchInput, List[SearchResult]]):
    """Use case for searching documents using vector similarity"""

    def __init__(self, search_client: Optional[QdrantSearchClient] = None):
        """
        Initialize the vector search use case.

        Args:
            search_client: Client for vector search operations
        """
        self.search_client = search_client or QdrantSearchClient()

    def run(self, input_data: VectorSearchInput) -> List[SearchResult]:
        """
        Execute the vector search use case.

        Args:
            input_data: Vector search input parameters

        Returns:
            List of search results
        """
        return self.search_client.search(query=input_data.query, limit=input_data.limit)
