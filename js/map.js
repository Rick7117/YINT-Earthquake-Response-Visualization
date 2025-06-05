// 定义区域名称列表
const regionNameList = [
    'Palace Hills',
    'Northwest',
    'Old Town',
    'Safe Town',
    'Southwest',
    'Downtown',
    'Wilson Forest',
    'Scenic Vista',
    'Broadview',
    'Chapparal',
    'Terrapin Springs',
    'Pepper Mill',
    'Cheddarford',
    'Easton',
    'Weston',
    'Southton',
    'Oak Willow',
    'East Parton',
    'West Parton'
];

// 定义医院和辐射站的位置
const hospitalLocations = [
    {Lat: 0.180960, Long: -119.959400},
    {Lat: 0.153120, Long: -119.915900},
    {Lat: 0.151090, Long: -119.909520},
    {Lat: 0.121800, Long: -119.904300},
    {Lat: 0.134560, Long: -119.883420},
    {Lat: 0.182990, Long: -119.855580},
    {Lat: 0.041470, Long: -119.828610},
    {Lat: 0.065250, Long: -119.744800}
];

const radiationStations = [
    {Lat: 0.162679, Long: -119.784825}
];

// 从Qdrant向量数据库获取数据的函数
async function fetchDataFromQdrant(selectedFilters = null) {
    try {
        let allResults = [];
        
        // 如果有筛选条件，使用向量相似度搜索
        if (selectedFilters && Object.keys(selectedFilters).length > 0) {
            // 收集所有选中的词条
            const selectedTerms = [];
            for (const [category, terms] of Object.entries(selectedFilters)) {
                if (terms && terms.length > 0) {
                    selectedTerms.push(...terms);
                }
            }
            
            if (selectedTerms.length > 0) {
                console.log('选中的搜索关键词:', selectedTerms);
                
                // 对每个选中的词条进行向量搜索
                for (const term of selectedTerms) {
                    try {
                        console.log(`地图正在搜索关键词: "${term}"`);
                        
                        // 调用Python搜索API
                        const searchResponse = await fetch(`http://127.0.0.1:8000/search/vector?query=${encodeURIComponent(term)}&limit=1000`, {
                            method: 'GET'
                        });
                        
                        if (searchResponse.ok) {
                            const searchData = await searchResponse.json();
                            console.log(`关键词 "${term}" 搜索到 ${searchData.results.length} 条结果:`, searchData.results);
                            
                            // 将搜索结果转换为统一格式
                            const formattedResults = searchData.results.map(result => ({
                                payload: {
                                    time: result.time,
                                    location: result.location,
                                    account: result.account,
                                    message: result.message
                                }
                            }));
                            allResults.push(...formattedResults);
                        }
                    } catch (searchError) {
                        console.warn(`搜索词条 "${term}" 失败:`, searchError);
                    }
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
            main_category: point.payload.main_category || '',
            sub_category: point.payload.sub_category || ''
        }));
        
        console.log(`从Qdrant获取到 ${csvData.length} 条去重后的数据`);
        return csvData;
        
    } catch (error) {
        console.error('Error fetching data from Qdrant:', error);
        // 如果Qdrant连接失败，回退到CSV文件
        console.log('Falling back to CSV file...');
        return d3.csv('data/YInt_result.csv');
    }
}



// 读取CSV数据并统计各地区发言数和发言人数
let regionMessageCounts = {};
let regionUserCounts = {};
let currentHeatmapType = 'messages'; // 默认显示发言数量
let csvData; // 全局数据变量，供筛选器使用

// 从Qdrant向量数据库读取数据
fetchDataFromQdrant().then(async (data) => {
    csvData = data; // 保存到全局变量
    await processMapData(); // 不传递筛选条件，加载所有数据
}).catch(error => {
    console.error('初始化地图数据失败:', error);
});

// 根据日期筛选器过滤数据
function applyTimeFilters(data) {
    console.log('=== 地图开始日期筛选过程 ===');
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
            
            console.log(`数据项通过筛选: ${item.time}`);
            return true;
        });
        
        console.log('筛选后数据数量:', filteredData.length);
    } else {
        console.log('没有设置时间筛选条件，返回原始数据');
    }
    
    console.log('=== 地图日期筛选过程结束 ===');
    return filteredData;
}

