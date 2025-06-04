from typing import List

from sentence_transformers import SentenceTransformer
from src.embedding.embedder import Embedder
from src.models.document import Document, EmbeddedDocument


class SentenceTransformerEmbedder(Embedder):
    """Embedder using sentence-transformers models."""

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L12-v2",
        batch_size: int = 32,
    ):
        self.model = SentenceTransformer(model_name)
        self.batch_size = batch_size
        self.model_name = model_name

    def embed_batch(self, documents: List[Document]) -> List[EmbeddedDocument]:
        """Get embeddings for a batch of documents."""
        # Extract text from each document
        texts = [doc.message for doc in documents]

        # Generate embeddings in batches
        embeddings = self.model.encode(texts, batch_size=self.batch_size)

        # Create EmbeddedDocument objects
        embedded_documents = []
        for i, document in enumerate(documents):
            embedded_document = EmbeddedDocument(
                document=document, embedding=embeddings[i], embedding_model=self.model_name
            )
            embedded_documents.append(embedded_document)

        return embedded_documents
