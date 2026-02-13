/**
 * 小航智能辅导系统 - 代码框架可视化模块
 * 
 * 核心设计思想：
 * 1. 程序由顺序、选择、循环三种控制结构组成
 * 2. 复杂问题通过层次化分解成子模块
 * 3. 每层分解后询问用户是否能写出代码
 * 4. 使用专业的可视化图表展示ISPO和控制流
 */

// ==================== 控制结构定义 ====================
const ControlStructures = {
    SEQUENCE: {
        type: 'sequence',
        name: '顺序结构',
        icon: '📋',
        color: '#3498db',
        bgColor: '#e8f4fd',
        description: '按顺序依次执行的语句块',
        shape: 'rect',
        mermaidClass: 'sequence'
    },
    SELECTION: {
        type: 'selection',
        name: '选择结构',
        icon: '🔀',
        color: '#e74c3c',
        bgColor: '#fce4ec',
        description: 'if-else、switch等条件分支',
        shape: 'diamond',
        mermaidClass: 'selection'
    },
    LOOP: {
        type: 'loop',
        name: '循环结构',
        icon: '🔄',
        color: '#27ae60',
        bgColor: '#e8f5e9',
        description: 'for、while等循环语句',
        shape: 'hexagon',
        mermaidClass: 'loop'
    }
};

// 获取控制结构信息
function getControlStructure(type) {
    const typeMap = {
        'sequence': ControlStructures.SEQUENCE,
        'selection': ControlStructures.SELECTION,
        'loop': ControlStructures.LOOP
    };
    return typeMap[type] || ControlStructures.SEQUENCE;
}


