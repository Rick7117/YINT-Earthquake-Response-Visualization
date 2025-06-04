from typing import List, Optional

from pydantic import BaseModel


class SearchResult(BaseModel):
    time: str
    location: str
    account: str
    message: str
    label: str
    score: float  # 相似度分数


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_results: int
