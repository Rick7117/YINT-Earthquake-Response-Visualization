from typing import List
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from src.indexing.indexer import Indexer
from src.models.document import EmbeddedDocument


class QdrantIndexer(Indexer):
    """Qdrant implementation of the Indexer interface."""

    def __init__(self, host: str = "localhost", port: int = 6333, collection_name: str = "documents"):
        self.client = QdrantClient(host=host, port=port)
        self.collection_name = collection_name
        self._initialize_collection()

    def _initialize_collection(self) -> None:
        """Initialize a Qdrant collection."""
        # Create collection if it doesn't exist
        try:
            self.client.get_collection(collection_name=self.collection_name)
        except Exception:
            # Use a default dimension, will be updated when first document is indexed
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def index_batch(self, embedded_documents: List[EmbeddedDocument]) -> None:
        """Index embedded documents to Qdrant."""
        if not embedded_documents:
            return

        points = []
        for embedded_doc in embedded_documents:
            doc = embedded_doc.document
            # Create payload with document metadata
            payload = {
                "time": doc.time,
                "location": doc.location,
                "account": doc.account,
                "message": doc.message,
                "embedding_model": embedded_doc.embedding_model,
            }
            
            # Generate unique ID based on document content (ensure positive integer)
            doc_id = abs(hash(f"{doc.time}_{doc.location}_{doc.account}_{doc.message}"))
            point = PointStruct(
                id=doc_id,
                vector=embedded_doc.embedding.tolist(),
                payload=payload
            )
            points.append(point)

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
