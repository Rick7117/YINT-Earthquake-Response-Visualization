<div align="center">

ZH | [EN](./README.md)

<h1>基于社区的社交媒体平台 YINT的城市分析可视化系统</h1>

</div>

## 📋 项目概述

本项目旨在通过可视化分析圣希马克市地震后YINT社交媒体平台上的数据，帮助市政府有效分配紧急救援资源。系统能够识别不同社区的需求变化，并为资源调配提供数据支持。

## ✨ 主要功能

1. **城市整体状况可视化**：展示地震后5小时和30小时内的城市受损情况和资源需求热图
2. **动态资源分配建议**：基于时间变化识别至少三个关键转折点，调整资源优先级
3. **社区挑战分析**：识别除基础设施外影响市民生活的其他问题
4. **实时数据分析**：支持流数据模式，适应快速响应与决策的环境

## 🛠️ 技术栈

- **前端**：D3.js, ECharts, Leaflet
- **后端**：Python, FastAPI, Qdrant
- **数据处理**： 词嵌入模型，地理空间分析
- **部署**：Docker, UV

## 📊 数据来源

YINT社交媒体数据，来源于[VAST 2019 | MC3](https://vast-challenge.github.io/2019/MC3.html)包含：
- 用户发布的文本和图片
- 地理位置信息
- 时间戳
- 用户可信度评分


## 🚀 安装与运行

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/YINT-Earthquake-Response-Visualization.git
cd YINT-Earthquake-Response-Visualization
```

### 2. 环境准备
需要提前安装以下依赖：
- Docker installed
- UV
- Python 3.8+ with pip

### 3. 启动 Qdrant 数据库

#### 3.1 启动 Qdrant
```bash
cd db 
chmod +x start-qdrant.sh
./start-qdrant.sh
```

#### 3.2 确认 Qdrant 在运行
```bash
# Check container status
docker ps | grep earthquake-qdrant

# Check logs if needed
docker logs earthquake-qdrant

# Or use the provided Python utility
python db_client.py
```

#### 3.3 访问 Qdrant Dashboard
进入 Qdrant dashboard at http://localhost:6333/dashboard

> ⚠️ **注意**：开发过程中不要关闭docker和数据库连接，否则会导致数据库无法连接。

#### 3.4 关闭数据库（可选）
```bash
./stop-qdrant.sh
# or manually
docker stop bioasq-qdrant
docker rm bioasq-qdrant
```

### 4. 构建向量数据库

#### 4.1 进入目录并安装依赖
```bash
cd indexing_pipeline
uv sync
```

#### 4.2 运行测试
```bash
uv run pytest indexing_pipeline
```

#### 4.3 构建向量数据库
```bash
uv run main.py
```

### 5. 启动数据库查询服务

#### 5.1 进入目录并安装依赖
```bash
cd search
uv sync
```

#### 5.2 启动 FastAPI 开发服务
```bash
uv run fastapi dev main.py
```

#### 5.3 访问查询服务
- 查询服务详见 http://localhost:8000
- 查询服务在前端运行过程中会被调用，请确保服务正常运行

### 6. 启动前端

用 live server 启动前端文件 `index.html`


## 🤝 贡献指南

欢迎提交Pull Request。重大更改请先开Issue讨论。
