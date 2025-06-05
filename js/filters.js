// 筛选器管理类
class FilterManager {
    constructor() {
        this.categories = {};
        this.selectedFilters = {};
        this.timeFilter = {
            startTime: '2020-04-06T00:00',
            endTime: '2020-04-11T00:00'
        };
        this.callbacks = [];
        this.init();
    }

    // 初始化筛选器
    async init() {
        try {
            // 加载分类数据
            const response = await fetch('data/categories.json');
            this.categories = await response.json();
            
            // 初始化选中状态（默认全部不勾选）
            Object.keys(this.categories).forEach(category => {
                this.selectedFilters[category] = [];
            });
            
            // 创建筛选器UI
            this.createFilterUI();
            
        } catch (error) {
            console.error('加载分类数据失败:', error);
        }
    }

    // 创建筛选器UI
    createFilterUI() {
        const container = document.querySelector('.filters-container');
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 创建时间筛选器（放在最上方）
        const timeFilterGroup = this.createTimeFilterGroup();
        container.appendChild(timeFilterGroup);

        // 为每个分类创建筛选器
        Object.keys(this.categories).forEach(category => {
            const filterGroup = this.createFilterGroup(category, this.categories[category]);
            container.appendChild(filterGroup);
        });

        // 添加清空筛选按钮
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-filters-btn';
        clearBtn.textContent = 'reset';
        clearBtn.onclick = () => this.clearAllFilters();
        container.appendChild(clearBtn);
    }

    // 创建单个筛选器组
    createFilterGroup(category, options) {
        const group = document.createElement('div');
        group.className = 'filter-group';

        // 标签
        const label = document.createElement('label');
        label.textContent = category;
        group.appendChild(label);

        // 多选下拉框
        const multiSelect = this.createMultiSelect(category, options);
        group.appendChild(multiSelect);

        return group;
    }

    // 创建多选下拉框
    createMultiSelect(category, options) {
        const container = document.createElement('div');
        container.className = 'multi-select';

        // 按钮
        const button = document.createElement('div');
        button.className = 'multi-select-button';
        
        const buttonText = document.createElement('span');
        this.updateButtonText(buttonText, category);
        
        const arrow = document.createElement('span');
        arrow.className = 'multi-select-arrow';
        arrow.innerHTML = '▼';
        
        button.appendChild(buttonText);
        button.appendChild(arrow);
        
        // 下拉框
        const dropdown = document.createElement('div');
        dropdown.className = 'multi-select-dropdown';
        
        // 操作按钮
        const actions = document.createElement('div');
        actions.className = 'multi-select-actions';
        
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'multi-select-action-btn';
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.onclick = (e) => {
            e.stopPropagation();
            this.selectAll(category);
        };
        
        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.className = 'multi-select-action-btn';
        deselectAllBtn.textContent = 'Clear All';
        deselectAllBtn.onclick = (e) => {
            e.stopPropagation();
            this.deselectAll(category);
        };
        
        actions.appendChild(selectAllBtn);
        actions.appendChild(deselectAllBtn);
        dropdown.appendChild(actions);
        
        // 选项
        options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'multi-select-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;
            checkbox.checked = this.selectedFilters[category].includes(option);
            checkbox.onchange = () => this.toggleOption(category, option);
            
            const optionText = document.createElement('span');
            optionText.textContent = option;
            
            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(optionText);
            optionDiv.onclick = (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.toggleOption(category, option);
                }
            };
            
