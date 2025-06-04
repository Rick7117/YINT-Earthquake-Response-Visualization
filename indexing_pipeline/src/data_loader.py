import json
import csv
from pathlib import Path
from typing import Generator, List, Optional, Union

from src.models.document import Document


class DataLoader:
    """Loads documents from corpus files or Hugging Face datasets."""

    def __init__(self, corpus_path: Optional[Union[str, Path]] = None):
        """
        Initialize the data loader.

        Args:
            corpus_path: Optional path to the local corpus.jsonl file.
                         If None, will use Hugging Face datasets.
        """
        self.corpus_path = Path(corpus_path) if corpus_path else None

    def load_messages_from_csv(
        self, batch_size: Optional[int] = None, limit: Optional[int] = None
    ) -> Generator[List[Document], None, None]:
        """
        Load documents from a CSV file, using the 'message' column as text content.

        Args:
            batch_size: Number of documents to yield in each batch.
                        If None, returns all documents in one batch.
            limit: Maximum number of documents to load. If None, loads all documents.

        Yields:
            Batches of Document objects.
        """
        if not self.corpus_path or not self.corpus_path.exists():
            raise FileNotFoundError(f"Corpus file not found at {self.corpus_path}")

        batch = []
        count = 0

        with open(self.corpus_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                if limit is not None and count >= limit:
                    break

                # Create a unique ID using row index
                doc_id = f"msg_{count:06d}"
                
                # Use message column as the main text content
                message_text = row.get("message", "")
                
                # Create Document object with CSV data (only 4 columns: time, location, account, message)
                document = Document(
                    time=row.get("time"),
                    location=row.get("location"),
                    account=row.get("account"),
                    message=row.get("message"),
                )

                batch.append(document)
                count += 1

                if batch_size and len(batch) >= batch_size:
                    yield batch
                    batch = []

            if batch:  # Yield remaining items
                yield batch

    def load_in_batches(self, batch_size: int = 32) -> Generator[List[Document], None, None]:
        """
        Load documents in batches. This is a wrapper around load_messages_from_csv.
        
        Args:
            batch_size: Number of documents to yield in each batch.
            
        Yields:
            Batches of Document objects.
        """
        yield from self.load_messages_from_csv(batch_size=batch_size)
