from dataclasses import dataclass
from typing import List, Optional
import numpy as np


@dataclass
class Document:
    """Represents a document with CSV data (time, location, account, message)."""
    time: str
    location: str
    account: str
    message: str

@dataclass
class EmbeddedDocument:
    """Represents a document with its embedding."""
    document: Document
    embedding: np.ndarray
    embedding_model: str