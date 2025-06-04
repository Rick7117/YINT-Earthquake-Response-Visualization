from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from src.clients.qdrant_client import QdrantConnectionError
from src.models.models import SearchResponse
from src.use_cases.vector_search import VectorSearchInput, VectorSearchUseCase

# Load environment variables
load_dotenv()

# Initialize vector search use case
vector_search_use_case = VectorSearchUseCase()

router = APIRouter()


@router.get("/search/vector", response_model=SearchResponse)
async def search(
    query: str = Query(..., description="The search query"),
    limit: int = Query(40000, description="Number of results to return"),
):
    """
    Search the PubMed abstracts using semantic search.

    Converts the query to an embedding and searches for similar chunks in the
    Qdrant vector database.
    """
    try:
        # Create input data for the use case
        input_data = VectorSearchInput(query=query, limit=limit)

        # Execute the use case
        results = vector_search_use_case.run(input_data)

        return SearchResponse(results=results, query=query, total_results=len(results))

    except QdrantConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Vector search service is currently unavailable. Please try again later.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")
