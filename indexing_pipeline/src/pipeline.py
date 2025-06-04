from typing import List

from src.embedding.embedder import Embedder
from src.indexing.indexer import Indexer
from src.data_loader import DataLoader
from src.models.document import Document


class Pipeline:
    """Main pipeline for processing documents through embedding and indexing."""

    def __init__(
        self,
        data_loader: DataLoader,
        embedder: Embedder,
        indexer: Indexer,
    ):
        self.data_loader = data_loader
        self.embedder = embedder
        self.indexer = indexer

    def run(self, batch_size: int = 32) -> None:
        """Run the complete pipeline."""
        print("Starting pipeline...")
        
        # Load documents in batches
        for batch_idx, documents in enumerate(self.data_loader.load_in_batches(batch_size)):
            print(f"Processing batch {batch_idx + 1} with {len(documents)} documents...")
            
            # Embed documents directly
            embedded_documents = self.embedder.embed_batch(documents)
            print(f"Generated embeddings for {len(embedded_documents)} documents")
            
            # Index embedded documents
            self.indexer.index_batch(embedded_documents)
            print(f"Indexed {len(embedded_documents)} documents")
        
        print("Pipeline completed successfully!")
