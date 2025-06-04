import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from qdrant_client.models import Distance, VectorParams, PointStruct

from src.indexing.qdrant_indexer import QdrantIndexer
from src.models.document import Document, EmbeddedDocument


class TestQdrantIndexer:
    """Test cases for QdrantIndexer class."""

    @pytest.fixture
    def mock_qdrant_client(self):
        """Create a mock QdrantClient for testing."""
        with patch('src.indexing.qdrant_indexer.QdrantClient') as mock_client:
            mock_instance = Mock()
            mock_client.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def sample_documents(self):
        """Create sample documents for testing."""
        docs = [
            Document(
                time="2024-01-01 10:00:00",
                location="Downtown",
                account="user1",
                message="Emergency situation reported"
            ),
            Document(
                time="2024-01-01 10:05:00",
                location="Uptown",
                account="user2",
                message="All clear in this area"
            )
        ]
        return docs

    @pytest.fixture
    def sample_embedded_documents(self, sample_documents):
        """Create sample embedded documents for testing."""
        embedded_docs = []
        for doc in sample_documents:
            embedding = np.random.rand(384)  # 384-dimensional embedding
            embedded_doc = EmbeddedDocument(
                document=doc,
                embedding=embedding,
                embedding_model="sentence-transformers/all-MiniLM-L6-v2"
            )
            embedded_docs.append(embedded_doc)
        return embedded_docs

    def test_init_creates_client_and_collection(self, mock_qdrant_client):
        """Test that QdrantIndexer initializes client and collection properly."""
        # Test with default parameters
        indexer = QdrantIndexer()
        
        # Verify client was created with default parameters
        assert indexer.client == mock_qdrant_client
        assert indexer.collection_name == "documents"
        
        # Verify collection initialization was attempted
        mock_qdrant_client.get_collection.assert_called_once_with(collection_name="documents")

    def test_init_with_custom_parameters(self, mock_qdrant_client):
        """Test QdrantIndexer initialization with custom parameters."""
        host = "custom-host"
        port = 9999
        collection_name = "custom_collection"
        
        indexer = QdrantIndexer(host=host, port=port, collection_name=collection_name)
        
        assert indexer.collection_name == collection_name
        mock_qdrant_client.get_collection.assert_called_once_with(collection_name=collection_name)

    def test_initialize_collection_creates_new_collection(self, mock_qdrant_client):
        """Test that a new collection is created when it doesn't exist."""
        # Mock get_collection to raise an exception (collection doesn't exist)
        mock_qdrant_client.get_collection.side_effect = Exception("Collection not found")
        
        indexer = QdrantIndexer()
        
        # Verify create_collection was called
        mock_qdrant_client.create_collection.assert_called_once_with(
            collection_name="documents",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )

    def test_initialize_collection_uses_existing_collection(self, mock_qdrant_client):
        """Test that existing collection is used when available."""
        # Mock get_collection to succeed (collection exists)
        mock_qdrant_client.get_collection.return_value = Mock()
        
        indexer = QdrantIndexer()
        
        # Verify create_collection was NOT called
        mock_qdrant_client.create_collection.assert_not_called()

    def test_index_batch_with_documents(self, mock_qdrant_client, sample_embedded_documents):
        """Test indexing a batch of embedded documents."""
        indexer = QdrantIndexer()
        
        # Call index_batch
        indexer.index_batch(sample_embedded_documents)
        
        # Verify upsert was called
        mock_qdrant_client.upsert.assert_called_once()
        
        # Get the call arguments
        call_args = mock_qdrant_client.upsert.call_args
        assert call_args[1]['collection_name'] == "documents"
        
        # Verify points structure
        points = call_args[1]['points']
        assert len(points) == 2
        
        # Check first point
        point1 = points[0]
        assert isinstance(point1, PointStruct)
        assert isinstance(point1.id, int)  # Hash-generated ID
        assert len(point1.vector) == 384  # Embedding dimension
        
        # Check payload structure
        payload1 = point1.payload
        expected_keys = {"time", "location", "account", "message", "embedding_model"}
        assert set(payload1.keys()) == expected_keys
        assert payload1["time"] == "2024-01-01 10:00:00"
        assert payload1["location"] == "Downtown"
        assert payload1["account"] == "user1"
        assert payload1["message"] == "Emergency situation reported"
        assert payload1["embedding_model"] == "sentence-transformers/all-MiniLM-L6-v2"

    def test_index_batch_with_empty_list(self, mock_qdrant_client):
        """Test indexing with an empty list of documents."""
        indexer = QdrantIndexer()
        
        # Call index_batch with empty list
        indexer.index_batch([])
        
        # Verify upsert was NOT called
        mock_qdrant_client.upsert.assert_not_called()

    def test_index_batch_generates_unique_ids(self, mock_qdrant_client, sample_embedded_documents):
        """Test that unique IDs are generated for different documents."""
        indexer = QdrantIndexer()
        
        # Call index_batch
        indexer.index_batch(sample_embedded_documents)
        
        # Get the points
        call_args = mock_qdrant_client.upsert.call_args
        points = call_args[1]['points']
        
        # Verify IDs are different
        id1 = points[0].id
        id2 = points[1].id
        assert id1 != id2
        
        # Verify IDs are deterministic (same content should generate same ID)
        doc1 = sample_embedded_documents[0].document
        expected_id1 = hash(f"{doc1.time}_{doc1.location}_{doc1.account}_{doc1.message}")
        assert id1 == expected_id1

    def test_index_batch_handles_qdrant_errors(self, mock_qdrant_client, sample_embedded_documents):
        """Test that QdrantIndexer handles Qdrant client errors properly."""
        indexer = QdrantIndexer()
        
        # Mock upsert to raise an exception
        mock_qdrant_client.upsert.side_effect = Exception("Qdrant connection error")
        
        # Verify that the exception is propagated
        with pytest.raises(Exception, match="Qdrant connection error"):
            indexer.index_batch(sample_embedded_documents)

    def test_embedding_vector_conversion(self, mock_qdrant_client, sample_embedded_documents):
        """Test that numpy arrays are properly converted to lists for Qdrant."""
        indexer = QdrantIndexer()
        
        # Call index_batch
        indexer.index_batch(sample_embedded_documents)
        
        # Get the points
        call_args = mock_qdrant_client.upsert.call_args
        points = call_args[1]['points']
        
        # Verify vectors are lists, not numpy arrays
        for point in points:
            assert isinstance(point.vector, list)
            assert len(point.vector) == 384
            # Verify all elements are float/int (JSON serializable)
            for val in point.vector:
                assert isinstance(val, (int, float))

    def test_index_batch_with_different_embedding_models(self, mock_qdrant_client, sample_documents):
        """Test indexing documents with different embedding models."""
        # Create embedded documents with different models
        embedded_docs = [
            EmbeddedDocument(
                document=sample_documents[0],
                embedding=np.random.rand(384),
                embedding_model="model1"
            ),
            EmbeddedDocument(
                document=sample_documents[1],
                embedding=np.random.rand(384),
                embedding_model="model2"
            )
        ]
        
        indexer = QdrantIndexer()
        indexer.index_batch(embedded_docs)
        
        # Verify different embedding models are preserved in payload
        call_args = mock_qdrant_client.upsert.call_args
        points = call_args[1]['points']
        
        assert points[0].payload["embedding_model"] == "model1"
        assert points[1].payload["embedding_model"] == "model2"