// ==================== ISPO卡片生成器 ====================
const IPOCardGenerator = {
    /**
     * 生成ISPO可视化卡片（Input → Storage → Process → Output）
     * @param {Object} ipo - ISPO数据 {input, storage, process, output}
     * @param {string} controlType - 控制结构类型
     * @param {string} moduleName - 模块名称
     * @param {number} level - 分解层级
     */
    generateCard(ipo, controlType, moduleName, level = 1) {
        const ctrl = getControlStructure(controlType);
        
        return `
        <div class="ipo-card" style="
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin: 16px 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border-left: 5px solid ${ctrl.color};
            transition: transform 0.3s, box-shadow 0.3s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.12)';"
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)';">
            
            <!-- 卡片头部 -->
            <div class="ipo-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">${ctrl.icon}</span>
                    <div>
                        <h4 style="margin: 0; color: #2c3e50; font-size: 18px;">${moduleName}</h4>
                        <span style="
                            display: inline-block;
                            background: ${ctrl.bgColor};
                            color: ${ctrl.color};
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: bold;
                            margin-top: 4px;
                        ">${ctrl.name}</span>
                    </div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                ">第${level}层</div>
            </div>
            
            <!-- ISPO流程图 -->
            <div class="ipo-flow" style="
                display: grid;
                grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
                gap: 10px;
                align-items: stretch;
            ">
                ${this.generateIPOBox('input', '📥 输入 (Input)', ipo.input || '待定义')}
                ${this.generateArrow()}
                ${this.generateIPOBox('storage', '💾 存储 (Storage)', ipo.storage || '待定义')}
                ${this.generateArrow()}
                ${this.generateIPOBox('process', '⚙️ 处理 (Process)', ipo.process || '待定义')}
                ${this.generateArrow()}
                ${this.generateIPOBox('output', '📤 输出 (Output)', ipo.output || '待定义')}
            </div>
        </div>
        `;
    },
    
    generateIPOBox(type, title, content) {
        const colors = {
            input: { bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', border: '#2196f3', icon: '#1976d2' },
            storage: { bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', border: '#9c27b0', icon: '#7b1fa2' },
            process: { bg: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)', border: '#ff9800', icon: '#f57c00' },
            output: { bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', border: '#4caf50', icon: '#388e3c' }
        };
        const c = colors[type];
        
        return `
        <div class="ipo-box ${type}" style="
            background: ${c.bg};
            border: 2px solid ${c.border};
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            min-height: 100px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        ">
            <div style="font-weight: bold; color: ${c.icon}; margin-bottom: 10px; font-size: 14px;">${title}</div>
            <div style="font-size: 13px; color: #2c3e50; line-height: 1.5;">${content}</div>
        </div>
        `;
    },
    
    generateArrow() {
        return `
        <div class="ipo-arrow" style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: #bdc3c7;
        ">→</div>
        `;
    },

    /**
     * 生成控制结构汇总卡片
     */
    generateControlStructureCard(structures) {
        const counts = { sequence: 0, selection: 0, loop: 0 };
        structures.forEach(s => {
            if (counts[s.type] !== undefined) counts[s.type]++;
        });
        
        return `
        <div class="control-summary-card" style="
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 20px 0;
        ">
            <h5 style="color: #2c3e50; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">📊</span>
                控制结构统计
            </h5>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                ${this.generateStructureStatBox(ControlStructures.SEQUENCE, counts.sequence)}
                ${this.generateStructureStatBox(ControlStructures.SELECTION, counts.selection)}
                ${this.generateStructureStatBox(ControlStructures.LOOP, counts.loop)}
            </div>
        </div>
        `;
    },
    
    generateStructureStatBox(ctrl, count) {
        return `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 2px solid ${ctrl.color};
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size: 36px; margin-bottom: 8px;">${ctrl.icon}</div>
            <div style="font-weight: bold; color: ${ctrl.color}; font-size: 16px;">${ctrl.name}</div>
            <div style="font-size: 28px; font-weight: bold; color: #2c3e50; margin-top: 8px;">${count}</div>
            <div style="font-size: 12px; color: #7f8c8d;">${ctrl.description}</div>
        </div>
        `;
    }
};


// ==================== 分解导航管理器 ====================
class DecompositionNavigator {
    constructor() {
        this.tree = null;           // 完整的分解树
        this.currentPath = [];      // 当前路径 [0] 表示第一个子模块
        this.allLevels = [];        // 所有层级的分解数据
    }
    
    /**
     * 初始化根节点
     */
    initRoot(data) {
        this.tree = {
            name: data.parentProblem || '主问题',
            level: 1,
            data: data,
            children: data.subProblems?.map((sub, index) => ({
                name: sub.name,
                index: index,
                controlType: sub.controlType,
                data: sub,
                children: [],
                expanded: false
            })) || []
        };
        this.allLevels = [data];
        this.currentPath = [];
    }
    
    /**
     * 添加子分解
     */
    addChildDecomposition(parentPath, data) {
        this.allLevels.push(data);
        // 找到父节点并添加子节点
        let node = this.tree;
        for (const idx of parentPath) {
            if (node.children && node.children[idx]) {
                node = node.children[idx];
            }
        }
        if (node && data.subProblems) {
            node.children = data.subProblems.map((sub, index) => ({
                name: sub.name,
                index: index,
                controlType: sub.controlType,
                data: sub,
                children: [],
                expanded: false
            }));
            node.expanded = true;
        }
    }
    
    /**
     * 生成导航面板HTML
     */
    generateNavigationPanel() {
        if (!this.tree) return '';
        
        const totalModules = this.countTotalModules(this.tree);
        const completedModules = this.countCompletedModules(this.tree);
        const maxDepth = this.getMaxDepth(this.tree);
        
        return `
        <div class="decomposition-navigator">
            <div class="nav-header">
                <h4>📍 分解导航</h4>
                <div class="nav-stats">
                    <span class="stat-item">
                        <span class="stat-icon">📊</span>
                        当前深度: <strong>第${maxDepth}层</strong>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">📦</span>
                        模块总数: <strong>${totalModules}个</strong>
                    </span>
                </div>
            </div>
            
            <div class="nav-tree-container">
                <div class="nav-tree">
                    ${this.generateTreeHTML(this.tree, [], 0)}
                </div>
            </div>
            
            <div class="nav-legend">
                <div class="legend-title">图例说明</div>
                <div class="legend-items">
                    <span class="legend-item"><span class="legend-dot sequence"></span>顺序</span>
                    <span class="legend-item"><span class="legend-dot selection"></span>选择</span>
                    <span class="legend-item"><span class="legend-dot loop"></span>循环</span>
                    <span class="legend-item"><span class="legend-dot expanded"></span>已展开</span>
                    <span class="legend-item"><span class="legend-dot pending"></span>待分解</span>
                </div>
            </div>
        </div>
        
        <style>
            .decomposition-navigator {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 25px;
                color: white;
            }
            
            .nav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .nav-header h4 {
                margin: 0;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .nav-stats {
                display: flex;
                gap: 20px;
            }
            
            .stat-item {
                background: rgba(255,255,255,0.1);
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .stat-icon {
                font-size: 14px;
            }
            
            .nav-tree-container {
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 20px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .nav-tree {
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
                line-height: 1.8;
            }
            
            .tree-node {
                position: relative;
                padding-left: 25px;
            }
            
            .tree-node::before {
                content: '';
                position: absolute;
                left: 8px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: rgba(255,255,255,0.2);
            }
            
            .tree-node:last-child::before {
                height: 14px;
            }
            
            .tree-node-content {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 12px;
                border-radius: 6px;
                transition: all 0.2s;
                cursor: default;
            }
            
            .tree-node-content:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .tree-node-content::before {
                content: '├─';
                color: rgba(255,255,255,0.4);
                font-size: 12px;
            }
            
            .tree-node:last-child > .tree-node-content::before {
                content: '└─';
            }
            
            .node-icon {
                font-size: 16px;
            }
            
            .node-name {
                flex: 1;
            }
            
            .node-badge {
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: bold;
            }
            
            .node-badge.sequence { background: #3498db; }
            .node-badge.selection { background: #e74c3c; }
            .node-badge.loop { background: #27ae60; }
            .node-badge.root { background: #667eea; }
            .node-badge.expanded { background: #f39c12; }
            .node-badge.pending { background: #95a5a6; }
            
            .tree-root {
                padding-left: 0;
            }
            
            .tree-root::before {
                display: none;
            }
            
            .tree-root > .tree-node-content::before {
                content: '🎯';
            }
            
            .tree-children {
                margin-left: 10px;
            }
            
            .nav-legend {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            
            .legend-title {
                font-size: 12px;
                color: rgba(255,255,255,0.6);
                margin-bottom: 8px;
            }
            
            .legend-items {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                color: rgba(255,255,255,0.8);
            }
            
            .legend-dot {
                width: 12px;
                height: 12px;
                border-radius: 3px;
            }
            
            .legend-dot.sequence { background: #3498db; }
            .legend-dot.selection { background: #e74c3c; }
            .legend-dot.loop { background: #27ae60; }
            .legend-dot.expanded { background: #f39c12; }
            .legend-dot.pending { background: #95a5a6; }
        </style>
        `;
    }
    
    /**
     * 递归生成树形HTML
     */
    generateTreeHTML(node, path, depth) {
        const isRoot = depth === 0;
        const ctrl = node.controlType ? getControlStructure(node.controlType) : null;
        
        let html = `
        <div class="tree-node ${isRoot ? 'tree-root' : ''}" data-path="${path.join('-')}">
            <div class="tree-node-content">
                <span class="node-icon">${isRoot ? '' : (ctrl?.icon || '📦')}</span>
                <span class="node-name">${node.name}</span>
                ${isRoot ? 
                    '<span class="node-badge root">主问题</span>' : 
                    `<span class="node-badge ${node.controlType || ''}">${ctrl?.name || ''}</span>`
                }
                ${node.children && node.children.length > 0 ? 
                    '<span class="node-badge expanded">已展开</span>' : 
                    (!isRoot && node.data?.needsFurtherDecomposition !== false ? 
                        '<span class="node-badge pending">待分解</span>' : '')
                }
            </div>
        `;
        
        if (node.children && node.children.length > 0) {
            html += '<div class="tree-children">';
            node.children.forEach((child, index) => {
                html += this.generateTreeHTML(child, [...path, index], depth + 1);
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * 统计总模块数
     */
    countTotalModules(node) {
        let count = node.children ? node.children.length : 0;
        if (node.children) {
            node.children.forEach(child => {
                count += this.countTotalModules(child);
            });
        }
        return count;
    }
    
    /**
     * 统计已完成模块数
     */
    countCompletedModules(node) {
        let count = 0;
        if (node.children) {
            node.children.forEach(child => {
                if (child.data?.needsFurtherDecomposition === false || child.children?.length > 0) {
                    count++;
                }
                count += this.countCompletedModules(child);
            });
        }
        return count;
    }
    
    /**
     * 获取最大深度
     */
    getMaxDepth(node, currentDepth = 0) {
        if (!node.children || node.children.length === 0) {
            return currentDepth;
        }
        let maxChildDepth = currentDepth;
        node.children.forEach(child => {
            const childDepth = this.getMaxDepth(child, currentDepth + 1);
            if (childDepth > maxChildDepth) {
                maxChildDepth = childDepth;
            }
        });
        return maxChildDepth;
    }
    
    /**
     * 重置
     */
    reset() {
        this.tree = null;
        this.currentPath = [];
        this.allLevels = [];
    }
}

// 全局导航器实例
const decompositionNavigator = new DecompositionNavigator();
window.decompositionNavigator = decompositionNavigator;


// ==================== 流程图生成器 (使用Mermaid) ====================
const FlowchartGenerator = {
    /**
     * 生成问题分解流程图 - 返回null使用HTML版本
     */
    generateDecompositionChart(data) {
        return null;
    },
    
    /**
     * 生成美观的HTML分解结构图
     */
    generateBeautifulDecompositionChart(data) {
        let html = `
        <div class="beautiful-decomposition">
            <div class="decomp-parent">
                <div class="parent-icon">🎯</div>
                <div class="parent-text">${data.parentProblem || '主问题'}</div>
            </div>
            
            <div class="decomp-connector">
                <div class="connector-line"></div>
                <div class="connector-branches" style="--branch-count: ${data.subProblems?.length || 1}">
        `;
        
        if (data.subProblems && data.subProblems.length > 0) {
            data.subProblems.forEach((sub, index) => {
                html += `<div class="branch-line"></div>`;
            });
        }
        
        html += `
                </div>
            </div>
            
            <div class="decomp-children">
        `;
        
        if (data.subProblems && data.subProblems.length > 0) {
            data.subProblems.forEach((sub, index) => {
                const ctrl = getControlStructure(sub.controlType);
                html += `
                <div class="child-node" style="--child-color: ${ctrl.color}; --child-bg: ${ctrl.bgColor};">
                    <div class="child-arrow">▼</div>
                    <div class="child-card child-${sub.controlType}">
                        <div class="child-icon">${ctrl.icon}</div>
                        <div class="child-info">
                            <div class="child-name">${sub.name || '子模块' + (index + 1)}</div>
                            <div class="child-type" style="background: ${ctrl.color};">${ctrl.name}</div>
                        </div>
                    </div>
                </div>
                `;
            });
        }
        
        html += `
            </div>
        </div>
        
        <style>
            .beautiful-decomposition {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 30px 20px;
                background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
                border-radius: 16px;
            }
            
            .decomp-parent {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 18px 35px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 16px;
                box-shadow: 0 8px 30px rgba(102, 126, 234, 0.35);
            }
            
            .parent-icon {
                font-size: 28px;
            }
            
            .parent-text {
                font-weight: bold;
                font-size: 17px;
                max-width: 300px;
            }
            
            .decomp-connector {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .connector-line {
                width: 4px;
                height: 30px;
                background: linear-gradient(180deg, #667eea 0%, #a8b5e0 100%);
                border-radius: 2px;
            }
            
            .connector-branches {
                display: flex;
                gap: 0;
                height: 25px;
                position: relative;
            }
            
            .connector-branches::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #a8b5e0 0%, #667eea 50%, #a8b5e0 100%);
                border-radius: 2px;
            }
            
            .branch-line {
                width: 120px;
                height: 100%;
                position: relative;
            }
            
            .decomp-children {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                justify-content: center;
                margin-top: -5px;
            }
            
            .child-node {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .child-arrow {
                color: #667eea;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .child-card {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 20px;
                background: var(--child-bg, #f8f9fa);
                border: 3px solid var(--child-color, #667eea);
                border-radius: 12px;
                min-width: 160px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            }
            
            .child-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            }
            
            .child-selection {
                border-radius: 0;
                clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
                padding: 14px 30px;
            }
            
            .child-loop {
                border-radius: 25px;
            }
            
            .child-icon {
                font-size: 26px;
            }
            
            .child-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .child-name {
                font-weight: bold;
                font-size: 14px;
                color: #2c3e50;
            }
            
            .child-type {
                font-size: 11px;
                color: white;
                padding: 3px 10px;
                border-radius: 10px;
                text-align: center;
            }
        </style>
        `;
        
        return html;
    },
    
    /**
     * 生成ISPO流程图（Input → Storage → Process → Output）
     */
    generateIPOChart(ipo, moduleName) {
        return `
flowchart LR
    classDef input fill:#e3f2fd,stroke:#2196f3,color:#1976d2,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#9c27b0,color:#7b1fa2,stroke-width:2px
    classDef process fill:#fff8e1,stroke:#ff9800,color:#f57c00,stroke-width:2px
    classDef output fill:#e8f5e9,stroke:#4caf50,color:#388e3c,stroke-width:2px
    
    subgraph ${this.escapeText(moduleName)}
        I["📥 输入<br/>${this.escapeText(ipo.input || '待定义')}"]:::input
        S["💾 存储<br/>${this.escapeText(ipo.storage || '待定义')}"]:::storage
        P["⚙️ 处理<br/>${this.escapeText(ipo.process || '待定义')}"]:::process
        O["📤 输出<br/>${this.escapeText(ipo.output || '待定义')}"]:::output
        I --> S --> P --> O
    end
`;
    },
    
    /**
     * 生成控制流图 - 美观的HTML版本
     */
    generateControlFlowChart(subProblems) {
        // 返回空，使用HTML版本替代
        return null;
    },
    
    /**
     * 生成美观的HTML控制流图
     */
    generateBeautifulFlowChart(subProblems) {
        let html = `
        <div class="beautiful-flow-chart">
            <div class="flow-node flow-start">
                <div class="node-icon">🚀</div>
                <div class="node-text">开始</div>
            </div>
            <div class="flow-arrow">
                <div class="arrow-line"></div>
                <div class="arrow-head">▼</div>
            </div>
        `;
        
        subProblems.forEach((sub, index) => {
            const ctrl = getControlStructure(sub.controlType);
            const isLast = index === subProblems.length - 1;
            
            html += `
            <div class="flow-node flow-${sub.controlType}" style="--node-color: ${ctrl.color}; --node-bg: ${ctrl.bgColor};">
                <div class="node-badge">${ctrl.icon}</div>
                <div class="node-content">
                    <div class="node-title">${sub.name || '步骤' + (index + 1)}</div>
                    <div class="node-type">${ctrl.name}</div>
                </div>
            </div>
            `;
            
            if (!isLast) {
                html += `
                <div class="flow-arrow">
                    <div class="arrow-line"></div>
                    <div class="arrow-head">▼</div>
                </div>
                `;
            }
        });
        
        html += `
            <div class="flow-arrow">
                <div class="arrow-line"></div>
                <div class="arrow-head">▼</div>
            </div>
            <div class="flow-node flow-end">
                <div class="node-icon">✅</div>
                <div class="node-text">结束</div>
            </div>
        </div>
        
        <style>
            .beautiful-flow-chart {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 30px 20px;
                background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
                border-radius: 16px;
            }
            
            .flow-node {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 16px 28px;
                border-radius: 12px;
                min-width: 220px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            }
            
            .flow-node:hover {
                transform: scale(1.03);
                box-shadow: 0 6px 25px rgba(0,0,0,0.12);
            }
            
            .flow-start, .flow-end {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 30px;
                min-width: 140px;
                justify-content: center;
            }
            
            .flow-end {
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            }
            
            .flow-start .node-icon, .flow-end .node-icon {
                font-size: 24px;
            }
            
            .flow-start .node-text, .flow-end .node-text {
                font-weight: bold;
                font-size: 16px;
            }
            
            .flow-sequence {
                background: var(--node-bg, #e8f4fd);
                border: 3px solid var(--node-color, #3498db);
            }
            
            .flow-selection {
                background: var(--node-bg, #fce4ec);
                border: 3px solid var(--node-color, #e74c3c);
                border-radius: 0;
                clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%);
                padding: 20px 35px;
            }
            
            .flow-loop {
                background: var(--node-bg, #e8f5e9);
                border: 3px solid var(--node-color, #27ae60);
                border-radius: 25px;
            }
            
            .node-badge {
                font-size: 28px;
                flex-shrink: 0;
            }
            
            .node-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .node-title {
                font-weight: bold;
                font-size: 15px;
                color: #2c3e50;
            }
            
            .node-type {
                font-size: 12px;
                color: var(--node-color, #666);
                font-weight: 500;
            }
            
            .flow-arrow {
                display: flex;
                flex-direction: column;
                align-items: center;
                height: 40px;
            }
            
            .arrow-line {
                width: 3px;
                height: 28px;
                background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
                border-radius: 2px;
            }
            
            .arrow-head {
                color: #764ba2;
                font-size: 14px;
                margin-top: -4px;
            }
        </style>
        `;
        
        return html;
    },
    
    escapeText(text) {
        if (!text) return '';
        return text
            .replace(/"/g, "'")
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .replace(/\{/g, '(')
            .replace(/\}/g, ')')
            .replace(/<br\/>/g, '<br>')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .substring(0, 50); // 限制长度
    }
};


// ==================== 用户交互提示生成器 ====================
const UserPromptGenerator = {
    /**
     * 生成"你能写出代码吗"的交互提示
     */
    generateCanWritePrompt(subProblem, index, level, pathStr = '') {
        const ctrl = getControlStructure(subProblem.controlType);
        const uniqueId = pathStr || `${level}_${index}`;
        
        return `
        <div class="user-prompt-card" id="prompt-${uniqueId}" data-path="${pathStr}" style="
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
            border: 2px solid ${ctrl.color};
            border-radius: 16px;
            padding: 24px;
            margin: 20px 0;
            transition: all 0.3s;
        ">
            <!-- 模块信息头部 -->
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <span style="
                    font-size: 40px;
                    background: ${ctrl.bgColor};
                    padding: 12px;
                    border-radius: 12px;
                ">${ctrl.icon}</span>
                <div>
                    <h4 style="margin: 0; color: #2c3e50; font-size: 18px;">
                        ${subProblem.name || '子模块'}
                    </h4>
                    <div style="display: flex; gap: 8px; margin-top: 6px;">
                        <span style="
                            background: ${ctrl.color};
                            color: white;
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: bold;
                        ">${ctrl.name}</span>
                        <span style="
                            background: #667eea;
                            color: white;
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 12px;
                        ">第${level}层</span>
                    </div>
                </div>
            </div>
            
            <!-- ISPO简要展示 -->
            <div style="
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            ">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center;">
                    <div style="background: #e3f2fd; padding: 12px; border-radius: 8px;">
                        <div style="font-weight: bold; color: #1976d2; font-size: 12px; margin-bottom: 6px;">📥 输入</div>
                        <div style="font-size: 13px; color: #2c3e50;">${subProblem.ipo?.input || '待定义'}</div>
                    </div>
                    <div style="background: #f3e5f5; padding: 12px; border-radius: 8px;">
                        <div style="font-weight: bold; color: #7b1fa2; font-size: 12px; margin-bottom: 6px;">💾 存储</div>
                        <div style="font-size: 13px; color: #2c3e50;">${subProblem.ipo?.storage || '待定义'}</div>
                    </div>
                    <div style="background: #fff8e1; padding: 12px; border-radius: 8px;">
                        <div style="font-weight: bold; color: #f57c00; font-size: 12px; margin-bottom: 6px;">⚙️ 处理</div>
                        <div style="font-size: 13px; color: #2c3e50;">${subProblem.ipo?.process || '待定义'}</div>
                    </div>
                    <div style="background: #e8f5e9; padding: 12px; border-radius: 8px;">
                        <div style="font-weight: bold; color: #388e3c; font-size: 12px; margin-bottom: 6px;">📤 输出</div>
                        <div style="font-size: 13px; color: #2c3e50;">${subProblem.ipo?.output || '待定义'}</div>
                    </div>
                </div>
            </div>
            
            <!-- 语句建议（如果有） -->
            ${subProblem.codeHint ? `
            <div style="
                background: #f0f9ff;
                border-left: 4px solid #3b82f6;
                padding: 12px 16px;
                margin-bottom: 20px;
                border-radius: 0 8px 8px 0;
            ">
                <div style="font-weight: bold; color: #3b82f6; font-size: 12px; margin-bottom: 6px;">💡 语句建议</div>
                <div style="font-size: 13px; color: #1e40af; line-height: 1.6;">${subProblem.codeHint}</div>
            </div>
            ` : ''}
            
            <!-- 用户选择区域 -->
            <div style="
                background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            ">
                <p style="font-size: 16px; color: #2c3e50; margin-bottom: 16px; font-weight: bold;">
                    🤔 看完这个分解，你能写出这部分的代码吗？
                </p>
                <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="handleUserCanWrite('${uniqueId}', ${index}, ${level})" style="
                        padding: 14px 32px;
                        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                        color: white;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 15px;
                        transition: all 0.3s;
                        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(39, 174, 96, 0.4)';"
                       onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(39, 174, 96, 0.3)';">
                        ✅ 我可以写出来
                    </button>
                    <button onclick="handleUserNeedDecompose('${uniqueId}', ${index}, ${level}, '${pathStr}')" style="
                        padding: 14px 32px;
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        color: white;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 15px;
                        transition: all 0.3s;
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)';"
                       onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.3)';">
                        ❌ 还需要继续分解
                    </button>
                </div>
            </div>
        </div>
        `;
    },
    
    /**
     * 生成用户确认可以写代码后的反馈
     */
    generateCanWriteFeedback(moduleName) {
        return `
        <div style="
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            animation: successPulse 0.5s ease-out;
        ">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <h4 style="color: #155724; margin-bottom: 8px;">太棒了！</h4>
            <p style="color: #155724; font-size: 14px;">
                你已经理解了 <strong>${moduleName}</strong> 的实现思路<br/>
                现在可以在代码编辑器中实现这个模块了
            </p>
        </div>
        `;
    },
    
    /**
     * 生成正在分解的加载状态
     */
    generateDecomposingFeedback() {
        return `
        <div style="
            background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
            border: 2px solid #ffc107;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
        ">
            <div style="font-size: 48px; margin-bottom: 12px; animation: spin 1s linear infinite;">🔄</div>
            <h4 style="color: #856404; margin-bottom: 8px;">正在进行更细粒度的分解...</h4>
            <p style="color: #856404; font-size: 14px;">AI正在分析如何将这个模块拆分成更小的部分</p>
        </div>
        <style>
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes successPulse { 
                0% { transform: scale(0.95); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
        </style>
        `;
    }
};


// ==================== 完整可视化渲染器 ====================
const FrameworkVisualizer = {
    /**
     * 渲染完整的框架分解可视化
     */
    async renderFullVisualization(data, container, isSubDecomposition = false, parentPath = []) {
        // 更新导航器
        if (!isSubDecomposition) {
            decompositionNavigator.initRoot(data);
        } else {
            decompositionNavigator.addChildDecomposition(parentPath, data);
        }
        
        let html = `
        <div class="framework-visualization">
            <!-- 分解导航面板 -->
            ${decompositionNavigator.generateNavigationPanel()}
            
            <!-- 当前分解层级信息 -->
            <div class="current-level-info">
                <div class="level-header">
                    <div class="level-badge">
                        <span class="level-number">第${data.level || 1}层</span>
                        <span class="level-label">分解</span>
                    </div>
                    <div class="level-problem">
                        <span class="problem-icon">🎯</span>
                        <span class="problem-text">${data.parentProblem || '主问题'}</span>
                    </div>
                    <div class="level-summary">
                        分解为 <strong>${data.subProblems?.length || 0}</strong> 个子模块
                    </div>
                </div>
            </div>
            
            <style>
                .current-level-info {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 16px;
                    padding: 25px;
                    margin-bottom: 25px;
                    color: white;
                }
                
                .level-header {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                
                .level-badge {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: rgba(255,255,255,0.2);
                    padding: 12px 20px;
                    border-radius: 12px;
                    min-width: 80px;
                }
                
                .level-number {
                    font-size: 24px;
                    font-weight: bold;
                }
                
                .level-label {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .level-problem {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.1);
                    padding: 15px 20px;
                    border-radius: 12px;
                }
                
                .problem-icon {
                    font-size: 24px;
                }
                
                .problem-text {
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .level-summary {
                    background: rgba(255,255,255,0.2);
                    padding: 12px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                }
            </style>
            
            <!-- 整体ISPO -->
            ${data.overallIPO ? `
            <div style="margin-bottom: 24px;">
                <h5 style="color: #2c3e50; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📊</span>
                    整体ISPO分析
                </h5>
                ${IPOCardGenerator.generateCard(data.overallIPO, 'sequence', data.parentProblem || '整体问题', data.level || 1)}
            </div>
            ` : ''}
            
            <!-- 分解结构图 -->
            <div style="margin-bottom: 24px;">
                <h5 style="color: #2c3e50; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🔍</span>
                    分解结构图
                </h5>
                <div id="decomposition-chart-${data.level}" style="
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    min-height: 200px;
                "></div>
            </div>
            
            <!-- 控制流图 -->
            ${data.subProblems && data.subProblems.length > 1 ? `
            <div style="margin-bottom: 24px;">
                <h5 style="color: #2c3e50; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🔀</span>
                    执行流程图
                </h5>
                <div id="control-flow-chart-${data.level}" style="
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    min-height: 200px;
                "></div>
            </div>
            ` : ''}
            
            <!-- 子模块详情 -->
            <div style="margin-bottom: 24px;">
                <h5 style="color: #2c3e50; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📦</span>
                    子模块详情
                    <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 10px;">
                        共${data.subProblems?.length || 0}个
                    </span>
                </h5>
        `;
        
        // 生成每个子模块的ISPO卡片和用户交互提示
        if (data.subProblems && data.subProblems.length > 0) {
            data.subProblems.forEach((sub, index) => {
                const currentPath = isSubDecomposition ? [...parentPath, index] : [index];
                
                html += IPOCardGenerator.generateCard(
                    sub.ipo || { input: '待定义', storage: '待定义', process: '待定义', output: '待定义' },
                    sub.controlType || 'sequence',
                    sub.name || `子模块${index + 1}`,
                    data.level || 1
                );
                
                // 如果需要进一步分解，显示用户交互提示
                if (sub.needsFurtherDecomposition !== false) {
                    html += UserPromptGenerator.generateCanWritePrompt(sub, index, data.level || 1, currentPath.join('_'));
                } else {
                    // 简单模块，显示语句建议
                    if (sub.codeHint) {
                        html += `
                        <div style="background: #d4edda; border: 2px solid #28a745; border-radius: 12px; padding: 16px; margin: 10px 0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <span style="font-size: 20px;">✅</span>
                                <strong style="color: #155724;">此模块足够简单，可以直接编写代码</strong>
                            </div>
                            <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                                <div style="font-weight: bold; color: #3b82f6; font-size: 12px; margin-bottom: 6px;">💡 语句建议</div>
                                <div style="font-size: 13px; color: #1e40af; line-height: 1.6;">${sub.codeHint}</div>
                            </div>
                        </div>
                        `;
                    }
                }
            });
        }
        
        html += `
            </div>
            
            <!-- 控制结构统计 -->
            ${data.subProblems ? IPOCardGenerator.generateControlStructureCard(
                data.subProblems.map(sub => ({
                    type: sub.controlType || 'sequence',
                    name: sub.name || '未命名',
                    description: sub.description || ''
                }))
            ) : ''}
        </div>
        `;
        
        container.innerHTML = html;
        
        // 渲染图表
        await this.renderMermaidCharts(data);
    },
    
    /**
     * 渲染图表 - 使用美观的HTML版本
     */
    async renderMermaidCharts(data) {
        // 渲染分解结构图
        const decompositionContainer = document.getElementById(`decomposition-chart-${data.level}`);
        if (decompositionContainer && data.subProblems) {
            decompositionContainer.innerHTML = FlowchartGenerator.generateBeautifulDecompositionChart(data);
        }
        
        // 渲染控制流图
        const controlFlowContainer = document.getElementById(`control-flow-chart-${data.level}`);
        if (controlFlowContainer && data.subProblems && data.subProblems.length > 1) {
            controlFlowContainer.innerHTML = FlowchartGenerator.generateBeautifulFlowChart(data.subProblems);
        }
    },
    
};


// ==================== 用户交互处理函数 ====================

/**
 * 用户表示可以写出代码
 */
function handleUserCanWrite(uniqueId, index, level) {
    const promptCard = document.getElementById(`prompt-${uniqueId}`);
    if (!promptCard) return;
    
    // 获取模块名称
    const moduleName = promptCard.querySelector('h4')?.textContent || '该模块';
    
    // 显示成功反馈
    promptCard.innerHTML = UserPromptGenerator.generateCanWriteFeedback(moduleName);
    
    // 滚动到代码编辑器
    setTimeout(() => {
        const codeEditor = document.getElementById('code-editor');
        if (codeEditor) {
            codeEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
            codeEditor.focus();
        }
    }, 500);
}

/**
 * 用户需要继续分解
 */
async function handleUserNeedDecompose(uniqueId, index, level, pathStr = '') {
    const promptCard = document.getElementById(`prompt-${uniqueId}`);
    if (!promptCard) return;
    
    // 解析路径
    const parentPath = pathStr ? pathStr.split('_').map(Number) : [index];
    
    // 显示加载状态
    promptCard.innerHTML = UserPromptGenerator.generateDecomposingFeedback();
    
    try {
        // 调用API进行进一步分解
        const response = await fetch('/api/xiaohang/decompose_problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: level + 1,
                subProblemIndex: index
            })
        });
        
        if (!response.ok) throw new Error('分解失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
        }
        
        // 解析JSON
        let jsonStr = null;
        const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            const match = fullText.match(/\{[\s\S]*"parentProblem"[\s\S]*\}/);
            if (match) jsonStr = match[0];
        }
        
        if (jsonStr) {
            const newDecomposition = JSON.parse(jsonStr);
            
            // 创建新的容器显示分解结果
            const newContainer = document.createElement('div');
            newContainer.style.cssText = `
                background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
                border: 2px solid #667eea;
                border-radius: 16px;
                padding: 24px;
                margin-top: 16px;
            `;
            
            promptCard.innerHTML = '';
            promptCard.appendChild(newContainer);
            
            // 渲染新的分解结果（传递路径信息）
            await FrameworkVisualizer.renderFullVisualization(newDecomposition, newContainer, true, parentPath);
        } else {
            // 如果没有JSON，显示原始响应
            promptCard.innerHTML = `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
                    <h5 style="color: #667eea; margin-bottom: 12px;">📝 分解结果</h5>
                    <div class="markdown-body">${marked.parse(fullText)}</div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Decomposition error:', error);
        promptCard.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                border: 2px solid #dc3545;
                border-radius: 16px;
                padding: 24px;
                text-align: center;
            ">
                <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                <h4 style="color: #721c24; margin-bottom: 8px;">分解失败</h4>
                <p style="color: #721c24; font-size: 14px;">请稍后重试</p>
                <button onclick="location.reload()" style="
                    margin-top: 12px;
                    padding: 10px 24px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                ">刷新页面</button>
            </div>
        `;
    }
}

// ==================== 导出模块 ====================
window.IPOCardGenerator = IPOCardGenerator;
window.FlowchartGenerator = FlowchartGenerator;
window.UserPromptGenerator = UserPromptGenerator;
window.FrameworkVisualizer = FrameworkVisualizer;
window.decompositionNavigator = decompositionNavigator;
window.handleUserCanWrite = handleUserCanWrite;
window.handleUserNeedDecompose = handleUserNeedDecompose;
window.getControlStructure = getControlStructure;
window.ControlStructures = ControlStructures;