            dropdown.appendChild(optionDiv);
        });
        
        // 点击按钮切换下拉框显示
        button.onclick = (e) => {
            e.stopPropagation();
            this.toggleDropdown(button, dropdown);
        };
        
        // 点击外部关闭下拉框
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                this.closeDropdown(button, dropdown);
            }
        });
        
        container.appendChild(button);
        container.appendChild(dropdown);
        
        return container;
    }

    // 更新按钮文本
    updateButtonText(buttonText, category) {
        const selected = this.selectedFilters[category];
        const total = this.categories[category].length;
        
        if (selected.length === 0) {
            buttonText.innerHTML = `<span class="selected-count">No items selected</span>`;
        } else if (selected.length === total) {
            buttonText.innerHTML = `<span class="selected-count">All items selected (${total})</span>`;
        } else {
            buttonText.innerHTML = `<span class="selected-count">${selected.length}/${total} selected</span>`;
        }
    }

    // 切换下拉框显示
    toggleDropdown(button, dropdown) {
        const isOpen = dropdown.classList.contains('show');
        
        // 关闭所有其他下拉框
        document.querySelectorAll('.multi-select-dropdown.show').forEach(dd => {
            dd.classList.remove('show');
        });
        document.querySelectorAll('.multi-select-button.active').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (!isOpen) {
            dropdown.classList.add('show');
            button.classList.add('active');
        }
    }

    // 关闭下拉框
    closeDropdown(button, dropdown) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }

    // 切换选项
    toggleOption(category, option) {
        const selected = this.selectedFilters[category];
        const index = selected.indexOf(option);
        
        if (index > -1) {
            selected.splice(index, 1);
        } else {
            selected.push(option);
        }
        
        this.updateUI(category);
        this.notifyCallbacks();
    }

    // 全选
    selectAll(category) {
        this.selectedFilters[category] = [...this.categories[category]];
        this.updateUI(category);
        this.notifyCallbacks();
    }

    // 取消全选
    deselectAll(category) {
        this.selectedFilters[category] = [];
        this.updateUI(category);
        this.notifyCallbacks();
    }

    // 创建时间筛选器组
    createTimeFilterGroup() {
        const group = document.createElement('div');
        group.className = 'filter-group time-filter-group';

        // 时间筛选容器
        const timeContainer = document.createElement('div');
        timeContainer.className = 'time-filter-container';

        // 开始时间
        const startTimeDiv = document.createElement('div');
        startTimeDiv.className = 'time-input-group';
        
        const startLabel = document.createElement('label');
        startLabel.textContent = 'Start Time';
        startLabel.className = 'time-label';
        
        // 开始日期输入
        const startDateInput = document.createElement('input');
        startDateInput.type = 'date';
        startDateInput.className = 'time-date-input';
        startDateInput.onchange = (e) => this.updateDateTimeFilter('startTime', 'date', e.target.value);
        
        // 开始小时选择
        const startHourLabel = document.createElement('label');
        startHourLabel.textContent = 'Hour';
        startHourLabel.className = 'time-label';
        
        const startHourSelect = document.createElement('select');
        startHourSelect.className = 'time-hour-select';
        this.populateHourOptions(startHourSelect);
        startHourSelect.onchange = (e) => this.updateDateTimeFilter('startTime', 'hour', e.target.value);
        
        // 开始分钟选择
        const startMinuteLabel = document.createElement('label');
        startMinuteLabel.textContent = 'Min';
        startMinuteLabel.className = 'time-label';
        
        const startMinuteSelect = document.createElement('select');
        startMinuteSelect.className = 'time-minute-select';
        this.populateMinuteOptions(startMinuteSelect);
        startMinuteSelect.onchange = (e) => this.updateDateTimeFilter('startTime', 'minute', e.target.value);
        
        // 创建标签行容器
        const startLabelContainer = document.createElement('div');
        startLabelContainer.className = 'time-labels-container';
        startLabelContainer.appendChild(startLabel);
        startLabelContainer.appendChild(startHourLabel);
        startLabelContainer.appendChild(startMinuteLabel);
        
        const startInputContainer = document.createElement('div');
        startInputContainer.className = 'datetime-input-container';
        startInputContainer.appendChild(startDateInput);
        startInputContainer.appendChild(startHourSelect);
        startInputContainer.appendChild(startMinuteSelect);
        
        startTimeDiv.appendChild(startLabelContainer);
        startTimeDiv.appendChild(startInputContainer);

        // 结束时间
        const endTimeDiv = document.createElement('div');
        endTimeDiv.className = 'time-input-group';
        
        const endLabel = document.createElement('label');
        endLabel.textContent = 'End Time';
        endLabel.className = 'time-label';
        
        // 结束日期输入
        const endDateInput = document.createElement('input');
        endDateInput.type = 'date';
        endDateInput.className = 'time-date-input';
        endDateInput.onchange = (e) => this.updateDateTimeFilter('endTime', 'date', e.target.value);
        
        // 结束小时选择
        const endHourLabel = document.createElement('label');
        endHourLabel.textContent = 'Hour';
        endHourLabel.className = 'time-label';
        
        const endHourSelect = document.createElement('select');
        endHourSelect.className = 'time-hour-select';
        this.populateHourOptions(endHourSelect);
        endHourSelect.onchange = (e) => this.updateDateTimeFilter('endTime', 'hour', e.target.value);
        
        // 结束分钟选择
        const endMinuteLabel = document.createElement('label');
        endMinuteLabel.textContent = 'Min';
        endMinuteLabel.className = 'time-label';
        
        const endMinuteSelect = document.createElement('select');
        endMinuteSelect.className = 'time-minute-select';
        this.populateMinuteOptions(endMinuteSelect);
        endMinuteSelect.onchange = (e) => this.updateDateTimeFilter('endTime', 'minute', e.target.value);
        
        // 创建标签行容器
        const endLabelContainer = document.createElement('div');
        endLabelContainer.className = 'time-labels-container';
        endLabelContainer.appendChild(endLabel);
        endLabelContainer.appendChild(endHourLabel);
        endLabelContainer.appendChild(endMinuteLabel);
        
        const endInputContainer = document.createElement('div');
        endInputContainer.className = 'datetime-input-container';
        endInputContainer.appendChild(endDateInput);
        endInputContainer.appendChild(endHourSelect);
        endInputContainer.appendChild(endMinuteSelect);
        
        endTimeDiv.appendChild(endLabelContainer);
        endTimeDiv.appendChild(endInputContainer);

        timeContainer.appendChild(startTimeDiv);
        timeContainer.appendChild(endTimeDiv);
        
        // 添加搜索筛选器
        const searchFilterDiv = this.createSearchFilterGroup();
        timeContainer.appendChild(searchFilterDiv);
        
        group.appendChild(timeContainer);

        // 初始化现有的时间筛选值
        this.initializeTimeInputs(startDateInput, startHourSelect, startMinuteSelect, endDateInput, endHourSelect, endMinuteSelect);

        return group;
    }

    // 创建搜索筛选器组
    createSearchFilterGroup() {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-filter-group';
        
        const searchLabel = document.createElement('label');
        searchLabel.textContent = 'Vector Search';
        searchLabel.className = 'search-label';
        
        const searchInputContainer = document.createElement('div');
        searchInputContainer.className = 'search-input-container';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Enter search term...';
        searchInput.id = 'vector-search-input';
        
        const searchButton = document.createElement('button');
        searchButton.className = 'search-button';
        searchButton.textContent = 'Search';
        searchButton.onclick = () => this.performVectorSearch();
        
        // 支持回车键搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performVectorSearch();
            }
        });
        
        searchInputContainer.appendChild(searchInput);
        searchInputContainer.appendChild(searchButton);
        
        searchDiv.appendChild(searchLabel);
        searchDiv.appendChild(searchInputContainer);
        
        return searchDiv;
    }

    // 执行向量搜索
    async performVectorSearch() {
        const searchInput = document.getElementById('vector-search-input');
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            alert('Please enter a search term');
            return;
        }
        
        console.log('执行向量搜索:', searchTerm);
        
        // 创建搜索筛选条件
        const searchFilters = {
            'vector_search': [searchTerm]
        };
        
        // 通知所有回调函数进行搜索
        this.notifyCallbacks(searchFilters);
    }

    // 初始化时间输入框的值
    initializeTimeInputs(startDateInput, startHourSelect, startMinuteSelect, endDateInput, endHourSelect, endMinuteSelect) {
        // 初始化开始时间
        if (this.timeFilter.startTime) {
            const startParts = this.timeFilter.startTime.split('T');
            if (startParts.length === 2) {
                startDateInput.value = startParts[0];
                const timeParts = startParts[1].split(':');
                if (timeParts.length >= 2) {
                    startHourSelect.value = timeParts[0];
                    startMinuteSelect.value = timeParts[1];
                }
            }
        }
        
        // 初始化结束时间
        if (this.timeFilter.endTime) {
            const endParts = this.timeFilter.endTime.split('T');
            if (endParts.length === 2) {
                endDateInput.value = endParts[0];
                const timeParts = endParts[1].split(':');
                if (timeParts.length >= 2) {
                    endHourSelect.value = timeParts[0];
                    endMinuteSelect.value = timeParts[1];
                }
            }
        }
    }

    // 填充小时选项
    populateHourOptions(selectElement) {
        // 生成24小时选项
        for (let hour = 0; hour < 24; hour++) {
            const hourValue = hour.toString().padStart(2, '0');
            const option = document.createElement('option');
            option.value = hourValue;
            option.textContent = hourValue;
            selectElement.appendChild(option);
        }
    }

    // 填充分钟选项
    populateMinuteOptions(selectElement) {
        // 生成分钟选项，每15分钟一个
        for (let minute = 0; minute < 60; minute += 15) {
            const minuteValue = minute.toString().padStart(2, '0');
            const option = document.createElement('option');
            option.value = minuteValue;
            option.textContent = minuteValue;
            selectElement.appendChild(option);
        }
    }





    // 填充时间选项（每15分钟一个选项）- 保留兼容性
    populateTimeOptions(selectElement) {
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Time';
        selectElement.appendChild(defaultOption);
        
        // 生成24小时的时间选项，每15分钟一个
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeValue;
                option.textContent = timeValue;
                selectElement.appendChild(option);
            }
        }
    }

    // 更新日期时间筛选器
    updateDateTimeFilter(type, component, value) {
        // 获取当前的日期和时间值
        const currentDateTime = this.timeFilter[type];
        let date = '';
        let hour = '';
        let minute = '';
        
        if (currentDateTime) {
            const parts = currentDateTime.split('T');
            date = parts[0] || '';
            if (parts[1]) {
                const timeParts = parts[1].split(':');
                hour = timeParts[0] || '';
                minute = timeParts[1] || '';
            }
        }
        
        // 更新对应的组件
        if (component === 'date') {
            date = value;
        } else if (component === 'hour') {
            hour = value;
        } else if (component === 'minute') {
            minute = value;
        } else if (component === 'time') {
            // 兼容旧的time组件
            const timeParts = value.split(':');
            hour = timeParts[0] || '';
            minute = timeParts[1] || '';
        }
        
        // 组合新的datetime-local值
        if (date && hour && minute) {
            this.timeFilter[type] = `${date}T${hour}:${minute}`;
        } else if (date && hour) {
            this.timeFilter[type] = `${date}T${hour}:00`;
        } else if (date) {
            this.timeFilter[type] = `${date}T00:00`;
        } else {
            this.timeFilter[type] = '';
        }
        
        this.notifyCallbacks();
    }

    // 更新时间筛选器
    updateTimeFilter(type, value) {
        this.timeFilter[type] = value;
        this.notifyCallbacks();
    }





    // 获取时间筛选器状态
    getTimeFilter() {
        return this.timeFilter;
    }



    // 清空所有筛选
    clearAllFilters() {
        Object.keys(this.categories).forEach(category => {
            this.selectedFilters[category] = [];
        });
        // 清空时间筛选器
        this.timeFilter.startTime = '';
        this.timeFilter.endTime = '';
        // 更新时间输入框
        const dateInputs = document.querySelectorAll('.time-filter-group .time-date-input');
        const hourSelects = document.querySelectorAll('.time-filter-group .time-hour-select');
        const minuteSelects = document.querySelectorAll('.time-filter-group .time-minute-select');
        dateInputs.forEach(input => input.value = '');
        hourSelects.forEach(select => select.selectedIndex = 0);
        minuteSelects.forEach(select => select.selectedIndex = 0);
        
        this.updateAllUI();
        // 重置时传递null来获取所有数据
        this.notifyCallbacksWithReset();
    }

    // 更新UI
    updateUI(category) {
        const container = document.querySelector('.filters-container');
        const filterGroups = container.querySelectorAll('.filter-group');
        
        filterGroups.forEach(group => {
            const label = group.querySelector('label');
            if (label.textContent === category) {
                const buttonText = group.querySelector('.multi-select-button span');
                this.updateButtonText(buttonText, category);
                
                const checkboxes = group.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.selectedFilters[category].includes(checkbox.value);
                    const option = checkbox.closest('.multi-select-option');
                    if (checkbox.checked) {
                        option.classList.add('selected');
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        });
    }

    // 更新所有UI
    updateAllUI() {
        Object.keys(this.categories).forEach(category => {
            this.updateUI(category);
        });
    }

    // 注册回调函数
    onFilterChange(callback) {
        this.callbacks.push(callback);
    }

    // 通知所有回调函数
    notifyCallbacks(searchFilters = null) {
        // 如果有搜索筛选条件，使用搜索筛选条件；否则使用常规筛选条件
        const filtersToUse = searchFilters || this.selectedFilters;
        
        this.callbacks.forEach(callback => {
            callback(filtersToUse, this.timeFilter);
        });
        // 更新地图
        updateMapWithFilteredData(filtersToUse);
        // 更新堆叠面积图
        updateStackedAreaWithFilteredData(filtersToUse);
        // 更新圆形打包图
        updateCirclePackingWithFilteredData(filtersToUse);
    }

    // 重置时通知所有回调函数（获取所有数据）
    notifyCallbacksWithReset() {
        this.callbacks.forEach(callback => {
            callback(this.selectedFilters, this.timeFilter);
        });
        // 重置时传递null来获取所有数据
        updateMapWithFilteredData(null);
        // 更新堆叠面积图
        updateStackedAreaWithFilteredData(null);
        // 更新圆形打包图
        updateCirclePackingWithFilteredData(null);
    }

    // 获取当前筛选状态
    getSelectedFilters() {
        return this.selectedFilters;
    }

    // 根据筛选条件过滤数据
    filterData(data) {
        return data.filter(item => {
            const mainCategory = item.main_category;
            const subCategory = item.sub_category;
            
            // 检查主分类是否被选中，以及对应的子分类是否被选中
            const categoryMatch = this.selectedFilters[mainCategory] && 
                                 this.selectedFilters[mainCategory].includes(subCategory);
            
            // 检查时间筛选
            let timeMatch = true;
            if (this.timeFilter.startTime || this.timeFilter.endTime) {
                // 假设数据中有时间字段，格式为 HH:MM 或包含时间信息
                const itemTime = this.extractTimeFromItem(item);
                if (itemTime) {
                    if (this.timeFilter.startTime && itemTime < this.timeFilter.startTime) {
                        timeMatch = false;
                    }
                    if (this.timeFilter.endTime && itemTime > this.timeFilter.endTime) {
                        timeMatch = false;
                    }
                }
            }
            
            return categoryMatch && timeMatch;
        });
    }

    // 从数据项中提取时间信息
    extractTimeFromItem(item) {
        // 这里需要根据实际数据结构来提取时间
        // 返回 datetime-local 格式的字符串 (YYYY-MM-DDTHH:MM)
        if (item.datetime) {
            // 如果是日期时间字符串，转换为 datetime-local 格式
            const date = new Date(item.datetime);
            return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        } else if (item.timestamp) {
            // 如果是时间戳，转换为 datetime-local 格式
            const date = new Date(item.timestamp);
            return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        } else if (item.time && item.date) {
            // 如果有分离的日期和时间字段
            return `${item.date}T${item.time}`;
        } else if (item.time) {
            // 如果只有时间，使用今天的日期
            const today = new Date().toISOString().slice(0, 10);
            return `${today}T${item.time}`;
        }
        return null;
    }
}

// 全局筛选器管理器实例
let filterManager;

// 页面加载完成后初始化筛选器
document.addEventListener('DOMContentLoaded', () => {
    filterManager = new FilterManager();
    // 将 filterManager 设置为全局变量
    window.filterManager = filterManager;
    
    // 初始化堆叠面积图
    if (typeof initStackedArea === 'function') {
        initStackedArea();
    }
    
    // 为现有的图表组件注册筛选回调
    filterManager.onFilterChange((selectedFilters, timeFilter) => {
        console.log('筛选条件已更新:', selectedFilters);
        console.log('时间筛选条件:', timeFilter);
        
        // 这里可以触发各个图表的更新
        // 例如：更新地图、词云图、柱状图等
        updateVisualizationsWithFilters(selectedFilters, timeFilter);
    });
});

// 更新可视化组件的函数
async function updateVisualizationsWithFilters(selectedFilters, timeFilter) {
    console.log('更新可视化组件，筛选条件:', selectedFilters);
    console.log('时间筛选条件:', timeFilter);
    
    try {
        // 更新地图（使用向量搜索）
        if (typeof updateMapWithFilteredData === 'function') {
            await updateMapWithFilteredData(selectedFilters, timeFilter);
        }
        
        // 更新堆叠面积图（使用向量搜索）
        if (typeof updateStackedAreaWithFilteredData === 'function') {
            await updateStackedAreaWithFilteredData(selectedFilters, timeFilter);
        }
        
        // 对于词云图和堆叠柱状图，如果需要也可以实现向量搜索
        // 目前先使用传统的数据筛选方式
        if (typeof csvData !== 'undefined' && filterManager) {
            const filteredData = filterManager.filterData(csvData);
            
            console.log('传统筛选后的数据量:', filteredData.length);
            
            // 更新词云图
            if (typeof updateWordcloudWithFilteredData === 'function') {
                updateWordcloudWithFilteredData(filteredData);
            }
            
            // 更新堆叠柱状图
            if (typeof updateStackedBarWithFilteredData === 'function') {
                updateStackedBarWithFilteredData(filteredData);
            }
        }
    } catch (error) {
        console.error('更新可视化组件失败:', error);
    }
}