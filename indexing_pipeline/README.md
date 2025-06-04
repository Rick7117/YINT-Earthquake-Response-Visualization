# Earthquake Response Message Vectorization

This project provides a complete pipeline for vectorizing earthquake response messages from CSV data and storing them in a Qdrant vector database for semantic search and retrieval.

## Features

- **CSV Data Processing**: Load and process earthquake response messages from CSV files
- **Vector Embeddings**: Generate high-quality embeddings using Sentence Transformers
- **Vector Storage**: Store embeddings in Qdrant vector database with metadata
- **Batch Processing**: Efficient batch processing for large datasets
- **Configurable Pipeline**: Flexible configuration for different use cases

## Requirements

- Python 3.8+
- Docker (for Qdrant)
- Required Python packages (see requirements.txt)

## Installation

1. **Clone the repository**:
   ```bash
   cd /Users/rick/YINT-Earthquake-Response-Visualization/indexing_pipeline
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Qdrant server**:
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

## Qdrant Setup

Qdrant is a vector database that stores and indexes the embeddings. Make sure Docker is installed and running, then start Qdrant:

```bash
# Pull and run Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Qdrant will be available at:
- HTTP API: http://localhost:6333
- gRPC API: http://localhost:6334
- Web UI: http://localhost:6333/dashboard

## Data Format

The CSV file should contain a "message" column with the text content to be vectorized. Example:

```csv
id,message,location,time,account
1,"Emergency shelter needed at downtown area","Downtown","2024-01-15 10:30","@emergency_response"
2,"Medical supplies running low","Hospital District","2024-01-15 11:45","@medical_team"
```

## Usage

### Method 1: Run the helper script

```bash
python run_vectorization.py
```

### Method 2: Run directly

```bash
python main.py
```

### Method 3: Custom configuration

Modify the configuration in `main.py`:

```python
# Configuration
data_path = "/path/to/your/data.csv"
qdrant_host = "localhost"
qdrant_port = 6333
collection_name = "your_collection_name"
embedding_model = "sentence-transformers/all-MiniLM-L12-v2"
batch_size = 32
```

## Configuration

### Key Parameters

- **data_path**: Path to your CSV file
- **collection_name**: Name for the Qdrant collection
- **embedding_model**: Sentence Transformer model to use
- **batch_size**: Number of documents to process at once
- **qdrant_host/port**: Qdrant server connection details

### Supported Embedding Models

- `sentence-transformers/all-MiniLM-L12-v2` (default, good balance)
- `sentence-transformers/all-mpnet-base-v2` (higher quality)
- `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (multilingual)

## 输出结果

向量化完成后，数据将存储在 Qdrant 数据库的 `earthquake-messages-embeddings` 集合中。每个向量点包含：

- **向量**: 384维的文本嵌入向量
- **元数据**:
  - `chunk_id`: 文本块ID
  - `text`: 原始消息文本
  - `document_id`: 文档ID
  - `title`: 消息标题
  - `publication_date`: 发布时间
  - `authors`: 发送者
  - `location`: 位置信息
  - `account`: 账户信息
  - `time`: 时间戳
  - `embedding_model`: 使用的嵌入模型

## 查询示例

向量化完成后，可以使用 Qdrant 客户端进行语义搜索：

```python
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# 连接到 Qdrant
client = QdrantClient(host="localhost", port=6333)

# 加载同样的嵌入模型
model = SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")

# 搜索相似消息
query = "地震救援"
query_vector = model.encode([query])[0]

results = client.search(
    collection_name="earthquake-messages-embeddings",
    query_vector=query_vector,
    limit=10
)

for result in results:
    print(f"相似度: {result.score:.3f}")
    print(f"消息: {result.payload['text']}")
    print(f"位置: {result.payload['location']}")
    print(f"时间: {result.payload['time']}")
    print("-" * 50)
```

## 故障排除

1. **连接错误**: 确保 Qdrant 服务器正在运行并监听正确的端口
2. **内存不足**: 减少 `BATCH_SIZE` 参数
3. **文件未找到**: 检查 CSV 文件路径是否正确
4. **依赖错误**: 确保所有依赖都已正确安装

## 项目结构

```
indexing_pipeline/
├── main.py                    # 主程序入口
├── run_vectorization.py       # 便捷运行脚本
├── requirements.txt           # 依赖列表
├── README.md                 # 说明文档
└── src/
    ├── data_loader.py        # 数据加载器
    ├── chunker/              # 文本分块
    │   ├── chunker.py
    │   └── simple_chunker.py
    ├── embedding/            # 文本嵌入
    │   ├── embedder.py
    │   └── sentence_tranformer_embedder.py
    ├── indexing/             # 向量索引
    │   ├── indexer.py
    │   └── qdrant_indexer.py
    ├── models/               # 数据模型
    │   └── document.py
    └── pipeline.py           # 处理管道
```