// 处理地图数据的函数
async function processMapData(selectedFilters = null) {
    try {
        // 根据筛选条件获取数据
        let data = selectedFilters ? await fetchDataFromQdrant(selectedFilters) : csvData;
        
        // 应用日期筛选器
        data = applyTimeFilters(data);
        
        // 重置计数器
        regionMessageCounts = {};
        regionUserCounts = {};
        
        // 统计每个地区的发言数和发言人数
        data.forEach(d => {
            const location = d.location;
            const account = d.account;
            
            // 统计发言数量
            regionMessageCounts[location] = (regionMessageCounts[location] || 0) + 1;
            
            // 统计发言人数（去重）
            if (!regionUserCounts[location]) {
                regionUserCounts[location] = new Set();
            }
            regionUserCounts[location].add(account);
        });
        
        // 将Set转换为数字
        Object.keys(regionUserCounts).forEach(location => {
            regionUserCounts[location] = regionUserCounts[location].size;
        });
        
        console.log('地区发言统计:', regionMessageCounts);
        console.log('地区发言人数统计:', regionUserCounts);
        
        // 读取geojson文件并绘制地图
        d3.json('data/StHimark.geojson').then(geojson => {
            // 如果是首次加载，绘制完整地图
            if (d3.select('#map g#regMap').selectAll('path').empty()) {
                drawMapWithHeatmap(geojson, getCurrentHeatmapData());
                setupHeatmapFilter(geojson);
            } else {
                // 如果地图已存在，只更新热力图
                updateHeatmap(geojson, getCurrentHeatmapData());
            }
        });
        
        return data;
    } catch (error) {
        console.error('处理地图数据失败:', error);
        return [];
    }
}

// 供筛选器调用的地图更新函数
async function updateMapWithFilteredData(selectedFilters) {
    // 使用筛选条件重新处理数据并更新地图
    await processMapData(selectedFilters);
}

// 获取当前热力图数据
function getCurrentHeatmapData() {
    return currentHeatmapType === 'messages' ? regionMessageCounts : regionUserCounts;
}

// 设置热力图筛选器
function setupHeatmapFilter(geojson) {
    d3.select('#heatmap-type').on('change', function() {
        currentHeatmapType = this.value;
        updateHeatmap(geojson, getCurrentHeatmapData());
    });
}

