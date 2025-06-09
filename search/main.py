from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import router

# Load environment variables
load_dotenv()

app = FastAPI(title="RAG Search API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],  # 允许的前端域名
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

# Include routers
app.include_router(router)
