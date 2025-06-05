// circlepacking.js (stable tooltip & label fix for D3 v5)
// ------------------------------------------------------------
class CirclePackingChart {
    constructor(containerId) {
      this.containerId = containerId;
      this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
      this.svg = null;
      this.width = 800;
      this.height = 800;
  
      // Tooltip (一次性创建)
      this.tooltip = d3.select('body').append('div')
        .attr('class', 'circlepacking-tooltip')
        .style('position', 'absolute')
        .style('padding', '8px 10px')
        .style('background', 'rgba(0,0,0,.8)')
        .style('color', '#fff')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1000);
    }
  
    // ---------------- 数据 ----------------
    async fetchData() {
      try {
        return await d3.csv('data/YInt_w_label.csv');
      } catch (e) {
        console.error('[CirclePacking] CSV load fail', e);
        return [];
      }
    }
  
    applyTimeFilters(data) {
      if (!window.filterManager) return data;
      const { startTime, endTime } = window.filterManager.getTimeFilter();
      if (!startTime && !endTime) return data;
      return data.filter(d => {
        const t = new Date(d.time);
        if (startTime && t < new Date(startTime)) return false;
        if (endTime && t > new Date(endTime)) return false;
        return true;
      });
    }
  
    async buildHierarchy(raw, selected) {
      const categoryMap = await fetch('data/categories.json').then(r => r.json());
  
      // 子→主映射
      const sub2main = {};
      Object.entries(categoryMap).forEach(([main, subs]) => {
        subs.forEach(s => {
          sub2main[s.toLowerCase()] = main;
        });
      });
  
      const hasSel = selected && Object.values(selected).some(arr => arr.length);
      const counter = {};
  
      raw.forEach(item => {
        if (!item.label) return;
        const subRaw = item.label;
        const sub = subRaw.toLowerCase();
        const main = sub2main[sub] || '未分类';
  
        // 按筛选过滤
        if (hasSel) {
          const want = (selected[main] || []).map(s => s.toLowerCase());
          if ((want.length && !want.includes(sub)) || (!want.length)) return;
        }
  
        counter[main] ??= { n: 0, subs: {} };
        counter[main].n++;
        counter[main].subs[subRaw] = (counter[main].subs[subRaw] || 0) + 1;
      });
  
      const root = { name: 'root', children: [] };
      Object.entries(counter).forEach(([main, { n, subs }]) => {
        const children = Object.entries(subs).map(([s, c]) => ({ name: s, value: c }));
        if (children.length) root.children.push({ name: main, value: n, children });
      });
  
      if (!root.children.length) return null;
      return d3.hierarchy(root).sum(d => d.value).sort((a, b) => b.value - a.value);
    }
  
    // ---------------- SVG ----------------
    initSVG() {
      const container = d3.select('#' + this.containerId);
      if (container.empty()) return;
  
      container.style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('overflow', 'hidden');
  
      const { width, height } = container.node().getBoundingClientRect();
      this.width = (width  > 0 ? width  : 800) - this.margin.left - this.margin.right;
      this.height = (height > 0 ? height : 800) - this.margin.top  - this.margin.bottom;
  
      container.selectAll('*').remove();
      this.svg = container.append('svg')
        .attr('width', this.width  + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top  + this.margin.bottom)
        .append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }
  
    // ---------------- 渲染 ----------------
    render() {
      if (!this.hierarchy) return;
  
      // 打包布局
      const pack = d3.pack()
        .size([this.width -20, this.height-20])
        .padding(3);
      const root = pack(this.hierarchy);
  
      // 颜色尺
      const domains = (this.hierarchy.children || []).map(d => d.data?.name || '');
      this.colorScale = d3.scaleOrdinal().domain(domains).range(d3.schemeCategory10);
  
      this.svg.selectAll('*').remove();
      const self = this;
  
      const node = this.svg.selectAll('g')
        .data(root.descendants())
        .enter().append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);
  
      // 圆形及 tooltip 事件
      node.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => {
          if (!d.parent || !d.parent.data || !d.parent.data.name) return '#ccc';
          if (!d.data || !d.data.name) return '#ccc';
          return d.depth === 1
            ? self.colorScale(d.data.name)
            : d3.color(self.colorScale(d.parent.data.name)).brighter(0.5);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('mouseenter', function(d) {
          // D3 v5：使用 d3.event 获取原生事件
          const e = d3.event;
          if (d.depth === 0 || !d.data) return;
          self.tooltip
            .style('opacity', 0.95)
            .html(`类别：${d.data.name}<br/>数量：${d.value ?? 0}`)
            .style('left', `${e.pageX + 12}px`)
            .style('top', `${e.pageY - 28}px`);
        })
        .on('mousemove', function() {
          const e = d3.event;
          self.tooltip
            .style('left', `${e.pageX + 12}px`)
            .style('top', `${e.pageY - 28}px`);
        })
        .on('mouseleave', () => self.tooltip.style('opacity', 0));
  
      // 小类标签（depth === 2）
      node.filter(d => d.depth === 2)
        .append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .text(d => d.data?.name || '')
        .each(function(d) {
          const txt = d3.select(this);
          let fs = Math.min(d.r * 0.4, 10);
          while (fs >= 4) {
            txt.style('font-size', fs + 'px');
            if (this.getComputedTextLength() <= d.r * 1.8) break;
            fs -= 1;
          }
          if (fs < 4) txt.text('');
        });
    }
  
    // ---------------- API ----------------
    async generate(sel = null) {
      const raw = await this.fetchData();
      const tf = this.applyTimeFilters(raw);
      this.hierarchy = await this.buildHierarchy(tf, sel);
      if (!this.hierarchy) return;
      this.initSVG();
      this.render();
    }
  
    update(sel) { return this.generate(sel); }
  }
  
  // 全局实例 & 钩子
  let circlePackingInstance;
  async function initCirclePacking() {
    circlePackingInstance = new CirclePackingChart('circlepacking-chart');
    await circlePackingInstance.generate();
  }
  async function updateCirclePackingWithFilteredData(sel) {
    if (!circlePackingInstance) await initCirclePacking();
    await circlePackingInstance.update(sel);
  }
  
  document.addEventListener('DOMContentLoaded', initCirclePacking);
  

  