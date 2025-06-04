import pytest
import csv
import tempfile
from pathlib import Path
from unittest.mock import patch

import sys
sys.path.append(str(Path(__file__).parent.parent.parent))

from src.data_loader import DataLoader
from src.models.document import Document


class TestDataLoader:
    """Test cases for DataLoader class."""

    @pytest.fixture
    def sample_csv_data(self):
        """Create sample CSV data for testing."""
        return [
            {"time": "2024-01-01 10:00:00", "location": "Downtown", "account": "user1", "message": "Emergency at main street"},
            {"time": "2024-01-01 10:05:00", "location": "Uptown", "account": "user2", "message": "All clear in residential area"},
            {"time": "2024-01-01 10:10:00", "location": "Midtown", "account": "user3", "message": "Need medical assistance"},
            {"time": "2024-01-01 10:15:00", "location": "Suburb", "account": "user4", "message": "Road blocked due to debris"},
            {"time": "2024-01-01 10:20:00", "location": "Center", "account": "user5", "message": "Power outage reported"}
        ]

    @pytest.fixture
    def temp_csv_file(self, sample_csv_data):
        """Create a temporary CSV file with sample data."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            fieldnames = ["time", "location", "account", "message"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(sample_csv_data)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)

    @pytest.fixture
    def data_loader(self, temp_csv_file):
        """Create DataLoader instance with temporary CSV file."""
        return DataLoader(corpus_path=temp_csv_file)

    def test_init_with_path(self, temp_csv_file):
        """Test DataLoader initialization with file path."""
        loader = DataLoader(corpus_path=temp_csv_file)
        assert loader.corpus_path == Path(temp_csv_file)

    def test_init_without_path(self):
        """Test DataLoader initialization without file path."""
        loader = DataLoader()
        assert loader.corpus_path is None

    def test_load_messages_basic(self, data_loader, sample_csv_data):
        """Test basic loading of messages from CSV."""
        batches = list(data_loader.load_messages_from_csv())
        
        assert len(batches) == 1  # All data in one batch by default
        documents = batches[0]
        assert len(documents) == len(sample_csv_data)
        
        # Check first document
        doc = documents[0]
        assert isinstance(doc, Document)
        assert doc.time == "2024-01-01 10:00:00"
        assert doc.location == "Downtown"
        assert doc.account == "user1"
        assert doc.message == "Emergency at main street"

    def test_load_messages_with_batch_size(self, data_loader):
        """Test loading messages with specified batch size."""
        batch_size = 2
        batches = list(data_loader.load_messages_from_csv(batch_size=batch_size))
        
        assert len(batches) == 3  # 5 items with batch_size=2 -> 3 batches
        assert len(batches[0]) == 2
        assert len(batches[1]) == 2
        assert len(batches[2]) == 1  # Last batch with remaining item

    def test_load_messages_with_limit(self, data_loader):
        """Test loading messages with limit."""
        limit = 3
        batches = list(data_loader.load_messages_from_csv(limit=limit))
        
        assert len(batches) == 1
        documents = batches[0]
        assert len(documents) == limit

    def test_load_messages_with_batch_size_and_limit(self, data_loader):
        """Test loading messages with both batch size and limit."""
        batch_size = 2
        limit = 3
        batches = list(data_loader.load_messages_from_csv(batch_size=batch_size, limit=limit))
        
        assert len(batches) == 2  # 3 items with batch_size=2 -> 2 batches
        assert len(batches[0]) == 2
        assert len(batches[1]) == 1

    def test_load_messages_empty_csv(self):
        """Test loading from empty CSV file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            # Write only header
            writer = csv.DictWriter(f, fieldnames=["time", "location", "account", "message"])
            writer.writeheader()
            temp_path = f.name
        
        try:
            loader = DataLoader(corpus_path=temp_path)
            batches = list(loader.load_messages_from_csv())
            assert len(batches) == 0
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_messages_missing_columns(self):
        """Test loading from CSV with missing columns."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            # Write CSV with missing columns
            writer = csv.DictWriter(f, fieldnames=["time", "account"])
            writer.writeheader()
            writer.writerow({"time": "2024-01-01 10:00:00", "account": "user1"})
            temp_path = f.name
        
        try:
            loader = DataLoader(corpus_path=temp_path)
            batches = list(loader.load_messages_from_csv())
            documents = batches[0]
            doc = documents[0]
            
            # Missing columns should be None
            assert doc.location is None
            assert doc.message is None
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_messages_file_not_found(self):
        """Test loading from non-existent file."""
        loader = DataLoader(corpus_path="/non/existent/file.csv")
        
        with pytest.raises(FileNotFoundError, match="Corpus file not found"):
            list(loader.load_messages_from_csv())

    def test_load_messages_no_corpus_path(self):
        """Test loading when no corpus path is set."""
        loader = DataLoader()
        
        with pytest.raises(FileNotFoundError, match="Corpus file not found"):
            list(loader.load_messages_from_csv())

    def test_document_properties(self, data_loader):
        """Test Document field access."""
        batches = list(data_loader.load_messages_from_csv(limit=1))
        doc = batches[0][0]
        
        # Test all document fields are accessible
        assert isinstance(doc.time, str)
        assert isinstance(doc.location, str)
        assert isinstance(doc.account, str)
        assert isinstance(doc.message, str)
        
        # Test fields are not empty
        assert doc.time
        assert doc.location
        assert doc.account
        assert doc.message

    def test_document_uniqueness(self, data_loader):
        """Test that different documents have different content."""
        batches = list(data_loader.load_messages_from_csv())
        documents = batches[0]
        
        # Create tuples of all fields to check uniqueness
        doc_tuples = [(doc.time, doc.location, doc.account, doc.message) for doc in documents]
        assert len(set(doc_tuples)) == len(doc_tuples)  # All documents should be unique

    @pytest.mark.parametrize("batch_size,expected_batches", [
        (1, 5),
        (2, 3),
        (3, 2),
        (5, 1),
        (10, 1),
    ])
    def test_batch_size_variations(self, data_loader, batch_size, expected_batches):
        """Test various batch sizes."""
        batches = list(data_loader.load_messages_from_csv(batch_size=batch_size))
        assert len(batches) == expected_batches

    def test_unicode_handling(self):
        """Test handling of Unicode characters in CSV."""
        unicode_data = [
            {"time": "2024-01-01 10:00:00", "location": "市中心", "account": "用户1", "message": "紧急情况！需要帮助 🚨"}
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            fieldnames = ["time", "location", "account", "message"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(unicode_data)
            temp_path = f.name
        
        try:
            loader = DataLoader(corpus_path=temp_path)
            batches = list(loader.load_messages_from_csv())
            doc = batches[0][0]
            
            assert doc.location == "市中心"
            assert doc.account == "用户1"
            assert "🚨" in doc.message
        finally:
            Path(temp_path).unlink(missing_ok=True)