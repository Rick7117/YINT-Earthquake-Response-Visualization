## 项目概述
本项目旨在通过可视化分析圣希马克市地震后YINT社交媒体平台上的数据，帮助市政府有效分配紧急救援资源。系统能够识别不同社区的需求变化，并为资源调配提供数据支持。

## 主要功能
1. 城市整体状况可视化：展示地震后5小时和30小时内的城市受损情况和资源需求热图
2. 动态资源分配建议：基于时间变化识别至少三个关键转折点，调整资源优先级
3. 社区挑战分析：识别除基础设施外影响市民生活的其他问题
4. 实时/静态数据分析：支持两种数据处理模式，适应不同决策场景

## 技术栈
• 前端：D3.js, ECharts, Leaflet

• 后端：Python (Pandas, Flask)

• 数据处理：NLP情感分析，地理空间分析

• 部署：Docker, AWS/GCP


## 数据来源
模拟的YINT社交媒体数据，包含：
• 用户发布的文本和图片

• 地理位置信息

• 时间戳

• 用户可信度评分


## 安装与运行
```bash
git clone https://github.com/yourusername/YINT-Earthquake-Response-Visualization.git
cd YINT-Earthquake-Response-Visualization
pip install -r requirements.txt
python app.py
```

## 贡献指南
欢迎提交Pull Request。重大更改请先开Issue讨论。
