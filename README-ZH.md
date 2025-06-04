<div align="center">

ZH | [EN](./README.md)

<h1>基于社区的社交媒体平台 YINT的城市分析可视化系统</h1>
  
[![Generic badge](https://img.shields.io/badge/🤗-Huggingface%20Repo-green.svg)](https://huggingface.co/Go4miii/DISC-FinLLM)
[![license](https://img.shields.io/github/license/modelscope/modelscope.svg)](./LICENSE)

[Demo](https://fin.fudan-disc.com) | [技术报告](http://arxiv.org/abs/2310.15205)

</div>

## 项目概述
本项目旨在通过可视化分析圣希马克市地震后YINT社交媒体平台上的数据，帮助市政府有效分配紧急救援资源。系统能够识别不同社区的需求变化，并为资源调配提供数据支持。

## 主要功能
1. 城市整体状况可视化：展示地震后5小时和30小时内的城市受损情况和资源需求热图
2. 动态资源分配建议：基于时间变化识别至少三个关键转折点，调整资源优先级
3. 社区挑战分析：识别除基础设施外影响市民生活的其他问题
4. 实时/静态数据分析：支持两种数据处理模式，适应不同决策场景

## 技术栈
• 前端：D3.js, ECharts, Leaflet

• 后端：Python, FastAPI, Qdrant

• 数据处理：NLP情感分析，地理空间分析

• 部署：Docker,UV


## 数据来源
模拟的YINT社交媒体数据，包含：
• 用户发布的文本和图片

• 地理位置信息

• 时间戳

• 用户可信度评分


## 安装与运行
1. 克隆项目
```bash
git clone https://github.com/yourusername/YINT-Earthquake-Response-Visualization.git
cd YINT-Earthquake-Response-Visualization
```

2. 需要提前安装以下依赖：
    - Docker installed
    - UV
    - Python 3.8+ with pip
3. 构建镜像
    1. 启动qdrant

    ```
    cd db 
    chmod +x start-qdrant.sh
    ./start-qdrant.sh
    ```
    2. 确认Qdrant在运行
    ```
    # Check container status
    docker ps | grep bioasq-qdrant

    # Check logs if needed
    docker logs bioasq-qdrant

    # Or use the provided Python utility
    python db_client.py
    ```
    3. 进入 Qdrant dashboard at http://localhost:6333/dashboard

4. 构建向量数据库
    1. 进入目录
    ```
    cd indexing_pipeline
    ```
    2. 安装依赖
    ```
    uv sync
    ```
    3. 运行测试代码
    ```
    uv run pytest indexing_pipeline
    ```
    4. 构建向量数据库
    ```
    uv run main.py
    ```
5. 启动数据库查询服务
    1. 进入目录
    ```
    cd search
    ```
    2. 安装依赖
    ```
    uv sync
    ```
    3. 启动Fast API 开发服务
    ```
    uv run fastapi dev main.py
    ```
    4. 查询服务详见 http://localhost:8000.
6. 启动前端
    
    用live server启动前端文件``index.html``






## 贡献指南
欢迎提交Pull Request。重大更改请先开Issue讨论。