// 绘制带热力图的地图
function drawMapWithHeatmap(geojson, messageCounts) {
    // 获取SVG容器的尺寸
    const svg = d3.select('#map svg');
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));
    var projection = d3.geoEquirectangular().scale(1).translate([0, 0]);

    const geoPath = d3.geoPath()
        .projection(projection);

    // 缩放和平移
    const b = geoPath.bounds(geojson),
        s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
        t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

    projection.scale(s).translate(t);
    
    // 创建缩放行为
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', zoomed);
    
    // 应用缩放行为
    svg.call(zoom);
    
    // 创建一个组用于缩放
    const g = svg.select('#regMap');
    
    // 添加窗口大小调整事件监听器
    window.addEventListener('resize', function() {
        // 重新获取SVG容器的尺寸
        const newWidth = parseInt(svg.style('width'));
        const newHeight = parseInt(svg.style('height'));
        
        // 重新计算缩放和平移
        const b = geoPath.bounds(geojson);
        const s = .95 / Math.max((b[1][0] - b[0][0]) / newWidth, (b[1][1] - b[0][1]) / newHeight);
        const t = [(newWidth - s * (b[1][0] + b[0][0])) / 2, (newHeight - s * (b[1][1] + b[0][1])) / 2];
        
        projection.scale(s).translate(t);
        
        // 重新绘制地图
        g.selectAll('path').attr('d', geoPath);
        
        // 更新区域名称位置
        g.selectAll('.region-name')
            .attr('x', d => geoPath.centroid(d)[0])
            .attr('y', d => geoPath.centroid(d)[1]);
        
        // 更新医院位置
        d3.select('#hospitalLayer')
            .selectAll('image')
            .attr('transform', d => {
                return 'translate(' + projection([d.Long, d.Lat]) + ')';
            });
        
        // 更新辐射站位置
        d3.select('#radiationLayer')
            .selectAll('image')
            .attr('transform', d => {
                return 'translate(' + projection([d.Long, d.Lat]) + ')';
            });
            
        // 更新比例尺
        updateScaleBar();
    });
    
    // 缩放函数
    function zoomed() {
        g.attr('transform', d3.event.transform);
        // 更新医院和辐射站的位置
        d3.select('#hospitalLayer').attr('transform', d3.event.transform);
        d3.select('#radiationLayer').attr('transform', d3.event.transform);
        // 更新比例尺
        updateScaleBar(d3.event.transform.k);
    }
    
    // 添加缩放控制按钮事件
    d3.select('#zoom-in').on('click', function() {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    });
    
    d3.select('#zoom-out').on('click', function() {
        svg.transition().duration(300).call(zoom.scaleBy, 0.75);
    });
    
    d3.select('#zoom-reset').on('click', function() {
        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity
        );
    });
    
    // 初始化比例尺更新函数
    function updateScaleBar(k) {
        const scaleSize = 100; // 比例尺长度
        const pixelScale = scaleSize / (s * 0.01 * k); // 根据缩放级别调整比例尺
        d3.select('.scale-bar text').text(`${pixelScale.toFixed(2)} 单位`);
    }

    // 创建颜色比例尺
    const maxCount = Math.max(...Object.values(messageCounts));
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);

    // 绘制地图
    function draw_map(geojson) {
        var mapSvg = d3.select('#map g#regMap')
            .selectAll('path')
            .data(geojson.features);

        // 添加路径到地图
        mapSvg.enter()
            .append('path')
            .attr('d', geoPath)
            .attr("id", d => removeWhitespace(d.properties.Nbrhood))
            .classed("unselected", true)
            .style('fill', d => {
                const regionName = d.properties.Nbrhood;
                const count = messageCounts[regionName] || 0;
                return count > 0 ? colorScale(count) : '#f0f0f0';
            })
            .style('stroke', '#333')
            .style('stroke-width', '0.5px')
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
            .on("click", d => click(d));

        // 添加区域名称到地图
        mapSvg.enter()
            .append("svg:text")
            .text(d => d.properties.Id + " " + d.properties.Nbrhood)
            .style("display", "block")
            .attr("x", d => geoPath.centroid(d)[0])
            .attr("y", d => geoPath.centroid(d)[1])
            .attr("text-anchor", "middle")
            .attr("font-size", "8pt");
    }

    draw_map(geojson);
    
    // 绘制医院
    d3.select('#hospitalLayer')
        .selectAll('image')
        .data(hospitalLocations)
        .enter()
        .append('image')
        .attr('class', 'hospIcon')
        .attr('width', 15)
        .attr('height', 15)
        .attr('xlink:href', 'Icon/hospital.svg')
        .attr('transform', d => {
            return 'translate(' + projection([d.Long, d.Lat]) + ')';
        })
        .on('mouseover', function() {
            d3.select(this).style('opacity', 0.7);
            mapTip
                .html("hospital")
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 10) + 'px')
                .style('opacity', 1);
        })
        .on('mouseleave', function() {
            d3.select(this).style('opacity', 1);
            mapTip
                .transition()
                .duration(200)
                .style('opacity', 0);
        });
    
    // 绘制辐射站
    d3.select('#radiationLayer')
        .selectAll('image')
        .data(radiationStations)
        .enter()
        .append('image')
        .attr('class', 'radIcon')
        .attr('width', 15)
        .attr('height', 15)
        .attr('xlink:href', 'Icon/radiation.svg')
        .attr('transform', d => {
            return 'translate(' + projection([d.Long, d.Lat]) + ')';
        })
        .on('mouseover', function() {
            d3.select(this).style('opacity', 0.7);
            mapTip
                .html("Radiation")
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 10) + 'px')
                .style('opacity', 1);
        })
        .on('mouseleave', function() {
            d3.select(this).style('opacity', 1);
            mapTip
                .transition()
                .duration(200)
                .style('opacity', 0);
        });
    
    // 添加图例
    const iconFiles = [
        {"Radiation": "Icon/radiation.svg"}, 
        {"hospital": "Icon/Hospital.svg"}
    ];
    
    const legendSvg = d3.select('#map svg g.legendGroup');
    legendSvg.selectAll('image')
        .data(iconFiles)
        .enter()
        .append('image')
        .attr('width', 13)
        .attr('height', 13)
        .attr('xlink:href', d => Object.values(d)[0])
        .attr('y', (d, i) => i * 15)
        .attr('class', 'mapLegend');
    
    legendSvg.selectAll('text')
        .data(iconFiles)
        .enter()
        .append('text')
        .text(d => Object.keys(d)[0])
        .attr('font-size', 10)
        .attr('x', 15)
        .attr('y', (d, i) => 10 + i * 15);
    
    // 添加热力图图例
    const heatmapLegend = svg.append("g")
        .attr("class", "heatmap-legend")
        .attr("transform", `translate(20, ${height - 120})`);
    
    // 创建渐变定义
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    
    // 添加渐变色阶
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        gradient.append("stop")
            .attr("offset", `${(i / steps) * 100}%`)
            .attr("stop-color", colorScale(i * maxCount / steps));
    }
    
    // 绘制渐变矩形
    heatmapLegend.append("rect")
        .attr("width", 100)
        .attr("height", 15)
        .style("fill", "url(#heatmap-gradient)");
    
    // 添加标签
    heatmapLegend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("font-size", 10)
        .attr("class", "heatmap-legend-title")
        .text(getHeatmapLegendTitle());
    
    heatmapLegend.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("font-size", 8)
        .text("0");
    
    heatmapLegend.append("text")
        .attr("x", 100)
        .attr("y", 30)
        .attr("font-size", 8)
        .attr("text-anchor", "end")
        .text(maxCount);
    
    // 添加比例尺
    const scaleBar = svg.append("g")
        .attr("class", "scale-bar")
        .attr("transform", `translate(${width - 100}, ${height - 30})`);
    
    // 创建比例尺
    const scaleSize = 100; // 比例尺长度
    const pixelScale = scaleSize / (s * 0.01); // 计算比例尺表示的实际距离
    
    // 绘制比例尺线
    scaleBar.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", scaleSize)
        .attr("y2", 0)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    // 添加刻度
    scaleBar.append("line")
        .attr("x1", 0)
        .attr("y1", -5)
        .attr("x2", 0)
        .attr("y2", 5)
        .attr("stroke", "black");
    
    scaleBar.append("line")
        .attr("x1", scaleSize)
        .attr("y1", -5)
        .attr("x2", scaleSize)
        .attr("y2", 5)
        .attr("stroke", "black");
    
    // 添加文字说明
    scaleBar.append("text")
        .attr("x", scaleSize / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .text(`${pixelScale.toFixed(2)} 单位`);

    // 辅助函数
    function removeWhitespace(str) {
        return str.replace(/\s+/g, '');
    }

    // 创建工具提示
    const mapTip = d3.select("#map")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip");

    function mouseover() {
        d3.select(this)
            .style("opacity", 0.5);
    }

    let selectedRegion = null; // 在全局增加一个保存当前选中地区的变量

    function click(d) {
        let regionName = d.properties.Nbrhood;
        let regionElm = d3.select("#" + removeWhitespace(regionName));

        // 如果再次点击同一区域，取消选中；否则更新选中
        if (selectedRegion === regionName) {
            selectedRegion = null;
            regionElm.classed("selected-region", false);
        } else {
            d3.selectAll("path.selected-region").classed("selected-region", false);
            selectedRegion = regionName;
            regionElm.classed("selected-region", true);
        }

        // 更新堆叠图
        updateStackedAreaWithFilteredData(
            window.filterManager.getSelectedFilters(),
            window.filterManager.getTimeFilter(),
            selectedRegion
        );
    }

    function mousemove(d) {
        const regionName = d.properties.Nbrhood;
        const messageCount = regionMessageCounts[regionName] || 0;
        const userCount = regionUserCounts[regionName] || 0;
        mapTip
            .html("区域: " + d.properties.Nbrhood + "<br>" + 
                  "ID: " + d.properties.Id + "<br>" + 
                  "发言数量: " + messageCount + "<br>" +
                  "发言人数: " + userCount + "<br>" +
                  "Description: " + d.properties.description)
            .style("left", (d3.mouse(this)[0] + 30) + "px")
            .style("top", (d3.mouse(this)[1]) + 20 + "px")
            .style("opacity", 1);
    }

    function mouseleave() {
        mapTip
            .transition()
            .duration(200)
            .style("opacity", 0);
        d3.select(this)
            .style("opacity", 1);
    }
}

