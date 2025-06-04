# /// script
# dependencies = [
#   "qdrant-client"
# ]
# ///

"""
Qdrant client utility for the BioASQ RAG system.
Provides a simple interface for connecting to the Qdrant vector database.
"""

from typing import Optional

from qdrant_client import QdrantClient


def get_qdrant_client(url: str = "http://localhost:6333") -> QdrantClient:
    """
    Create and return a Qdrant client connected to the specified URL.

    Args:
        url: URL of the Qdrant server, defaults to local instance

    Returns:
        QdrantClient: Configured Qdrant client
    """
    return QdrantClient(url=url)


def check_connection(client: Optional[QdrantClient] = None) -> bool:
    """
    Check if the connection to Qdrant is working.

    Args:
        client: Optional Qdrant client, will create one if not provided

    Returns:
        bool: True if connection is successful
    """
    if client is None:
        client = get_qdrant_client()

    try:
        client.get_collections()
        return True
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        return False


if __name__ == "__main__":
    # Simple test to check if Qdrant is running
    client = get_qdrant_client()
    if check_connection(client):
        print("✅ Successfully connected to Qdrant")
        collections = client.get_collections()
        print(f"Available collections: {collections.collections}")
    else:
        print("❌ Failed to connect to Qdrant")
