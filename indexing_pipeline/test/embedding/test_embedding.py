import pytest
import numpy as np
from unittest.mock import Mock, patch
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.embedding.sentence_tranformer_embedder import SentenceTransformerEmbedder
from src.models.document import Document, EmbeddedDocument


class TestSentenceTransformerEmbedder:
    """Test cases for SentenceTransformerEmbedder class."""

    @pytest.fixture
    def sample_documents(self):
        """Create sample documents for testing."""
        return [
            Document(
                time="2024-01-01 10:00:00",
                location="Downtown",
                account="user1",
                message="Emergency at main street"
            ),
            Document(
                time="2024-01-01 10:05:00",
                location="Uptown",
                account="user2",
                message="Fire reported near the park"
            ),
            Document(
                time="2024-01-01 10:10:00",
                location="Center",
                account="user3",
                message="Medical assistance needed"
            )
        ]

    @pytest.fixture
    def mock_sentence_transformer(self):
        """Mock SentenceTransformer to avoid downloading models during tests."""
        with patch('src.embedding.sentence_tranformer_embedder.SentenceTransformer') as mock:
            # Mock the encode method to return dummy embeddings
            mock_instance = Mock()
            mock_instance.encode.return_value = np.array([
                [0.1, 0.2, 0.3, 0.4],  # 4-dimensional embedding for first doc
                [0.5, 0.6, 0.7, 0.8],  # 4-dimensional embedding for second doc
                [0.9, 1.0, 1.1, 1.2]   # 4-dimensional embedding for third doc
            ])
            mock.return_value = mock_instance
            yield mock_instance

    def test_embedder_initialization_default(self, mock_sentence_transformer):
        """Test embedder initialization with default parameters."""
        embedder = SentenceTransformerEmbedder()
        
        assert embedder.model_name == "sentence-transformers/all-MiniLM-L12-v2"
        assert embedder.batch_size == 32
        assert embedder.model is not None

    def test_embedder_initialization_custom(self, mock_sentence_transformer):
        """Test embedder initialization with custom parameters."""
        custom_model = "custom-model"
        custom_batch_size = 16
        
        embedder = SentenceTransformerEmbedder(
            model_name=custom_model,
            batch_size=custom_batch_size
        )
        
        assert embedder.model_name == custom_model
        assert embedder.batch_size == custom_batch_size

    def test_embed_batch_basic(self, mock_sentence_transformer, sample_documents):
        """Test basic embedding functionality."""
        embedder = SentenceTransformerEmbedder()
        embedded_docs = embedder.embed_batch(sample_documents)
        
        # Check return type and length
        assert isinstance(embedded_docs, list)
        assert len(embedded_docs) == len(sample_documents)
        
        # Check each embedded document
        for i, embedded_doc in enumerate(embedded_docs):
            assert isinstance(embedded_doc, EmbeddedDocument)
            assert embedded_doc.document == sample_documents[i]
            assert isinstance(embedded_doc.embedding, np.ndarray)
            assert embedded_doc.embedding_model == embedder.model_name
            assert embedded_doc.embedding.shape == (4,)  # 4-dimensional embedding

    def test_embed_batch_calls_model_encode(self, mock_sentence_transformer, sample_documents):
        """Test that embed_batch calls the model's encode method correctly."""
        embedder = SentenceTransformerEmbedder(batch_size=16)
        embedder.embed_batch(sample_documents)
        
        # Verify that encode was called with correct parameters
        expected_texts = [doc.message for doc in sample_documents]
        mock_sentence_transformer.encode.assert_called_once_with(
            expected_texts, 
            batch_size=16
        )

    def test_embed_batch_empty_list(self, mock_sentence_transformer):
        """Test embedding an empty list of documents."""
        embedder = SentenceTransformerEmbedder()
        
        # Mock encode to return empty array for empty input
        mock_sentence_transformer.encode.return_value = np.array([])
        
        embedded_docs = embedder.embed_batch([])
        
        assert isinstance(embedded_docs, list)
        assert len(embedded_docs) == 0

    def test_embed_batch_single_document(self, mock_sentence_transformer):
        """Test embedding a single document."""
        embedder = SentenceTransformerEmbedder()
        
        # Mock encode to return single embedding
        mock_sentence_transformer.encode.return_value = np.array([[0.1, 0.2, 0.3, 0.4]])
        
        single_doc = Document(
            time="2024-01-01 10:00:00",
            location="Downtown",
            account="user1",
            message="Test message"
        )
        
        embedded_docs = embedder.embed_batch([single_doc])
        
        assert len(embedded_docs) == 1
        assert embedded_docs[0].document == single_doc
        assert np.array_equal(embedded_docs[0].embedding, np.array([0.1, 0.2, 0.3, 0.4]))

    def test_embed_batch_preserves_document_order(self, mock_sentence_transformer, sample_documents):
        """Test that the order of documents is preserved in the output."""
        embedder = SentenceTransformerEmbedder()
        embedded_docs = embedder.embed_batch(sample_documents)
        
        for i, embedded_doc in enumerate(embedded_docs):
            assert embedded_doc.document == sample_documents[i]

    def test_embed_batch_different_batch_sizes(self, mock_sentence_transformer, sample_documents):
        """Test embedding with different batch sizes."""
        for batch_size in [1, 2, 5, 10]:
            embedder = SentenceTransformerEmbedder(batch_size=batch_size)
            embedded_docs = embedder.embed_batch(sample_documents)
            
            assert len(embedded_docs) == len(sample_documents)
            
            # Verify encode was called with correct batch_size
            expected_texts = [doc.message for doc in sample_documents]
            mock_sentence_transformer.encode.assert_called_with(
                expected_texts, 
                batch_size=batch_size
            )

    def test_embed_batch_embedding_dimensions(self, mock_sentence_transformer, sample_documents):
        """Test that embeddings have consistent dimensions."""
        embedder = SentenceTransformerEmbedder()
        embedded_docs = embedder.embed_batch(sample_documents)
        
        # All embeddings should have the same shape
        embedding_shapes = [doc.embedding.shape for doc in embedded_docs]
        assert all(shape == embedding_shapes[0] for shape in embedding_shapes)
        assert embedding_shapes[0] == (4,)  # Based on our mock

    def test_embed_batch_uses_message_field(self, mock_sentence_transformer, sample_documents):
        """Test that the embedder uses the message field from documents."""
        embedder = SentenceTransformerEmbedder()
        embedder.embed_batch(sample_documents)
        
        # Extract the texts that were passed to encode
        call_args = mock_sentence_transformer.encode.call_args
        texts_passed = call_args[0][0]  # First positional argument
        
        expected_texts = [doc.message for doc in sample_documents]
        assert texts_passed == expected_texts

    def test_embed_batch_model_name_in_result(self, mock_sentence_transformer, sample_documents):
        """Test that the model name is correctly stored in embedded documents."""
        custom_model_name = "test-model-name"
        embedder = SentenceTransformerEmbedder(model_name=custom_model_name)
        embedded_docs = embedder.embed_batch(sample_documents)
        
        for embedded_doc in embedded_docs:
            assert embedded_doc.embedding_model == custom_model_name

    @pytest.mark.parametrize("num_docs", [1, 5, 10, 50])
    def test_embed_batch_various_document_counts(self, mock_sentence_transformer, num_docs):
        """Test embedding with various numbers of documents."""
        # Create documents dynamically
        documents = [
            Document(
                time=f"2024-01-01 10:{i:02d}:00",
                location=f"Location{i}",
                account=f"user{i}",
                message=f"Message {i}"
            )
            for i in range(num_docs)
        ]
        
        # Mock encode to return appropriate number of embeddings
        mock_sentence_transformer.encode.return_value = np.random.rand(num_docs, 4)
        
        embedder = SentenceTransformerEmbedder()
        embedded_docs = embedder.embed_batch(documents)
        
        assert len(embedded_docs) == num_docs
        for i, embedded_doc in enumerate(embedded_docs):
            assert embedded_doc.document == documents[i]