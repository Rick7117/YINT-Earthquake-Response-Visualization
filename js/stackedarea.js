// 堆叠面积图类
class StackedAreaChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.margin = { top: 20, right: 60, bottom: 80, left: 60 };
        this.width = 1400 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        this.svg = null;
        this.tooltip = null;
        this.colorScale = null;
        this.data = [];
        this.processedData = [];
        this.categories = [];
        this.regionName = null; // 新增属性：地区名称
    }

    // 从Qdrant向量数据库获取数据的函数
    async fetchDataFromQdrant(selectedFilters = null) {
        try {
            let allResults = [];
            
            // 如果有筛选条件，使用向量相似度搜索
            if (selectedFilters && Object.keys(selectedFilters).length > 0) {
                // 检查是否有向量搜索筛选器
                if (selectedFilters.vector_search && selectedFilters.vector_search.length > 0) {
                    // 向量搜索模式
                    const searchTerms = selectedFilters.vector_search;
                    
                    for (const term of searchTerms) {
                        try {
                            console.log(`堆叠面积图正在进行向量搜索: "${term}"`);
                            
                            // 调用Python搜索API
                            const searchResponse = await fetch(`http://127.0.0.1:8000/search/vector?query=${encodeURIComponent(term)}&limit=20000`, {
                                method: 'GET'
                            });
                            
                            if (searchResponse.ok) {
                                const searchData = await searchResponse.json();
                                console.log(`向量搜索 "${term}" 找到 ${searchData.results.length} 条结果`);
                                
                                // 将搜索结果转换为统一格式
                                const formattedResults = searchData.results.map(result => ({
                                    payload: {
                                        time: result.time,
                                        location: result.location,
                                        account: result.account,
                                        message: result.message,
                                        label: result.label || result.main_category || 'all data'
                                    }
                                }));
                                allResults.push(...formattedResults);
                            }
                        } catch (searchError) {
                            console.warn(`向量搜索 "${term}" 失败:`, searchError);
                        }
                    }
                } else if (Object.keys(selectedFilters).some(key => selectedFilters[key].length > 0)) {
                    // 常规分类筛选模式
                    // 收集所有选中的词条
                    const selectedTerms = [];
                    for (const [category, terms] of Object.entries(selectedFilters)) {
                        if (terms && terms.length > 0) {
                            selectedTerms.push(...terms);
                        }
                    }
                    
                    if (selectedTerms.length > 0) {
                        console.log('堆叠面积图选中的搜索关键词:', selectedTerms);
                        
                        // 对每个选中的词条进行向量搜索
                        for (const term of selectedTerms) {
                            try {
                                console.log(`堆叠面积图正在搜索关键词: "${term}"`);
                                
                                // 调用Python搜索API
                                const searchResponse = await fetch(`http://127.0.0.1:8000/search/vector?query=${encodeURIComponent(term)}&limit=20000`, {
                                    method: 'GET'
                                });
                                
                                if (searchResponse.ok) {
                                    const searchData = await searchResponse.json();
                                    console.log(`关键词 "${term}" 搜索到 ${searchData.results.length} 条结果`);
                                    
                                    // 将搜索结果转换为统一格式
                                    const formattedResults = searchData.results.map(result => ({
                                        payload: {
                                            time: result.time,
                                            location: result.location,
                                            account: result.account,
                                            message: result.message,
                                            label: result.label || result.main_category || 'all data'
                                        }
                                    }));
                                    allResults.push(...formattedResults);
                                }
                            } catch (searchError) {
                                console.warn(`搜索词条 "${term}" 失败:`, searchError);
                            }
                        }
                    } else {
                        // 有筛选条件但没有选中任何词条，返回空数组
                        return [];
                    }
                }
            } else {
                // 没有筛选条件时，获取所有数据
                const response = await fetch('http://localhost:6333/collections/earthquake_messages/points/scroll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        limit: 10000,
                        with_payload: true,
                        with_vector: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                allResults = data.result.points || [];
            }
            
            // 对结果进行去重处理（基于时间和账户）
            const uniqueResults = new Map();
            
            allResults.forEach(point => {
                const key = `${point.payload.time}_${point.payload.account}`;
                if (!uniqueResults.has(key)) {
                    uniqueResults.set(key, point);
                }
            });
            
            // 将Qdrant数据转换为CSV格式
            const csvData = Array.from(uniqueResults.values()).map(point => ({
                time: point.payload.time,
                location: point.payload.location,
                account: point.payload.account,
                message: point.payload.message,
                label: point.payload.label || point.payload.main_category || 'all data'
            }));
            
            console.log(`堆叠面积图从Qdrant获取到 ${csvData.length} 条去重后的数据`);
            
            // 根据日期筛选器进一步过滤数据
            // 打印数据的时间范围
            const timeRange = csvData.reduce((range, item) => {
                const time = new Date(item.time);
                if (!range.start || time < range.start) range.start = time;
                if (!range.end || time > range.end) range.end = time;
                return range;
            }, { start: null, end: null });

            console.log('数据时间范围:', {
                开始时间: timeRange.start?.toLocaleString(),
                结束时间: timeRange.end?.toLocaleString()
            });
            const filteredData = this.applyTimeFilters(csvData);
            console.log(`经过日期筛选后剩余 ${filteredData.length} 条数据`);
            
            return filteredData;
            
        } catch (error) {
            console.error('Error fetching data from Qdrant:', error);
            // 如果Qdrant连接失败，回退到CSV文件
            console.log('Falling back to CSV file...');
            return d3.csv('data/YInt_result.csv').then(data => {
                const csvData = data.map(d => ({
                    ...d,
                    label: d.label || d.main_category || 'all data'
                }));
                
                // 对CSV数据也应用日期筛选器
                const filteredData = this.applyTimeFilters(csvData);
                console.log(`CSV回退数据经过日期筛选后剩余 ${filteredData.length} 条数据`);
                
                return filteredData;
            });
        }
    }

    // 根据日期筛选器过滤数据
    applyTimeFilters(data) {
        console.log('=== 开始日期筛选过程 ===');
        console.log('原始数据数量:', data.length);
        
        if (!window.filterManager) {
            console.log('filterManager 不存在，返回原始数据');
            return data;
        }
        
        let filteredData = data;
        
        // 获取时间筛选器状态
        const timeFilter = window.filterManager.getTimeFilter();
        console.log('时间筛选器状态:', timeFilter);
        
        if (timeFilter.startTime || timeFilter.endTime) {
            console.log('应用时间筛选...');
            
            filteredData = filteredData.filter(item => {
                const itemTime = new Date(item.time);
                
                // 检查开始时间
                if (timeFilter.startTime) {
                    const startTime = new Date(timeFilter.startTime);
                    if (itemTime < startTime) {
                        console.log(`数据项被开始时间筛选掉: ${item.time} < ${timeFilter.startTime}`);
                        return false;
                    }
                }
                
                // 检查结束时间
                if (timeFilter.endTime) {
                    const endTime = new Date(timeFilter.endTime);
                    if (itemTime > endTime) {
                        console.log(`数据项被结束时间筛选掉: ${item.time} > ${timeFilter.endTime}`);
                        return false;
                    }
                }
                
                return true;
            });
            
            console.log('筛选后数据数量:', filteredData.length);
        } else {
            console.log('没有设置时间筛选条件，返回原始数据');
        }
        
        console.log('=== 日期筛选过程结束 ===');
        return filteredData;
    }

    // 按地区过滤数据
    applyRegionFilter(data, regionName) {
        if (!regionName) {
            // 未选择地区，直接返回原始数据
            return data;
        }
        console.log('按照地区过滤数据:', regionName);
        return data.filter(d => d.location === regionName);
    }

    // 处理数据，按时间和类别聚合
    processData(rawData) {
        // 解析时间格式："2020-04-06 00:00:00"
        const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
        
        // 5分钟聚合函数
        const roundToFiveMinutes = (date) => {
            const minutes = date.getMinutes();
            const roundedMinutes = Math.floor(minutes / 5) * 5;
            const roundedDate = new Date(date);
            roundedDate.setMinutes(roundedMinutes, 0, 0); // 设置秒和毫秒为0
            return roundedDate;
        };
        
        // 格式化时间用于分组
        const formatTime = d3.timeFormat("%Y-%m-%d %H:%M");
        
        // 使用D3 v5的nest函数进行分组
        const nestedData = d3.nest()
            .key(d => {
                const date = parseTime(d.time);
                if (!date) return null;
                const roundedDate = roundToFiveMinutes(date);
                return formatTime(roundedDate);
            })
            .key(d => d.label || 'all data')
            .rollup(v => v.length)
            .entries(rawData);
        
        // 获取所有唯一的时间点和类别
        const allTimes = nestedData
            .filter(d => d.key !== 'null')
            .map(d => d.key)
            .sort();
        
        const allCategories = new Set();
        nestedData.forEach(timeGroup => {
            if (timeGroup.key !== 'null') {
                timeGroup.values.forEach(categoryGroup => {
                    allCategories.add(categoryGroup.key);
                });
            }
        });
        
        this.categories = Array.from(allCategories);
        
        // 创建完整的数据结构
        const processedData = allTimes.map(timeStr => {
            const timeData = { date: d3.timeParse("%Y-%m-%d %H:%M")(timeStr) };
            
            // 为每个类别初始化为0
            this.categories.forEach(category => {
                timeData[category] = 0;
            });
            
            // 填入实际数据
            const timeGroup = nestedData.find(d => d.key === timeStr);
            if (timeGroup) {
                timeGroup.values.forEach(categoryGroup => {
                    timeData[categoryGroup.key] = categoryGroup.value;
                });
            }
            
            return timeData;
        });
        
        this.processedData = processedData;
        console.log('处理后的堆叠面积图数据:', this.processedData);
        console.log('类别:', this.categories);
        
        return processedData;
    }

    // 初始化SVG
    initSVG() {
        const container = d3.select(`#${this.containerId}`);
        
        // 清除现有内容
        container.selectAll('*').remove();
        
        // 创建SVG
        this.svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // 创建工具提示
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'stackedarea-tooltip')
            .style('opacity', 0);
    }

    // 绘制图表
    render() {
        if (!this.processedData.length || !this.categories.length) {
            console.warn('没有数据可绘制');
            return;
        }
        
        // 设置比例尺
        const xScale = d3.scaleTime()
            .domain(d3.extent(this.processedData, d => d.date))
            .range([0, this.width]);
        
        // 创建堆叠数据
        const stack = d3.stack()
            .keys(this.categories)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);
        
        const stackedData = stack(this.processedData);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
            .range([this.height, 0]);
        
        // 颜色比例尺
        this.colorScale = d3.scaleOrdinal()
            .domain(this.categories)
            .range(d3.schemeCategory10);
        
        // 计算柱子宽度
        const barWidth = this.width / this.processedData.length * 0.8; // 80%宽度，留出间隙
        
        // 清除现有元素
        this.svg.selectAll('.bar-group').remove();
        this.svg.selectAll('.axis').remove();
        this.svg.selectAll('.grid').remove();
        
        // 为每个时间点创建一个组
        const barGroups = this.svg.selectAll('.bar-group')
            .data(this.processedData)
            .enter().append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(${xScale(d.date) - barWidth/2}, 0)`);
        
        // 在每个组中绘制堆叠的矩形
        stackedData.forEach((categoryData, categoryIndex) => {
            barGroups.selectAll(`.bar-${categoryIndex}`)
                .data((d, i) => {
                    // 从堆叠数据中获取对应时间点的数据
                    const stackedItem = categoryData[i];
                    // 将原始数据、类别键和索引都传递过去
                    return [{ stackedItem: stackedItem, originalData: d, timeIndex: i, categoryKey: categoryData.key }];
                })
                .enter().append('rect')
                .attr('class', `bar bar-${categoryIndex}`)
                .attr('x', 0)
                .attr('y', d => d.stackedItem ? yScale(d.stackedItem[1]) : yScale(0))
                .attr('width', barWidth)
                .attr('height', d => d.stackedItem ? yScale(d.stackedItem[0]) - yScale(d.stackedItem[1]) : 0)
                .style('fill', this.colorScale(categoryData.key))
                .style('fill-opacity', 1.0)
                .on('mouseover', function(event, d) {
                    // 使用function而不是箭头函数，确保this指向正确
                    const tooltip = d3.select('.stackedarea-tooltip');
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', .9);
                    // 直接从原始数据中获取该类别的数值
                    let value = 0;
                    console.log('数据结构:', d);
                    if (d && d.originalData && d.stackedItem && d.stackedItem.dataKey && d.originalData[d.stackedItem.dataKey] !== undefined) {
                        value = d.originalData[d.stackedItem.dataKey];
                    }
                    // 获取鼠标相对于页面的位置
                    const mouseX = event.pageX || d3.event.pageX;
                    const mouseY = event.pageY || d3.event.pageY;
                    tooltip.html(`类别: ${d.categoryKey}<br/>数量: ${value}`)
                        .style('left', (mouseX + 10) + 'px')
                        .style('top', (mouseY - 28) + 'px');
                }.bind(this))
                .on('mouseout', function() {
                    const tooltip = d3.select('.stackedarea-tooltip');
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });
        });
        
        // 添加坐标轴 - 两层时间轴
        // 上层：显示时间（每两小时）
        const timeAxis = this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat("%H:%M"))
                .ticks(d3.timeHour.every(2))
                .tickSize(6)
                .tickPadding(5));
        
        // 设置时间标签样式，并加粗0点刻度
        timeAxis.selectAll('text')
            .attr('y', 15)
            .attr('dy', '0.35em')
            .attr('transform', 'rotate(-30)')
            .style('text-anchor', 'end')
            .style('font-weight', function(d) {
                return d.getHours() === 0 ? 'bold' : 'normal';
            });
        
        // 加粗0点的刻度线
        timeAxis.selectAll('.tick line')
            .style('stroke-width', function(d) {
                return d.getHours() === 0 ? '2px' : '1px';
            });
        
        // 下层：显示日期（在时间标签下方）
        // 生成每天十二点的时间点
        const dateTickValues = d3.timeDay.range(
            d3.timeDay.floor(xScale.domain()[0]),
            d3.timeDay.ceil(xScale.domain()[1])
        ).map(d => d3.timeHour.offset(d, 12)); // 每天十二点
        
        this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat("%m/%d"))
                .tickValues(dateTickValues)
                .tickSizeOuter(0)
                .tickSizeInner(6))
            .selectAll('text')
            .style('font-weight', 'bold')
            .style('font-size', '14px')
            .attr('y', 45)
            .attr('dy', '0.35em');
            
        
        this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,0)`)
            .call(d3.axisLeft(yScale)
                .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d.toString()))
            .call(g => g.select('.domain').remove()) // 移除域线
            .call(g => g.select('.tick:last-of-type text').clone()
                .attr('x', 3)
                .attr('text-anchor', 'start')
                .attr('font-weight', 'bold')
                .text('count'));
    
        
        // 绘制图例
        this.renderLegend();
        
        // 如果传入了地区名称（存在 regionName），在右上角显示标签
        const regionName = this.regionName || null;
        this.svg.selectAll('.region-label').remove();
        if (regionName) {
            this.svg.append('text')
                .attr('class', 'region-label')
                .attr('x', this.width)
                .attr('y', -5)
                .attr('text-anchor', 'end')
                .style('fill', '#333')
                .style('font-weight', 'bold')
                .text(`Region: ${regionName}`);
        }
    }

    // 绘制图例
    renderLegend() {
        const container = d3.select(`#${this.containerId}`);
        
        // 移除现有图例
        container.select('.stackedarea-legend').remove();
        
        // 在SVG之前插入图例，设置为图表上方，与y轴左对齐
        const legend = container.insert('div', 'svg')
            .attr('class', 'stackedarea-legend')
            .style('margin-left', `${this.margin.left}px`)
            .style('margin-bottom', '10px')
            .style('position', 'relative');
        
        const legendItems = legend.selectAll('.stackedarea-legend-item')
            .data(this.categories)
            .enter().append('div')
            .attr('class', 'stackedarea-legend-item');
        
        legendItems.append('div')
            .attr('class', 'stackedarea-legend-color')
            .style('background-color', d => this.colorScale(d));
        
        legendItems.append('span')
            .attr('class', 'stackedarea-legend-text')
            .text(d => d);
    }

    // 生成图表
    async generateFromData(selectedFilters = null, regionName = null) {
        try {
            console.log('开始生成堆叠面积图，筛选条件:', selectedFilters, '选中地区:', regionName);
            
            // 获取数据
            const rawData = await this.fetchDataFromQdrant(selectedFilters);
            
            if (!rawData || rawData.length === 0) {
                console.warn('没有获取到数据');
                this.initSVG();
                return;
            }
            
            // 根据地区过滤
            const regionFilteredData = this.applyRegionFilter(rawData, regionName);

            // 处理数据
            this.regionName = regionName; // 保存所选地区名称
            this.processData(regionFilteredData);
            
            // 初始化SVG
            this.initSVG();
            
            // 渲染图表
            this.render();
            
        } catch (error) {
            console.error('生成堆叠面积图失败:', error);
        }
    }

    // 更新图表（用于筛选器）
    async update(selectedFilters, timeFilter, regionName = null) {
        await this.generateFromData(selectedFilters, regionName);
    }
}

// 全局实例
let stackedAreaInstance;

// 初始化堆叠面积图
async function initStackedArea() {
    try {
        stackedAreaInstance = new StackedAreaChart('stackedarea-chart');
        await stackedAreaInstance.generateFromData();
        console.log('堆叠面积图初始化完成');
    } catch (error) {
        console.error('初始化堆叠面积图失败:', error);
    }
}

// 更新堆叠面积图（供筛选器调用）
async function updateStackedAreaWithFilteredData(selectedFilters, timeFilter, regionName = null) {
    if (stackedAreaInstance) {
        await stackedAreaInstance.update(selectedFilters, timeFilter, regionName);
    }
}