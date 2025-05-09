# YINT-Earthquake-Response-Visualization-
A visual analytics system for earthquake response resource allocation based on YINT social media data

## Project Overview
This project visualizes and analyzes post-earthquake data from the YINT social media platform in St. Himark City to assist municipal government in effective emergency resource allocation. The system identifies changing community needs and provides data-driven recommendations.

## Key Features
1. City-wide Situation Visualization: Damage assessment and resource demand heatmaps at 5h and 30h post-earthquake
2. Dynamic Resource Allocation: Identifies ≥3 critical inflection points for priority adjustment
3. Community Impact Analysis: Identifies non-infrastructure challenges affecting residents
4. Real-time/Static Data Processing: Supports both analysis modes for different decision scenarios

## Technology Stack
• Frontend: D3.js, ECharts, Leaflet

• Backend: Python (Pandas, Flask)

• Data Processing: NLP sentiment analysis, geospatial analysis

• Deployment: Docker, AWS/GCP


## Data Sources
Simulated YINT social media data including:
• User posts (text & images)

• Geotags

• Timestamps

• User credibility scores


## Installation & Run
```bash
git clone https://github.com/yourusername/YINT-Earthquake-Response-Visualization.git
cd YINT-Earthquake-Response-Visualization
pip install -r requirements.txt
python app.py
```

## Contributing
PRs welcome. For major changes, please open an issue first to discuss.

---
