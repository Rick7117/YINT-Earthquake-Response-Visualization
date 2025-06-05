// circlepacking.js (updated to support category filtering)
// 圆形打包图类
class CirclePackingChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800;
        this.height = 800;
        this.svg = null;
        this.tooltip = null;
        this.colorScale = null;
        this.data = [];
        this.hierarchy = null;

        // 在构造函数中创建 tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'circlepacking-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', '1000');

        console.log('CirclePackingChart initialized with container:', containerId);
    }

    // ---------------------------------------------------------------------
    //  数据加载与预处理
    // ---------------------------------------------------------------------

    // 从 CSV 文件读取数据
    async fetchDataFromQdrant() {
        console.log('Fetching data from CSV...');
        try {
            const data = await d3.csv('data/YInt_w_label.csv');
            console.log(`Loaded ${data.length} records from CSV`);
            return data;
        } catch (error) {
            console.error('Error loading CSV data:', error);
            return [];
        }
    }

    // 按时间区间过滤
    applyTimeFilters(data) {
        if (!window.filterManager) return data;

        const { startTime, endTime } = window.filterManager.getTimeFilter();
        if (!startTime && !endTime) return data;

        return data.filter(item => {
            const itemTime = new Date(item.time);
            if (startTime && itemTime < new Date(startTime)) return false;
            if (endTime && itemTime > new Date(endTime))   return false;
            return true;
        });
    }

    // ---------------------------------------------------------------------
    //  核心：根据 selectedFilters 构建层级结构
    // ---------------------------------------------------------------------
    async processData(rawData, selectedFilters = null) {
        console.log('Processing data (category filtering enabled)...');

        // 1) 读取主/子类别映射
        const categoriesResp = await fetch('data/categories.json');
        const categoriesJson = await categoriesResp.json();

        // 建立子 → 主 映射（小写方便比较）
        const subToMainMap = {};
        Object.entries(categoriesJson).forEach(([main, subs]) => {
            subs.forEach(sub => {
                subToMainMap[sub.toLowerCase()] = main;
            });
        });

        // 2) 判断是否真的选了某些类别
        let anySelection = false;
        if (selectedFilters) {
            anySelection = Object.values(selectedFilters).some(arr => arr && arr.length > 0);
        }

        // 3) 统计计数
        const categoryCounts = {};
        rawData.forEach(item => {
            if (!item || !item.label) return; // skip invalid
            const subRaw = item.label;
            const sub = subRaw.toLowerCase();
            const main = subToMainMap[sub] || '未分类';

            // ------------------  过滤逻辑  ------------------
            if (anySelection) {
                const selectedInMain = (selectedFilters[main] || [])
                    .map(s => s.toLowerCase());

                // 情况 A: 该主类有具体子类被选中 → 仅保留那些子类
                if (selectedInMain.length > 0) {
                    if (!selectedInMain.includes(sub)) return; // skip 不在选中列表
                } else {
                    // 情况 B: 该主类没有任何子类被选中 → 完全排除该主类
                    return;
                }
            }
            // -------------------------------------------------

            if (!categoryCounts[main]) {
                categoryCounts[main] = { count: 0, subcategories: {} };
            }
            categoryCounts[main].count += 1;
            categoryCounts[main].subcategories[subRaw] = (categoryCounts[main].subcategories[subRaw] || 0) + 1;
        });

        // 4) 生成 D3 hierarchy 所需的树形对象
        const root = { name: 'root', children: [] };
        Object.entries(categoryCounts).forEach(([main, data]) => {
            const mainNode = { name: main, value: data.count, children: [] };
            Object.entries(data.subcategories).forEach(([sub, cnt]) => {
                mainNode.children.push({ name: sub, value: cnt });
            });
            if (mainNode.children.length > 0) root.children.push(mainNode);
        });

        // 5) 若无数据直接返回 null
        if (root.children.length === 0) {
            console.warn('No data after category filtering.');
            return null;
        }

        // 6) 构建 hierarchy
        const hierarchy = d3.hierarchy(root)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        return hierarchy;
    }

    // ---------------------------------------------------------------------
    //  初始化 SVG
    // ---------------------------------------------------------------------
    initSVG() {
        const container = d3.select(`#${this.containerId}`);
        if (container.empty()) {
            console.error(`Container #${this.containerId} not found!`);
            return;
        }
        container
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('align-items', 'center')
            .style('overflow', 'hidden');

        const { width, height } = container.node().getBoundingClientRect();
        this.width  = width  - this.margin.left - this.margin.right;
        this.height = height - this.margin.top  - this.margin.bottom;

        container.selectAll('*').remove();
        this.svg = container.append('svg')
            .attr('width',  this.width  + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top  + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    // ---------------------------------------------------------------------
    //  渲染
    // ---------------------------------------------------------------------
    async render() {
        if (!this.hierarchy) {
            console.warn('No hierarchy to render.');
            return;
        }

        // 创建打包布局
        const pack = d3.pack()
            .size([this.width - 20, this.height - 20])
            .padding(3);
        const root = pack(this.hierarchy);

        // 颜色比例尺（基于当前展示的主分类）
        const mainCats = this.hierarchy.children.map(d => d.data.name);
        this.colorScale = d3.scaleOrdinal()
            .domain(mainCats)
            .range(d3.schemeCategory10);

        // 清除旧图层
        this.svg.selectAll('*').remove();
        const self = this;

        // 节点组
        const node = this.svg.selectAll('g')
            .data(root.descendants())
            .enter().append('g')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .on('mouseover', function (event, d) {
                if (!d.data || d.depth === 0) return;
                self.tooltip
                    .style('opacity', 0.9)
                    .html(`类别: ${d.data.name}<br/>数量: ${d.value ?? 0}`)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top',  `${event.pageY - 28}px`);
            })
            .on('mouseout', () => self.tooltip.style('opacity', 0));

        // 圆形
        node.append('circle')
            .attr('r', d => d.r)
            .style('fill', d => {
                if (!d.parent) return '#ccc';
                return d.depth === 1
                    ? self.colorScale(d.data.name)
                    : d3.color(self.colorScale(d.parent.data.name)).brighter(0.5);
            })
            .style('stroke', '#fff')
            .style('stroke-width', 2);

        // 子类别文本 (depth===2)
        node.filter(d => d.depth === 2)
            .append('text')
            .attr('dy', '0.35em')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text(d => d.data.name)
            .each(function(d) {
                const txt = d3.select(this);
                let fontSize = Math.min(d.r * 0.4, 10);
                while (fontSize >= 4) {
                    txt.style('font-size', `${fontSize}px`);
                    if (this.getComputedTextLength() <= d.r * 1.8) break;
                    fontSize -= 1;
                }
                if (fontSize < 4) txt.text('');
            });
    }

    // ---------------------------------------------------------------------
    //  对外 API
    // ---------------------------------------------------------------------
    async generateFromData(selectedFilters = null) {
        const raw = await this.fetchDataFromQdrant();
        const timeFiltered = this.applyTimeFilters(raw);
        this.hierarchy = await this.processData(timeFiltered, selectedFilters);
        if (!this.hierarchy) return; // no data
        this.initSVG();
        await this.render();
    }

    async update(selectedFilters) {
        console.log('CirclePacking – update with filters:', selectedFilters);
        await this.generateFromData(selectedFilters);
    }
}

// -------------------------------------------------------------------------
// 外部接口 & 全局实例
// -------------------------------------------------------------------------
let circlePackingInstance = null;

async function initCirclePacking() {
    circlePackingInstance = new CirclePackingChart('circlepacking-chart');
    await circlePackingInstance.generateFromData();
}

async function updateCirclePackingWithFilteredData(selectedFilters) {
    if (!circlePackingInstance) await initCirclePacking();
    await circlePackingInstance.update(selectedFilters);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initCirclePacking();
});