// 更新热力图
function updateHeatmap(geojson, newData) {
    // 重新计算颜色比例尺
    const maxCount = Math.max(...Object.values(newData));
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);
    
    // 更新地图区域颜色
    d3.select('#map g#regMap')
        .selectAll('path')
        .transition()
        .duration(500)
        .style('fill', d => {
            const regionName = d.properties.Nbrhood;
            const count = newData[regionName] || 0;
            return count > 0 ? colorScale(count) : '#f0f0f0';
        });
    
    // 更新热力图图例
    const steps = 5;
    const gradient = d3.select('#heatmap-gradient');
    gradient.selectAll('stop').remove();
    
    for (let i = 0; i <= steps; i++) {
        gradient.append('stop')
            .attr('offset', `${(i / steps) * 100}%`)
            .attr('stop-color', colorScale(i * maxCount / steps));
    }
    
    // 更新图例标题和最大值
    d3.select('.heatmap-legend-title')
        .text(getHeatmapLegendTitle());
    
    // 更新最大值标签（选择最后一个text元素，即右侧的最大值标签）
    d3.select('.heatmap-legend')
        .selectAll('text')
        .filter(function(d, i, nodes) { return i === nodes.length - 1; })
        .text(maxCount);
}

// 获取热力图图例标题
function getHeatmapLegendTitle() {
    return currentHeatmapType === 'messages' ? 'value' : '发言人数热力图';
}