from src.embedding.sentence_tranformer_embedder import SentenceTransformerEmbedder
from src.indexing.qdrant_indexer import QdrantIndexer
from src.data_loader import DataLoader
from src.pipeline import Pipeline


def main():
    # Configuration
    data_path = "../data/YInt.csv"
    qdrant_host = "localhost"
    qdrant_port = 6333
    collection_name = "earthquake_messages"
    embedding_model = "sentence-transformers/all-MiniLM-L12-v2"
    batch_size = 32

    # Initialize components
    data_loader = DataLoader(data_path)
    embedder = SentenceTransformerEmbedder(model_name=embedding_model, batch_size=batch_size)
    indexer = QdrantIndexer(host=qdrant_host, port=qdrant_port, collection_name=collection_name)

    # Create and run pipeline
    pipeline = Pipeline(
        data_loader=data_loader,
        embedder=embedder,
        indexer=indexer,
    )

    try:
        pipeline.run(batch_size=batch_size)
        print(f"Successfully processed CSV messages and saved to Qdrant collection '{collection_name}'")
    except Exception as e:
        print(f"Error during pipeline execution: {e}")
        raise


if __name__ == "__main__":
    main()
