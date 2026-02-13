// 航辅导 - 智能编程辅导系统 JavaScript
// ==================== 全局变量 ====================

const KNOWLEDGE_POINTS = [
    '栈', '队列', '数组', '链表', '哈希表', '散列表', '堆', '优先队列',
    '树', '二叉树', '二叉搜索树', 'AVL', '红黑树', 'B树', '字典树', 'Trie',
    '图', 'DFS', 'BFS', '最短路', '最小生成树', '拓扑排序',
    '排序', '查找', '动态规划', '贪心', '回溯', '递归'
];

let selectedTopic = null;
let sessionId = null;
let currentDifficulty = '简单';
let currentModel = 'loopcoder';
let currentLeftType = '题目';
let currentRightType = null;
let monacoEditorReady = false;
let problemContent = '';

// 代码诊断状态 - 用于控制代码优化按钮
let diagnosisHasErrors = true; // 默认有错误，诊断通过后设为false

// 代码提交正确状态 - 用于控制诊断/反例/优化按钮
let codeIsCorrect = false;

// 右侧模块生成锁定状态 - 代码诊断/反例/代码优化/复杂度分析互斥
let isRightModuleGenerating = false;
let currentRightGeneratingType = null;

// 模块生成锁定状态
let isModuleGenerating = false;
let currentGeneratingModule = null;

// 浮动窗口相关变量
let floatingPanelVisible = false;
let floatingPanelMinimized = false;
let floatingPanelMaximized = false;
let preMaximizePosition = null; // 保存最大化前的位置和尺寸
let isDragging = false;
let isResizing = false;
let resizeDirection = '';
let dragOffset = { x: 0, y: 0 };
let initialSize = { width: 0, height: 0 };
let initialPos = { x: 0, y: 0, left: 0, top: 0 };

// 最小化圆球管理
const MAX_BUBBLES = 5;
let minimizedPanels = []; // 存储最小化的面板信息 { id, icon, title, content, position, bubblePosition }
let currentPanelId = null; // 当前显示的面板ID
let draggingBubble = null; // 当前拖动的圆球
let bubbleDragOffset = { x: 0, y: 0 };

// 流式请求管理 - 防止面板内容串台
let activeAbortControllers = new Map(); // panelId -> AbortController
let panelContentReady = new Map(); // panelId -> boolean (内容是否已生成完毕)
let panelStreamBuffers = new Map(); // panelId -> { fullText, type, completed } 每个面板独立的流式缓冲区
let panelIdByType = new Map(); // type(title) -> panelId 记录每个模块类型对应的面板ID

// ==================== 页面初始化 ====================

document.addEventListener('DOMContentLoaded', function() {
    initKnowledgeGrid();
    initMermaid();
});

function initKnowledgeGrid() {
    const grid = document.getElementById('knowledge-grid');
    grid.innerHTML = '';
    
    KNOWLEDGE_POINTS.forEach(point => {
        const btn = document.createElement('button');
        btn.className = 'knowledge-btn';
        btn.textContent = point;
        btn.onclick = () => selectKnowledge(point, btn);
        grid.appendChild(btn);
    });
}

function initMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 15
            },
            themeVariables: {
                fontSize: '14px'
            }
        });
        console.log('Mermaid initialized');
    }
}

// Mermaid图表渲染函数
async function renderMermaidDiagrams(container) {
    if (typeof mermaid === 'undefined') {
        console.warn('Mermaid 库未加载');
        return;
    }
    
    // 查找所有 mermaid 代码块
    const mermaidBlocks = container.querySelectorAll('pre code.language-mermaid');
    
    for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        let code = block.textContent;
        const pre = block.parentElement;
        
        // 预处理Mermaid代码
        code = preprocessMermaidCode(code);
        
        // 创建可视化区域包装器
        const visualSection = document.createElement('div');
        visualSection.className = 'visualization-section';
        
        // 创建标题
        const titleDiv = document.createElement('div');
        titleDiv.className = 'visualization-section-title';
        titleDiv.innerHTML = '📊 可视化拆解';
        visualSection.appendChild(titleDiv);
        
        // 创建响应式Mermaid容器 - 宽度为容器的3/5
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid-responsive-container';
        
        try {
            const id = `mermaid-${Date.now()}-${i}`;
            const { svg } = await mermaid.render(id, code);
            mermaidDiv.innerHTML = svg;
        } catch (error) {
            console.error('Mermaid 渲染错误:', error);
            mermaidDiv.innerHTML = `<p style="color: #e74c3c; margin-bottom: 10px;">⚠️ 图表渲染失败</p>`;
            mermaidDiv.innerHTML += `<pre style="text-align: left; background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;"><code>${code}</code></pre>`;
        }
        
        visualSection.appendChild(mermaidDiv);
        pre.parentNode.replaceChild(visualSection, pre);
    }
    
    // 同时处理直接的 mermaid 类 div
    const mermaidDivs = container.querySelectorAll('.mermaid:not(.mermaid-diagram):not(.mermaid-responsive-container)');
    for (let i = 0; i < mermaidDivs.length; i++) {
        const div = mermaidDivs[i];
        let code = preprocessMermaidCode(div.textContent);
        
        // 创建可视化区域包装器
        const visualSection = document.createElement('div');
        visualSection.className = 'visualization-section';
        
        // 创建标题
        const titleDiv = document.createElement('div');
        titleDiv.className = 'visualization-section-title';
        titleDiv.innerHTML = '📊 可视化拆解';
        visualSection.appendChild(titleDiv);
        
        // 创建响应式Mermaid容器
        const mermaidContainer = document.createElement('div');
        mermaidContainer.className = 'mermaid-responsive-container';
        
        try {
            const id = `mermaid-div-${Date.now()}-${i}`;
            const { svg } = await mermaid.render(id, code);
            mermaidContainer.innerHTML = svg;
        } catch (error) {
            console.error('Mermaid 渲染错误:', error);
            mermaidContainer.innerHTML = `<span style="color: #64748b;">📊 图表加载失败</span>`;
        }
        
        visualSection.appendChild(mermaidContainer);
        div.parentNode.replaceChild(visualSection, div);
    }
}

// 预处理Mermaid代码，修复常见语法问题
function preprocessMermaidCode(code) {
    let processed = code.trim();
    
    // 移除节点文本中的双引号和单引号
    processed = processed.replace(/\[([^\]]*)"([^\]"]*)"\s*\]/g, '[$1$2]');
    processed = processed.replace(/\[([^\]]*)'([^\]']*)'\s*\]/g, '[$1$2]');
    processed = processed.replace(/\{([^\}]*)"([^\}"]*)"([^\}]*)\}/g, '{$1$2$3}');
    processed = processed.replace(/\{([^\}]*)'([^\}']*)'([^\}]*)\}/g, '{$1$2$3}');
    
    // 修复箭头标签中的引号
    processed = processed.replace(/\|([^|]*)"([^|"]*)"\s*\|/g, '|$1$2|');
    processed = processed.replace(/\|([^|]*)'([^|']*)'\s*\|/g, '|$1$2|');
    
    // 移除可能导致问题的特殊字符（中文引号等）
    processed = processed.replace(/[""'']/g, '');
    
    // 确保节点ID不包含特殊字符，将中文节点内容用方括号包裹
    // 例如: A[读取数据] 是正确的格式
    
    return processed;
}


// ==================== 知识点选择 ====================

async function selectKnowledge(point, btn) {
    // 取消之前的选择
    document.querySelectorAll('.knowledge-btn').forEach(b => b.classList.remove('selected'));
    
    // 选中当前
    btn.classList.add('selected');
    selectedTopic = point;
    
    // 初始化会话并进入练习页面
    try {
        const response = await fetch('/api/xiaohang/init_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ topics: [point] })
        });
        
        const data = await response.json();
        if (response.ok) {
            sessionId = data.session_id;
            enterPracticePage();
        } else {
            alert(data.error || '初始化失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请重试');
    }
}

function enterPracticePage() {
    document.getElementById('selection-page').classList.add('hidden');
    document.getElementById('practice-page').classList.add('active');
    
    // 初始化Monaco编辑器
    initMonacoEditor();
    
    // 生成第一道题目
    generateProblem();
}

// ==================== Monaco编辑器 ====================

async function initMonacoEditor() {
    try {
        await MonacoEditorManager.init('monaco-editor-container', {
            language: 'c',
            theme: 'vs',  // 使用白色主题
            fontSize: 14,
            minimap: false,
            glyphMargin: true,
            initialCode: getDefaultCode('c')
        });
        monacoEditorReady = true;
    } catch (error) {
        console.error('Monaco Editor 初始化失败:', error);
        fallbackToTextarea();
    }
}

function getDefaultCode(lang) {
    const templates = {
        c: `#include <stdio.h>

int main() {
    // 在这里编写你的代码
    
    return 0;
}`,
        python: `# 在这里编写你的Python代码

def main():
    pass

if __name__ == "__main__":
    main()`
    };
    return templates[lang] || templates.c;
}

function fallbackToTextarea() {
    const container = document.getElementById('monaco-editor-container');
    container.innerHTML = `<textarea id="code-editor-fallback" style="width:100%;height:100%;background:#fff;color:#333;border:none;padding:15px;font-family:Consolas,monospace;font-size:14px;resize:none;">${getDefaultCode('c')}</textarea>`;
    monacoEditorReady = false;
}

function getEditorCode() {
    if (monacoEditorReady && typeof MonacoEditorManager !== 'undefined') {
        return MonacoEditorManager.getCode();
    }
    const fallback = document.getElementById('code-editor-fallback');
    return fallback ? fallback.value : '';
}

function setEditorCode(code) {
    if (monacoEditorReady && typeof MonacoEditorManager !== 'undefined') {
        MonacoEditorManager.setCode(code);
    } else {
        const fallback = document.getElementById('code-editor-fallback');
        if (fallback) fallback.value = code;
    }
}

function handleLanguageChange(lang) {
    // 先更新Monaco编辑器的语言
    if (monacoEditorReady && typeof MonacoEditorManager !== 'undefined') {
        MonacoEditorManager.setLanguage(lang);
    }
    // 然后设置对应语言的默认代码模板
    const newCode = getDefaultCode(lang);
    setEditorCode(newCode);
    
    // 通知后端语言变更（存入session）
    if (sessionId) {
        fetch('/api/xiaohang/change_language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ language: getBackendLanguage() })
        }).catch(err => console.error('语言切换通知失败:', err));
    }
}

// 获取后端使用的语言标识（c -> C, python -> Python）
function getBackendLanguage() {
    const lang = document.getElementById('language-selector').value;
    const langMap = { 'c': 'C', 'python': 'Python' };
    return langMap[lang] || 'C';
}

function toggleTheme() {
    if (monacoEditorReady && typeof MonacoEditorManager !== 'undefined') {
        MonacoEditorManager.toggleTheme();
    }
}

function clearEditor() {
    const code = getEditorCode().trim();
    if (code && !confirm('确定要清空代码吗？')) return;
    const lang = document.getElementById('language-selector').value;
    setEditorCode(getDefaultCode(lang));
    // 清除诊断标记和重置优化按钮
    if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.clearDiagnosisMarkers) {
        MonacoEditorManager.clearDiagnosisMarkers();
    }
    diagnosisHasErrors = true;
    codeIsCorrect = false;
    // 恢复所有右侧按钮到初始状态
    updateRightButtonsAfterSubmit();
}


// ==================== 题目生成 ====================

async function generateProblem() {
    const display = document.getElementById('left-content-display');
    display.innerHTML = '<p class="loading">正在生成题目...</p>';
    
    // 清除之前的诊断标记
    if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.clearDiagnosisMarkers) {
        MonacoEditorManager.clearDiagnosisMarkers();
    }
    // 重置诊断状态
    diagnosisHasErrors = true;
    codeIsCorrect = false;
    // 恢复所有右侧按钮到初始状态
    updateRightButtonsAfterSubmit();
    
    // 重置左侧按钮状态
    setActiveLeftButton('题目');
    currentLeftType = '题目';
    
    try {
        const response = await fetch('/api/xiaohang/generate_problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('生成题目失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        display.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            display.innerHTML = renderMarkdown(fullText);
        }
        
        problemContent = fullText;
        highlightCode(display);
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">生成题目失败，请重试</p>';
    }
}

// ==================== 左侧内容切换 ====================

// 需要互斥锁定的模块类型
const LOCKABLE_MODULES = ['思路', '伪代码', '框架', '核心语句'];

// 锁定模块按钮
function lockModuleButtons(currentType) {
    isModuleGenerating = true;
    currentGeneratingModule = currentType;
    
    // 禁用所有可锁定模块的按钮
    document.querySelectorAll('.left-toolbar-buttons .toolbar-btn').forEach(btn => {
        const btnType = btn.dataset.type;
        if (LOCKABLE_MODULES.includes(btnType) && btnType !== currentType) {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
}

// 解锁模块按钮
function unlockModuleButtons() {
    isModuleGenerating = false;
    currentGeneratingModule = null;
    
    // 启用所有模块按钮
    document.querySelectorAll('.left-toolbar-buttons .toolbar-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.style.opacity = '';
        btn.style.cursor = '';
    });
}

function showContent(type) {
    // 检查是否有模块正在生成
    if (isModuleGenerating && LOCKABLE_MODULES.includes(type) && type !== currentGeneratingModule) {
        alert(`请等待「${getModuleDisplayName(currentGeneratingModule)}」生成完成后再操作`);
        return;
    }
    
    setActiveLeftButton(type);
    currentLeftType = type;
    
    // 题目描述显示在左侧面板
    if (type === '题目') {
        closeFloatingPanel();
        const display = document.getElementById('left-content-display');
        if (problemContent) {
            display.innerHTML = renderMarkdown(problemContent);
            highlightCode(display);
        } else {
            generateProblem();
        }
        return;
    }
    
    // 其他内容显示在浮动窗口
    const typeConfig = {
        '思路': { icon: '💭', title: '智能审题' },
        '框架': { icon: '🏗️', title: '代码框架' },
        '伪代码': { icon: '📋', title: '代码分析' },
        '核心语句': { icon: '🔑', title: '代码补全' },
        '正确答案': { icon: '✅', title: '正确答案' }
    };
    
    const config = typeConfig[type] || { icon: '📝', title: type };
    
    // 检查该模块是否已经有面板（已生成或正在生成）
    const existingPanelId = panelIdByType.get(config.title);
    const existingPanel = existingPanelId ? minimizedPanels.find(p => p.id === existingPanelId) : null;
    
    if (existingPanel) {
        // 已有该模块的面板，直接恢复显示
        // 先保存当前面板
        if (floatingPanelVisible && currentPanelId !== null && currentPanelId !== existingPanelId) {
            saveCurrentPanelState();
        }
        restoreFromBubble(existingPanelId);
        
        // 如果该面板还在流式生成中，恢复流式写入到DOM
        const buffer = panelStreamBuffers.get(existingPanelId);
        if (buffer && !buffer.completed) {
            // 流还在跑，DOM会由流式循环自动更新（因为currentPanelId已切换回来）
        }
        return;
    }
    
    openFloatingPanel(config.icon, config.title);
    
    // 记录该模块类型对应的面板ID
    panelIdByType.set(config.title, currentPanelId);
    
    if (type === '正确答案') {
        getCorrectAnswerToFloating();
    } else {
        getGuidanceToFloating(type);
    }
}

// 获取模块显示名称
function getModuleDisplayName(type) {
    const names = {
        '思路': '智能审题',
        '框架': '代码框架',
        '伪代码': '代码分析',
        '核心语句': '代码补全'
    };
    return names[type] || type;
}

function setActiveLeftButton(type) {
    document.querySelectorAll('.left-toolbar-buttons .toolbar-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

// 保存当前面板状态到 minimizedPanels
function saveCurrentPanelState() {
    if (currentPanelId === null) return;
    const panel = document.getElementById('floating-panel');
    const content = document.getElementById('floating-panel-content');
    const icon = document.getElementById('floating-panel-icon').textContent;
    const title = document.getElementById('floating-panel-title-text').textContent;
    
    const state = {
        id: currentPanelId,
        icon: icon,
        title: title,
        content: content.innerHTML,
        position: {
            left: panel.style.left,
            top: panel.style.top,
            width: panel.style.width,
            height: panel.style.height
        }
    };
    
    const index = minimizedPanels.findIndex(p => p.id === currentPanelId);
    if (index !== -1) {
        // 保留 bubblePosition
        state.bubblePosition = minimizedPanels[index].bubblePosition;
        minimizedPanels[index] = state;
    }
}

async function getGuidanceToFloating(type) {
    const display = document.getElementById('floating-panel-content');
    display.innerHTML = '<p class="loading">正在生成内容...</p>';
    
    // 记录本次请求对应的面板ID
    const targetPanelId = currentPanelId;
    
    // 初始化该面板的流式缓冲区
    panelStreamBuffers.set(targetPanelId, { fullText: '', type: type, completed: false });
    
    // 设置当前辅导类型（用于追问）
    currentGuidanceType = type;
    
    // 如果是可锁定模块，锁定其他按钮
    if (LOCKABLE_MODULES.includes(type)) {
        lockModuleButtons(type);
    }
    
    try {
        const response = await fetch('/api/xiaohang/get_guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ type })
        });
        
        if (!response.ok) throw new Error('获取内容失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        // 只有当前面板可见时才清空DOM
        if (currentPanelId === targetPanelId) {
            display.innerHTML = '';
        }
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            
            // 更新缓冲区
            const buffer = panelStreamBuffers.get(targetPanelId);
            if (buffer) buffer.fullText = fullText;
            
            // 只有当前显示的面板是目标面板时，才更新DOM
            if (currentPanelId === targetPanelId) {
                if (type === '框架') {
                    // 流式显示框架生成进度，避免长时间loading导致看起来卡死
                    display.innerHTML = '<p class="loading">正在生成代码框架...</p>' +
                        '<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;">' +
                        fullText.substring(Math.max(0, fullText.length - 300)) + '</div>';
                } else {
                    display.innerHTML = renderMarkdown(fullText);
                    highlightCode(display);
                }
            }
        }
        
        // 标记流式完成
        const buffer = panelStreamBuffers.get(targetPanelId);
        if (buffer) buffer.completed = true;
        
        // 只有当前面板可见时才做最终渲染
        if (currentPanelId === targetPanelId) {
            if (type === '框架') {
                await renderFrameworkToFloating(fullText, display);
            } else if (type === '思路') {
                await renderAnalysisContent(fullText, display);
            } else if (type === '伪代码') {
                await renderCodeAnalysisContent(fullText, display);
            } else if (type === '核心语句') {
                display.innerHTML = renderMarkdown(fullText);
                highlightCode(display);
                highlightTodoMarkers(display);
            } else {
                await renderMermaidDiagrams(display);
            }
            showFollowUpInput(display);
        } else {
            // 面板不可见，将最终渲染结果保存到缓冲区的 finalHtml
            // 当面板恢复时会用 fullText 重新渲染
        }
        
        // 同步保存到 minimizedPanels（无论面板是否可见）
        if (currentPanelId === targetPanelId) {
            saveCurrentPanelState();
        } else {
            // 面板已被切走，需要离线渲染并保存
            const tempDiv = document.createElement('div');
            tempDiv.className = 'markdown-body';
            if (type === '框架') {
                tempDiv.innerHTML = '<p>代码框架已生成，点击查看</p>';
            } else {
                tempDiv.innerHTML = renderMarkdown(fullText);
                highlightCode(tempDiv);
            }
            const idx = minimizedPanels.findIndex(p => p.id === targetPanelId);
            if (idx !== -1) {
                minimizedPanels[idx].content = tempDiv.innerHTML;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (currentPanelId === targetPanelId) {
            display.innerHTML = '<p style="color: #e74c3c;">获取内容失败，请重试</p>';
        } else {
            const idx = minimizedPanels.findIndex(p => p.id === targetPanelId);
            if (idx !== -1) {
                minimizedPanels[idx].content = '<p style="color: #e74c3c;">获取内容失败，请重试</p>';
            }
        }
        const buffer = panelStreamBuffers.get(targetPanelId);
        if (buffer) buffer.completed = true;
    } finally {
        if (LOCKABLE_MODULES.includes(type)) {
            unlockModuleButtons();
        }
    }
}

// 渲染智能审题内容 - 带背景区分
async function renderAnalysisContent(text, container) {
    let html = renderMarkdown(text);
    container.innerHTML = html;
    highlightCode(container);
    
    // 应用背景区分
    applyAnalysisSections(container);
    
    // 渲染Mermaid图表
    await renderMermaidDiagrams(container);
}

// 渲染代码分析内容 - 带背景区分
async function renderCodeAnalysisContent(text, container) {
    let html = renderMarkdown(text);
    container.innerHTML = html;
    highlightCode(container);
    
    // 应用背景区分
    applyCodeAnalysisSections(container);
    
    // 渲染Mermaid图表
    await renderMermaidDiagrams(container);
}

// 包装特定部分的辅助函数（保留用于兼容）
function wrapSection(html, keywords, sectionClass, titleText) {
    return html; // 现在使用DOM操作方式，此函数保留但不做处理
}

// 后处理内容 - 为不同模块添加背景区分（基于DOM操作）
function postProcessContent(container, type) {
    // 根据类型应用不同的样式
    if (type === '思路') {
        applyAnalysisSections(container);
    } else if (type === '伪代码') {
        applyCodeAnalysisSections(container);
    }
}

// 应用智能审题模块的背景区分
function applyAnalysisSections(container) {
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headers.forEach(header => {
        const text = header.textContent.toLowerCase();
        let sectionClass = '';
        let titleIcon = '';
        
        if (text.includes('分析') || text.includes('审题') || text.includes('理解')) {
            sectionClass = 'analysis-section';
            titleIcon = '🔍';
        } else if (text.includes('拆解') || text.includes('分解') || text.includes('子问题')) {
            sectionClass = 'decompose-section';
            titleIcon = '🧩';
        } else if (text.includes('ispo') || text.includes('ipo') || text.includes('输入') || text.includes('输出') || text.includes('处理') || text.includes('存储')) {
            sectionClass = 'ipo-section';
            titleIcon = '📊';
        } else if (text.includes('可视化') || text.includes('流程图') || text.includes('图解')) {
            sectionClass = 'visualization-section';
            titleIcon = '📈';
        }
        
        if (sectionClass) {
            wrapHeaderSection(header, sectionClass, titleIcon);
        }
    });
}

// 应用代码分析模块的背景区分
function applyCodeAnalysisSections(container) {
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headers.forEach(header => {
        const text = header.textContent.toLowerCase();
        let sectionClass = '';
        let titleIcon = '';
        
        if (text.includes('伪代码') || text.includes('算法') || text.includes('步骤')) {
            sectionClass = 'pseudocode-section';
            titleIcon = '📝';
        } else if (text.includes('解释') || text.includes('说明') || text.includes('详解')) {
            sectionClass = 'pseudocode-explain-section';
            titleIcon = '💡';
        }
        
        if (sectionClass) {
            wrapHeaderSection(header, sectionClass, titleIcon);
        }
    });
}

// 包装标题及其后续内容
function wrapHeaderSection(header, sectionClass, titleIcon) {
    // 获取标题级别
    const level = parseInt(header.tagName.charAt(1));
    
    // 收集该标题后的所有内容，直到遇到同级或更高级标题
    const elements = [];
    let sibling = header.nextElementSibling;
    
    while (sibling) {
        // 检查是否是同级或更高级标题
        if (sibling.tagName && sibling.tagName.match(/^H[1-6]$/i)) {
            const siblingLevel = parseInt(sibling.tagName.charAt(1));
            if (siblingLevel <= level) {
                break;
            }
        }
        elements.push(sibling);
        sibling = sibling.nextElementSibling;
    }
    
    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = sectionClass;
    
    // 添加图标到标题
    if (titleIcon && !header.textContent.includes(titleIcon)) {
        header.innerHTML = titleIcon + ' ' + header.innerHTML;
    }
    
    // 插入包装器
    header.parentNode.insertBefore(wrapper, header);
    wrapper.appendChild(header);
    
    // 移动后续元素到包装器
    elements.forEach(el => {
        wrapper.appendChild(el);
    });
}

async function getCorrectAnswerToFloating() {
    const display = document.getElementById('floating-panel-content');
    display.innerHTML = '<p class="loading">正在获取正确答案...</p>';
    
    // 记录本次请求对应的面板ID
    const targetPanelId = currentPanelId;
    
    // 初始化缓冲区
    panelStreamBuffers.set(targetPanelId, { fullText: '', type: '正确答案', completed: false });
    
    // 设置当前辅导类型（用于追问）
    currentGuidanceType = '正确答案';
    
    try {
        const response = await fetch('/api/xiaohang/get_correct_answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('获取答案失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        if (currentPanelId === targetPanelId) {
            display.innerHTML = '';
        }
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            
            const buffer = panelStreamBuffers.get(targetPanelId);
            if (buffer) buffer.fullText = fullText;
            
            if (currentPanelId === targetPanelId) {
                display.innerHTML = renderMarkdown(fullText);
                highlightCode(display);
            }
        }
        
        const buffer = panelStreamBuffers.get(targetPanelId);
        if (buffer) buffer.completed = true;
        
        if (currentPanelId === targetPanelId) {
            addAnswerCopyButton(display, fullText);
            showFollowUpInput(display);
            saveCurrentPanelState();
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderMarkdown(fullText);
            highlightCode(tempDiv);
            const idx = minimizedPanels.findIndex(p => p.id === targetPanelId);
            if (idx !== -1) {
                minimizedPanels[idx].content = tempDiv.innerHTML;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (currentPanelId === targetPanelId) {
            display.innerHTML = '<p style="color: #e74c3c;">获取答案失败，请重试</p>';
        }
        const buffer = panelStreamBuffers.get(targetPanelId);
        if (buffer) buffer.completed = true;
    }
}

// 为正确答案添加复制按钮
function addAnswerCopyButton(container, fullText) {
    // 创建答案区域包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'answer-section';
    wrapper.style.position = 'relative';
    
    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'answer-copy-btn';
    copyBtn.innerHTML = '📋 复制完整代码';
    copyBtn.onclick = function() {
        // 提取所有代码块的内容
        const codeBlocks = container.querySelectorAll('pre code');
        let allCode = '';
        codeBlocks.forEach((block, index) => {
            if (index > 0) allCode += '\n\n';
            allCode += block.textContent;
        });
        
        // 如果没有代码块，复制全部文本
        if (!allCode) {
            allCode = fullText;
        }
        
        copyToClipboard(allCode, copyBtn, '📋 复制完整代码', '✅ 已复制');
    };
    
    // 将现有内容移入包装器
    while (container.firstChild) {
        wrapper.appendChild(container.firstChild);
    }
    
    // 添加复制按钮和包装器
    wrapper.insertBefore(copyBtn, wrapper.firstChild);
    container.appendChild(wrapper);
}

// 保留原有函数用于左侧面板（仅题目描述使用）
async function getGuidance(type) {
    const display = document.getElementById('left-content-display');
    display.innerHTML = '<p class="loading">正在生成内容...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/get_guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ type })
        });
        
        if (!response.ok) throw new Error('获取内容失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        display.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            
            if (type === '框架') {
                display.innerHTML = '<p class="loading">正在生成代码框架...</p>' +
                    '<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;">' +
                    fullText.substring(Math.max(0, fullText.length - 300)) + '</div>';
            } else {
                display.innerHTML = renderMarkdown(fullText);
                highlightCode(display);
            }
        }
        
        if (type === '框架') {
            await renderFramework(fullText, display);
        }
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">获取内容失败，请重试</p>';
    }
}

async function getCorrectAnswer() {
    const display = document.getElementById('left-content-display');
    display.innerHTML = '<p class="loading">正在获取正确答案...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/get_correct_answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('获取答案失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        display.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            display.innerHTML = renderMarkdown(fullText);
            highlightCode(display);
        }
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">获取答案失败，请重试</p>';
    }
}


// ==================== 右侧内容切换 ====================

// 右侧可锁定的模块类型
const RIGHT_LOCKABLE_MODULES = ['level1', '反例', 'level3', '复杂度'];

// 锁定右侧模块按钮
function lockRightModuleButtons(currentType) {
    isRightModuleGenerating = true;
    currentRightGeneratingType = currentType;
    
    document.querySelectorAll('.right-toolbar-left .toolbar-btn').forEach(btn => {
        const btnType = btn.dataset.type;
        if (RIGHT_LOCKABLE_MODULES.includes(btnType) && btnType !== currentType) {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
        }
    });
}

// 解锁右侧模块按钮（恢复到正确的状态）
function unlockRightModuleButtons() {
    isRightModuleGenerating = false;
    currentRightGeneratingType = null;
    
    document.querySelectorAll('.right-toolbar-left .toolbar-btn').forEach(btn => {
        const btnType = btn.dataset.type;
        if (!RIGHT_LOCKABLE_MODULES.includes(btnType)) return;
        
        // 代码诊断和反例：如果代码已判定正确则保持禁用
        if ((btnType === 'level1' || btnType === '反例') && codeIsCorrect) {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
            return;
        }
        
        // 代码优化：需要代码正确才能使用
        if (btnType === 'level3') {
            if (codeIsCorrect) {
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.style.pointerEvents = '';
            } else {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.style.pointerEvents = 'none';
            }
            return;
        }
        
        // 复杂度分析：始终可用
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.pointerEvents = '';
    });
}

// 更新右侧按钮状态（代码提交正确/错误后调用）
function updateRightButtonsAfterSubmit() {
    const diagBtn = document.querySelector('.right-toolbar-left .toolbar-btn[data-type="level1"]');
    const counterBtn = document.querySelector('.right-toolbar-left .toolbar-btn[data-type="反例"]');
    const optimizeBtn = document.getElementById('optimize-btn');
    
    if (codeIsCorrect) {
        // 禁用代码诊断和反例
        [diagBtn, counterBtn].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.style.pointerEvents = 'none';
            }
        });
        // 开放代码优化
        if (optimizeBtn) {
            optimizeBtn.disabled = false;
            optimizeBtn.classList.remove('disabled');
            optimizeBtn.style.opacity = '';
            optimizeBtn.style.cursor = '';
            optimizeBtn.style.pointerEvents = '';
        }
    } else {
        // 恢复代码诊断和反例
        [diagBtn, counterBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.style.pointerEvents = '';
            }
        });
        // 代码优化保持禁用（需要诊断通过）
        if (optimizeBtn) {
            optimizeBtn.disabled = true;
            optimizeBtn.classList.add('disabled');
            optimizeBtn.style.opacity = '0.5';
            optimizeBtn.style.cursor = 'not-allowed';
            optimizeBtn.style.pointerEvents = 'none';
        }
    }
}

function showRightContent(type) {
    // 检查右侧模块是否正在生成
    if (isRightModuleGenerating && RIGHT_LOCKABLE_MODULES.includes(type) && type !== currentRightGeneratingType) {
        const typeNames = { 'level1': '代码诊断', '反例': '反例', 'level3': '代码优化', '复杂度': '复杂度分析' };
        alert(`请等待「${typeNames[currentRightGeneratingType] || currentRightGeneratingType}」生成完成后再操作`);
        return;
    }
    
    // 代码正确后，诊断和反例不可用
    if ((type === 'level1' || type === '反例') && codeIsCorrect) {
        alert('代码已判定正确，无需使用此功能');
        return;
    }
    
    // 代码优化需要代码正确才能使用
    if (type === 'level3' && !codeIsCorrect) {
        alert('请先提交代码并获得正确判定后，才能使用代码优化功能');
        return;
    }
    
    setActiveRightButton(type);
    currentRightType = type;
    
    if (type === 'level1') {
        getHint(1);
    } else if (type === 'level3') {
        getHint(3);
    } else if (type === '反例') {
        generateCounterexample();
    } else if (type === '复杂度') {
        analyzeComplexity();
    }
}

function setActiveRightButton(type) {
    document.querySelectorAll('.right-toolbar-left .toolbar-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

async function getHint(level) {
    const code = getEditorCode().trim();
    if (!code || code === getDefaultCode('c').trim() || code === getDefaultCode('python').trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const display = document.getElementById('right-content-display');
    const levelNames = { 1: '代码诊断', 3: '代码优化' };
    display.innerHTML = `<p class="loading">正在生成${levelNames[level] || 'Level ' + level}...</p>`;
    
    // 锁定右侧其他按钮
    const lockType = level === 1 ? 'level1' : 'level3';
    lockRightModuleButtons(lockType);
    
    try {
        const response = await fetch('/api/xiaohang/get_hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ level, code })
        });
        
        if (!response.ok) throw new Error('获取提示失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        display.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            display.innerHTML = renderMarkdown(fullText);
            highlightCode(display);
        }
        
        // 如果是代码诊断(level1)，检查是否有错误，控制代码优化按钮状态
        if (level === 1) {
            updateOptimizeButtonState(fullText);
            applyDiagnosisToEditor(fullText);
            // 隐藏JSON标记块，只显示诊断报告
            const displayText = stripDiagnosisJson(fullText);
            display.innerHTML = renderMarkdown(displayText);
            highlightCode(display);
        }
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">获取提示失败，请重试</p>';
    } finally {
        unlockRightModuleButtons();
    }
}

// 根据诊断结果更新代码优化按钮状态
function updateOptimizeButtonState(diagnosisText) {
    const optimizeBtn = document.getElementById('optimize-btn');
    if (!optimizeBtn) return;
    
    // 检查四个维度是否都是"未发现问题"
    const errorSections = ['语法错误', '运行时错误', '逻辑错误', '语义错误'];
    let allClear = true;
    
    for (const section of errorSections) {
        // 查找该维度的内容区域，检查是否包含"未发现问题"
        const sectionIndex = diagnosisText.indexOf(section);
        if (sectionIndex === -1) {
            // 如果找不到该维度，保守认为有错误
            allClear = false;
            break;
        }
        // 获取该维度到下一个维度之间的文本
        let nextSectionIndex = diagnosisText.length;
        for (const next of errorSections) {
            const idx = diagnosisText.indexOf(next, sectionIndex + section.length);
            if (idx !== -1 && idx < nextSectionIndex) {
                nextSectionIndex = idx;
            }
        }
        // 也检查"思考问题"标记
        const thinkIdx = diagnosisText.indexOf('思考问题', sectionIndex + section.length);
        if (thinkIdx !== -1 && thinkIdx < nextSectionIndex) {
            nextSectionIndex = thinkIdx;
        }
        
        const sectionContent = diagnosisText.substring(sectionIndex, nextSectionIndex);
        if (!sectionContent.includes('未发现问题')) {
            allClear = false;
            break;
        }
    }
    
    diagnosisHasErrors = !allClear;
    
    if (allClear) {
        optimizeBtn.classList.remove('disabled');
        optimizeBtn.style.opacity = '';
        optimizeBtn.style.cursor = '';
        optimizeBtn.style.pointerEvents = '';
    } else {
        optimizeBtn.classList.add('disabled');
        optimizeBtn.style.opacity = '0.5';
        optimizeBtn.style.cursor = 'not-allowed';
        optimizeBtn.style.pointerEvents = 'none';
    }
}

// 从诊断结果中提取JSON标记并应用到编辑器
function applyDiagnosisToEditor(diagnosisText) {
    // 先清除之前的诊断标记
    if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.clearDiagnosisMarkers) {
        MonacoEditorManager.clearDiagnosisMarkers();
    }
    
    let jsonStr = null;
    
    // 格式1: ```diagnosis-markers\n...\n```
    const match1 = diagnosisText.match(/```diagnosis-markers\s*\n([\s\S]*?)\n\s*```/);
    if (match1) jsonStr = match1[1].trim();
    
    // 格式2: ```diagnosis-markers ... ``` (无换行)
    if (!jsonStr) {
        const match2 = diagnosisText.match(/```diagnosis-markers\s*([\s\S]*?)```/);
        if (match2) jsonStr = match2[1].trim();
    }
    
    // 格式3: 最后一个 ```json ... ``` 块
    if (!jsonStr) {
        const jsonRegex = /```json\s*\n([\s\S]*?)\n\s*```/g;
        let lastMatch = null;
        let m;
        while ((m = jsonRegex.exec(diagnosisText)) !== null) {
            lastMatch = m;
        }
        if (lastMatch) jsonStr = lastMatch[1].trim();
    }
    
    // 格式4: 直接找包含type字段的JSON数组（兜底）
    if (!jsonStr) {
        const match4 = diagnosisText.match(/\[\s*\{[\s\S]*?"type"\s*:\s*"(syntax|runtime|logic|semantic)"[\s\S]*?\}\s*\]/);
        if (match4) jsonStr = match4[0];
    }
    
    if (!jsonStr) {
        console.log('诊断结果中未找到JSON标记数据');
        return;
    }
    
    try {
        const markers = JSON.parse(jsonStr);
        
        if (!Array.isArray(markers) || markers.length === 0) {
            console.log('诊断结果：无错误标记');
            return;
        }
        
        // 兼容两种字段名: startLine/endLine 或 line/endLine
        const validMarkers = markers.filter(m => {
            const lineNum = m.startLine || m.line;
            return m && typeof lineNum === 'number' && lineNum > 0 && m.type && m.message;
        }).map(m => ({
            startLine: m.startLine || m.line,
            endLine: m.endLine || m.startLine || m.line,
            type: m.type,
            message: m.message
        }));
        
        if (validMarkers.length > 0 && typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.setDiagnosisMarkers) {
            MonacoEditorManager.setDiagnosisMarkers(validMarkers);
            console.log(`已在编辑器中标记 ${validMarkers.length} 个诊断问题`);
        }
        
    } catch (e) {
        console.error('解析诊断JSON标记失败:', e, 'JSON内容:', jsonStr);
    }
}

// 从诊断文本中移除JSON标记块（不展示给学生）
function stripDiagnosisJson(text) {
    // 移除 ```diagnosis-markers ... ``` 块
    let result = text.replace(/```diagnosis-markers[\s\S]*?```/g, '');
    
    // 也移除最后一个 ```json ... ``` 块（如果包含诊断标记）
    const lastJsonStart = result.lastIndexOf('```json');
    if (lastJsonStart !== -1) {
        const lastJsonEnd = result.indexOf('```', lastJsonStart + 7);
        if (lastJsonEnd !== -1) {
            const jsonContent = result.substring(lastJsonStart, lastJsonEnd + 3);
            if (jsonContent.includes('"type"') && (jsonContent.includes('"syntax"') || jsonContent.includes('"runtime"') || jsonContent.includes('"logic"') || jsonContent.includes('"semantic"'))) {
                const before = result.substring(0, lastJsonStart).replace(/\n+$/, '');
                const after = result.substring(lastJsonEnd + 3).replace(/^\n+/, '');
                result = before + (after ? '\n' + after : '');
            }
        }
    }
    
    return result.replace(/\n{3,}/g, '\n\n');
}

async function generateCounterexample() {
    const code = getEditorCode().trim();
    if (!code || code === getDefaultCode('c').trim() || code === getDefaultCode('python').trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const display = document.getElementById('right-content-display');
    display.innerHTML = '<p class="loading">正在构造反例...</p>';
    
    lockRightModuleButtons('反例');
    
    try {
        const response = await fetch('/api/xiaohang/generate_counterexample', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) throw new Error('生成反例失败');
        
        await streamResponse(response, display);
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">生成反例失败，请重试</p>';
    } finally {
        unlockRightModuleButtons();
    }
}

async function analyzeComplexity() {
    const code = getEditorCode().trim();
    if (!code || code === getDefaultCode('c').trim() || code === getDefaultCode('python').trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const display = document.getElementById('right-content-display');
    display.innerHTML = '<p class="loading">正在分析复杂度...</p>';
    
    lockRightModuleButtons('复杂度');
    
    try {
        const response = await fetch('/api/xiaohang/analyze_complexity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) throw new Error('分析失败');
        
        await streamResponse(response, display);
        renderMath(display);
        applyComplexityReportStyle(display);
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c;">分析失败，请重试</p>';
    } finally {
        unlockRightModuleButtons();
    }
}

// 复杂度分析报告可视化增强
function applyComplexityReportStyle(container) {
    const headers = container.querySelectorAll('h2, h3');
    
    // 定义各节的配置
    const sectionConfigs = [
        { keywords: ['代码结构分析', '代码结构'], cls: 'structure', icon: '🔍' },
        { keywords: ['时间复杂度'], cls: 'time', icon: '⏱️' },
        { keywords: ['空间复杂度'], cls: 'space', icon: '💾' },
        { keywords: ['题目要求对比', '题目要求'], cls: 'compare', icon: '📊' }
    ];
    
    // 找到报告标题 (h2)
    let reportTitle = null;
    headers.forEach(h => {
        if (h.tagName === 'H2' && h.textContent.includes('复杂度分析报告')) {
            reportTitle = h;
        }
    });
    
    if (!reportTitle) return;
    
    // 创建报告容器
    const reportDiv = document.createElement('div');
    reportDiv.className = 'complexity-report';
    
    // 创建报告头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'complexity-report-header';
    headerDiv.textContent = '⏱️ 复杂度分析报告';
    reportDiv.appendChild(headerDiv);
    
    // 收集所有 h3 节
    const h3List = [];
    headers.forEach(h => {
        if (h.tagName === 'H3') {
            h3List.push(h);
        }
    });
    
    // 为每个 h3 节创建卡片
    h3List.forEach(h3 => {
        const text = h3.textContent;
        let config = null;
        for (const cfg of sectionConfigs) {
            if (cfg.keywords.some(kw => text.includes(kw))) {
                config = cfg;
                break;
            }
        }
        if (!config) return;
        
        // 收集 h3 后面的内容直到下一个 h2/h3
        const contentElements = [];
        let sibling = h3.nextElementSibling;
        while (sibling) {
            if (sibling.tagName && /^H[23]$/i.test(sibling.tagName)) break;
            contentElements.push(sibling);
            sibling = sibling.nextElementSibling;
        }
        
        // 创建卡片
        const section = document.createElement('div');
        section.className = `complexity-section ${config.cls}`;
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'complexity-section-header';
        sectionHeader.innerHTML = `${config.icon} ${text.replace(/^\d+\.\s*/, '')}`;
        section.appendChild(sectionHeader);
        
        const sectionBody = document.createElement('div');
        sectionBody.className = 'complexity-section-body';
        contentElements.forEach(el => {
            sectionBody.appendChild(el.cloneNode(true));
        });
        section.appendChild(sectionBody);
        
        reportDiv.appendChild(section);
    });
    
    // 替换原始内容
    // 移除从 reportTitle 开始的所有原始元素
    const elementsToRemove = [reportTitle];
    let next = reportTitle.nextElementSibling;
    while (next) {
        elementsToRemove.push(next);
        next = next.nextElementSibling;
    }
    
    elementsToRemove.forEach(el => el.remove());
    container.appendChild(reportDiv);
    
    // 重新渲染数学公式
    renderMath(container);
}

async function streamResponse(response, display) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    
    display.innerHTML = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value);
        display.innerHTML = renderMarkdown(fullText);
        highlightCode(display);
    }
}


// ==================== 代码提交 ====================

async function submitCode() {
    const code = getEditorCode().trim();
    if (!code || code === getDefaultCode('c').trim() || code === getDefaultCode('python').trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const display = document.getElementById('right-content-display');
    display.innerHTML = '<p class="loading">正在判定中...</p>';
    
    // 清除右侧按钮激活状态
    document.querySelectorAll('.right-toolbar-left .toolbar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    try {
        const response = await fetch('/api/xiaohang/submit_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) throw new Error('提交失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        display.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
            display.innerHTML = renderSubmitResult(fullText);
        }
        
        // 最终渲染
        display.innerHTML = renderSubmitResult(fullText);
        checkAndUpdateDifficulty(fullText);
        
        // 判断是否正确 — 与后端逻辑一致
        const trimmed = fullText.trim();
        const isCorrect = trimmed.includes('✅') && trimmed.includes('正确') && !trimmed.includes('部分正确');
        codeIsCorrect = isCorrect;
        
        // 更新右侧按钮状态
        updateRightButtonsAfterSubmit();
        
    } catch (error) {
        console.error('Error:', error);
        display.innerHTML = '<p style="color: #e74c3c; text-align: center;">提交失败，请重试</p>';
    }
}

// 渲染提交代码的判定结果 - 可视化卡片样式
function renderSubmitResult(text) {
    const trimmed = text.trim();
    let icon = '⏳';
    let title = '判定中...';
    let bgGradient = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
    let borderColor = '#93c5fd';
    let titleColor = '#1e40af';
    let iconBg = 'rgba(59, 130, 246, 0.1)';

    if (trimmed.includes('✅') && trimmed.includes('正确') && !trimmed.includes('部分正确')) {
        icon = '✅';
        title = '完全正确';
        bgGradient = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        borderColor = '#86efac';
        titleColor = '#166534';
        iconBg = 'rgba(34, 197, 94, 0.1)';
    } else if (trimmed.includes('⚠️') || trimmed.includes('部分正确')) {
        icon = '⚠️';
        title = '部分正确';
        bgGradient = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
        borderColor = '#fcd34d';
        titleColor = '#92400e';
        iconBg = 'rgba(245, 158, 11, 0.1)';
    } else if (trimmed.includes('❌') || trimmed.includes('错误')) {
        icon = '❌';
        title = '不正确';
        bgGradient = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
        borderColor = '#fca5a5';
        titleColor = '#991b1b';
        iconBg = 'rgba(239, 68, 68, 0.1)';
    }

    // 提取详细说明（去掉emoji和"正确"/"错误"等关键词后的内容）
    let detail = trimmed.replace(/[✅⚠️❌]/g, '').trim();

    return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:160px;padding:24px;">
        <div style="background:${bgGradient};border:2px solid ${borderColor};border-radius:16px;padding:32px 40px;text-align:center;max-width:480px;width:100%;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
            <div style="width:64px;height:64px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">${icon}</div>
            <div style="font-size:22px;font-weight:700;color:${titleColor};margin-bottom:8px;">${title}</div>
            <div style="font-size:14px;color:#64748b;line-height:1.6;">${detail}</div>
        </div>
    </div>`;
}



function checkAndUpdateDifficulty(text) {
    const selector = document.getElementById('difficulty-selector');
    
    if (text.includes('恭喜！你已掌握简单难度') || text.includes('现在进入中等难度')) {
        currentDifficulty = '中等';
    } else if (text.includes('太棒了！你已掌握中等难度') || text.includes('现在挑战困难难度')) {
        currentDifficulty = '困难';
    }
    
    if (selector) {
        selector.value = currentDifficulty;
        selector.className = 'difficulty-selector ' + currentDifficulty;
    }
}


// ==================== 难度切换 ====================

async function onDifficultyChange(newDifficulty) {
    if (newDifficulty === currentDifficulty) return;
    
    try {
        const response = await fetch('/api/xiaohang/change_difficulty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ difficulty: newDifficulty })
        });
        
        if (!response.ok) throw new Error('切换难度失败');
        
        currentDifficulty = newDifficulty;
        const selector = document.getElementById('difficulty-selector');
        selector.className = 'difficulty-selector ' + newDifficulty;
        
        // 清空编辑器并生成新题目
        const lang = document.getElementById('language-selector').value;
        setEditorCode(getDefaultCode(lang));
        
        // 清空右侧内容
        document.getElementById('right-content-display').innerHTML = 
            '<p style="color: #8899aa; text-align: center;">点击上方按钮获取提示或分析结果</p>';
        
        generateProblem();
        
    } catch (error) {
        console.error('Error:', error);
        alert('切换难度失败，请重试');
        // 恢复选择器
        const selector = document.getElementById('difficulty-selector');
        selector.value = currentDifficulty;
        selector.className = 'difficulty-selector ' + currentDifficulty;
    }
}

// ==================== 模型切换 ====================

async function onModelChange(newModel) {
    if (newModel === currentModel) return;
    
    try {
        const response = await fetch('/api/xiaohang/change_model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ model: newModel })
        });
        
        if (!response.ok) throw new Error('切换模型失败');
        
        currentModel = newModel;
        const selector = document.getElementById('model-selector');
        selector.className = 'model-selector ' + newModel;
        
    } catch (error) {
        console.error('Error:', error);
        alert('切换模型失败，请重试');
        const selector = document.getElementById('model-selector');
        selector.value = currentModel;
        selector.className = 'model-selector ' + currentModel;
    }
}

// ==================== 历史记录 ====================

let historyCurrentPage = 1;
let historyTotalPages = 1;
let historyTopicFilter = '';

function showHistoryRecords() {
    historyCurrentPage = 1;
    historyTopicFilter = '';

    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:1000;';

    modal.innerHTML = `
        <div style="background:#fff;border-radius:15px;width:900px;max-width:95%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="color:#2563EB;margin:0;font-size:18px;">📋 答题历史记录</h3>
                <div style="display:flex;align-items:center;gap:10px;">
                    <select id="history-topic-filter" onchange="filterHistoryByTopic(this.value)" style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                        <option value="">全部知识点</option>
                    </select>
                    <button onclick="closeHistoryModal()" style="background:none;border:none;color:#999;font-size:24px;cursor:pointer;line-height:1;">&times;</button>
                </div>
            </div>
            <div id="history-content" style="flex:1;overflow-y:auto;padding:16px 20px;">
                <p style="text-align:center;color:#888;padding:40px;">加载中...</p>
            </div>
            <div id="history-pagination" style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:center;align-items:center;gap:10px;"></div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeHistoryModal(); });

    const topicSelect = document.getElementById('history-topic-filter');
    KNOWLEDGE_POINTS.forEach(function(kp) {
        const opt = document.createElement('option');
        opt.value = kp; opt.textContent = kp;
        topicSelect.appendChild(opt);
    });

    loadHistoryRecords();
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.remove();
}

function filterHistoryByTopic(topic) {
    historyTopicFilter = topic;
    historyCurrentPage = 1;
    loadHistoryRecords();
}

async function loadHistoryRecords() {
    const content = document.getElementById('history-content');
    if (!content) return;
    content.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">加载中...</p>';

    try {
        let url = '/api/records/history?page=' + historyCurrentPage + '&per_page=10';
        if (historyTopicFilter) url += '&topic=' + encodeURIComponent(historyTopicFilter);

        const resp = await fetch(url, { credentials: 'include' });
        const data = await resp.json();
        historyTotalPages = data.pages || 1;

        if (!data.records || data.records.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;"><div style="font-size:48px;margin-bottom:16px;">📝</div><p style="font-size:16px;margin-bottom:8px;">暂无答题记录</p><p style="font-size:13px;">提交代码后，答题记录会自动保存在这里</p></div>';
            document.getElementById('history-pagination').innerHTML = '';
            return;
        }

        let html = '';
        data.records.forEach(function(r) {
            const statusIcon = r.is_correct ? '✅' : '❌';
            const statusColor = r.is_correct ? '#27ae60' : '#e74c3c';
            const statusText = r.is_correct ? '正确' : '错误';
            const diffColors = { '简单': '#27ae60', '中等': '#f39c12', '困难': '#e74c3c' };
            const diffColor = diffColors[r.difficulty] || '#888';
            let problemSummary = (r.problem_text || '').replace(/[#*`\n]/g, ' ').trim();
            if (problemSummary.length > 80) problemSummary = problemSummary.substring(0, 80) + '...';

            const codeEscaped = escapeHtmlForHistory(r.submitted_code || '无');
            const problemHtml = renderMarkdown(r.problem_text || '无');
            const diagnosisHtml = renderMarkdown(r.diagnosis_result || '无');

            html += '<div style="border:1px solid #eee;border-radius:10px;margin-bottom:12px;overflow:hidden;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.1)\'" onmouseout="this.style.boxShadow=\'none\'">';
            html += '<div style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="toggleHistoryDetail(' + r.id + ')">';
            html += '<div style="flex:1;min-width:0;">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
            html += '<span style="font-size:16px;">' + statusIcon + '</span>';
            html += '<span style="color:' + statusColor + ';font-weight:600;font-size:13px;">' + statusText + '</span>';
            html += '<span style="background:' + diffColor + ';color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">' + (r.difficulty || '未知') + '</span>';
            html += '<span style="background:#f0f0f0;color:#666;padding:2px 8px;border-radius:4px;font-size:11px;">' + (r.topic || '未分类') + '</span>';
            html += '<span style="background:#e8f4ff;color:#2563EB;padding:2px 8px;border-radius:4px;font-size:11px;">' + (r.language || 'C') + '</span>';
            html += '</div>';
            html += '<div style="color:#555;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtmlForHistory(problemSummary) + '</div>';
            html += '</div>';
            html += '<div style="color:#aaa;font-size:12px;white-space:nowrap;margin-left:12px;">' + r.created_at + '</div>';
            html += '</div>';
            html += '<div id="history-detail-' + r.id + '" style="display:none;border-top:1px solid #f0f0f0;padding:16px;background:#fafafa;">';
            html += '<div style="margin-bottom:12px;"><div style="font-weight:600;color:#333;margin-bottom:6px;font-size:13px;">📄 题目内容</div><div class="markdown-body" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #eee;font-size:13px;max-height:200px;overflow-y:auto;">' + problemHtml + '</div></div>';
            html += '<div style="margin-bottom:12px;"><div style="font-weight:600;color:#333;margin-bottom:6px;font-size:13px;">💻 提交代码</div><pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;max-height:250px;overflow-y:auto;margin:0;"><code>' + codeEscaped + '</code></pre></div>';
            html += '<div><div style="font-weight:600;color:#333;margin-bottom:6px;font-size:13px;">📊 诊断结果</div><div class="markdown-body" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #eee;font-size:13px;max-height:200px;overflow-y:auto;">' + diagnosisHtml + '</div></div>';
            html += '</div></div>';
        });

        content.innerHTML = html;
        renderHistoryPagination(data.page, data.pages, data.total);

    } catch (err) {
        console.error('加载历史记录失败:', err);
        content.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">加载失败，请重试</p>';
    }
}

function toggleHistoryDetail(id) {
    const detail = document.getElementById('history-detail-' + id);
    if (detail) {
        detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        if (detail.style.display === 'block') highlightCode(detail);
    }
}

function escapeHtmlForHistory(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderHistoryPagination(current, total, totalRecords) {
    const container = document.getElementById('history-pagination');
    if (!container) return;
    if (total <= 1) {
        container.innerHTML = '<span style="color:#999;font-size:12px;">共 ' + totalRecords + ' 条记录</span>';
        return;
    }
    let html = '<span style="color:#999;font-size:12px;margin-right:10px;">共 ' + totalRecords + ' 条</span>';
    if (current > 1) {
        html += '<button onclick="goHistoryPage(' + (current - 1) + ')" style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">上一页</button>';
    }
    html += '<span style="font-size:13px;color:#555;margin:0 8px;">' + current + ' / ' + total + '</span>';
    if (current < total) {
        html += '<button onclick="goHistoryPage(' + (current + 1) + ')" style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">下一页</button>';
    }
    container.innerHTML = html;
}

function goHistoryPage(page) {
    if (page < 1 || page > historyTotalPages) return;
    historyCurrentPage = page;
    loadHistoryRecords();
}

// ==================== 知识点总结 ====================

function showKnowledgeSummary() {
    const modal = document.createElement('div');
    modal.id = 'summary-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center;
        align-items: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: #1a2a4a; border-radius: 15px; width: 600px; max-width: 90%; max-height: 80vh; display: flex; flex-direction: column; border: 1px solid rgba(79, 172, 254, 0.3);">
            <div style="padding: 20px; border-bottom: 1px solid rgba(79, 172, 254, 0.2); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: #4facfe; margin: 0;">📖 知识点总结</h3>
                <button onclick="closeSummaryModal()" style="background: none; border: none; color: #8899aa; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="background: rgba(79, 172, 254, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <strong style="color: #4facfe;">当前知识点：</strong>
                    <span style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #0a1628; padding: 5px 15px; border-radius: 15px; margin-left: 10px; font-weight: bold;">${selectedTopic}</span>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 10px; color: #b8c5d6;">💭 你想了解什么？（可选）</label>
                    <textarea id="summary-question" placeholder="例如：这个知识点的核心概念是什么？有什么常见应用场景？" 
                        style="width: 100%; min-height: 80px; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(79, 172, 254, 0.3); border-radius: 8px; color: #e0e6ed; font-size: 14px; resize: vertical;"></textarea>
                </div>
                <button onclick="requestKnowledgeSummary()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                    🔍 生成学习总结
                </button>
            </div>
            <div id="summary-response" style="padding: 0 20px 20px; max-height: 300px; overflow-y: auto;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeSummaryModal() {
    const modal = document.getElementById('summary-modal');
    if (modal) modal.remove();
}

async function requestKnowledgeSummary() {
    const question = document.getElementById('summary-question').value.trim();
    const responseDiv = document.getElementById('summary-response');
    
    responseDiv.innerHTML = '<p class="loading">正在生成总结...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/knowledge_seeking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ question })
        });
        
        if (!response.ok) throw new Error('获取总结失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        responseDiv.innerHTML = '<div class="markdown-body" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;"></div>';
        const contentDiv = responseDiv.firstChild;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            contentDiv.innerHTML = renderMarkdown(fullText);
            highlightCode(contentDiv);
        }
        
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = '<p style="color: #e74c3c;">获取总结失败，请重试</p>';
    }
}


// ==================== 框架渲染 ====================

async function renderFramework(text, container) {
    try {
        let jsonStr = null;
        
        // 尝试提取JSON
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = text.substring(firstBrace, lastBrace + 1);
            }
        }
        
        if (jsonStr) {
            const data = JSON.parse(jsonStr);
            if (data && data.parentProblem) {
                renderSimpleFramework(data, container);
                return;
            }
        }
        
        // 降级显示
        container.innerHTML = renderMarkdown(text);
        highlightCode(container);
        await renderMermaidDiagrams(container);
        
    } catch (error) {
        console.error('框架渲染失败:', error);
        container.innerHTML = renderMarkdown(text);
        highlightCode(container);
        try { await renderMermaidDiagrams(container); } catch(e) {}
    }
}

// 浮动窗口专用的框架渲染 - 交互式卡片版本
async function renderFrameworkToFloating(text, container) {
    try {
        let jsonStr = null;
        
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = text.substring(firstBrace, lastBrace + 1);
            }
        }
        
        if (jsonStr) {
            const data = JSON.parse(jsonStr);
            if (data && data.parentProblem) {
                renderInteractiveFramework(data, container);
                return;
            }
        }
        
        // 降级：以Markdown方式渲染非JSON格式的框架内容
        container.innerHTML = renderMarkdown(text);
        highlightCode(container);
        await renderMermaidDiagrams(container);
        
    } catch (error) {
        console.error('框架渲染失败:', error);
        // 降级：以Markdown方式渲染
        container.innerHTML = renderMarkdown(text);
        highlightCode(container);
        try { await renderMermaidDiagrams(container); } catch(e) {}
    }
}

// ==================== 交互式框架系统 ====================
const FrameworkSystem = {
    cards: [],
    completedCount: 0,
    totalCount: 0,
    
    controlTypes: {
        sequence: { icon: '📋', name: '顺序结构', color: '#3498db' },
        selection: { icon: '🔀', name: '选择结构', color: '#e74c3c' },
        loop: { icon: '🔄', name: '循环结构', color: '#27ae60' }
    },
    
    // 层级颜色（HSL 亮度递增）
    getLayerColor(layer) {
        const lightness = [40, 50, 60, 70, 80, 88];
        const l = lightness[Math.min(layer, 5)];
        return `hsl(217, 91%, ${l}%)`;
    },
    
    getLayerTextColor(layer) {
        return layer <= 2 ? '#ffffff' : '#1e293b';
    },
    
    generateCardId() {
        return 'fc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    reset() {
        this.cards = [];
        this.completedCount = 0;
        this.totalCount = 0;
    },
    
    recalculateCounts() {
        let total = 0;
        let completed = 0;
        this.cards.forEach(card => {
            if (card.isLeaf) {
                total++;
                if (card.completed) completed++;
            }
        });
        this.totalCount = total;
        this.completedCount = completed;
        
        // 更新进度显示
        const progressEl = document.getElementById('framework-progress');
        if (progressEl) {
            progressEl.textContent = `${completed}/${total} 模块`;
        }
    }
};

// 渲染交互式框架
function renderInteractiveFramework(data, container) {
    FrameworkSystem.reset();
    
    const cardId = FrameworkSystem.generateCardId();
    const cardData = {
        id: cardId,
        layer: data.level || 0,
        name: data.parentProblem || '主问题',
        controlType: 'sequence',
        ipo: data.overallIPO || {},
        subProblems: data.subProblems || [],
        completed: false,
        isLeaf: true
    };
    
    FrameworkSystem.cards.push(cardData);
    
    let html = `
    <div class="framework-container" style="padding: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 10px;">
            <span style="font-size: 14px; color: #64748b;">📊 进度：<strong id="framework-progress" style="color: #2563EB;">0/1 模块</strong></span>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(52,152,219,0.12); border: 1px solid rgba(52,152,219,0.3); border-radius: 6px; font-size: 12px; color: #3498db; font-weight: 600;">📋 顺序结构</span>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.3); border-radius: 6px; font-size: 12px; color: #27ae60; font-weight: 600;">🔄 循环结构</span>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(231,76,60,0.12); border: 1px solid rgba(231,76,60,0.3); border-radius: 6px; font-size: 12px; color: #e74c3c; font-weight: 600;">🔀 选择结构</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="collapseAllFrameworkCards()" style="padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 12px;">📁 全部折叠</button>
                <button onclick="expandAllFrameworkCards()" style="padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 12px;">📂 全部展开</button>
                <button onclick="exportFrameworkCode()" style="padding: 6px 12px; background: #2563EB; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">📋 代码导出</button>
            </div>
        </div>
        <div id="framework-cards-container">
            ${createFrameworkCardHtml(cardData)}
        </div>
    </div>
    `;
    
    container.innerHTML = html;
    FrameworkSystem.recalculateCounts();
    
    // 渲染 Mermaid 图
    renderFrameworkMermaid(cardId, cardData);
}

// 创建框架卡片 HTML
function createFrameworkCardHtml(cardData) {
    const ctrl = FrameworkSystem.controlTypes[cardData.controlType] || FrameworkSystem.controlTypes.sequence;
    const layerColor = FrameworkSystem.getLayerColor(cardData.layer);
    const textColor = FrameworkSystem.getLayerTextColor(cardData.layer);
    
    return `
    <div class="framework-card" id="fcard-${cardData.id}" data-layer="${cardData.layer}" style="margin-bottom: 12px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden;">
        
        <!-- 卡片头部 -->
        <div class="fcard-header" onclick="toggleFrameworkCard('${cardData.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${layerColor}; color: ${textColor}; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; background: rgba(255,255,255,0.25); border-radius: 4px;">L${cardData.layer}</span>
                <span style="font-weight: 600; font-size: 14px;">${FrameworkSystem.escapeHtml(cardData.name)}</span>
                <span style="font-size: 12px; padding: 2px 8px; background: rgba(255,255,255,0.2); border-radius: 10px;">${ctrl.icon} ${ctrl.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="fcard-status" id="fstatus-${cardData.id}" style="font-size: 12px; padding: 3px 10px; background: rgba(255,255,255,0.2); border-radius: 10px;">待处理</span>
                <span class="fcard-toggle" id="ftoggle-${cardData.id}" style="font-size: 14px;">▼</span>
            </div>
        </div>
        
        <!-- 卡片内容 -->
        <div class="fcard-body" id="fbody-${cardData.id}" style="padding: 16px;">
            <!-- Mermaid 图 -->
            <div id="fmermaid-${cardData.id}" style="background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 12px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #94a3b8; font-size: 13px;">⏳ 生成逻辑图中...</span>
            </div>
            
            <!-- ISPO 信息 -->
            ${cardData.ipo && (cardData.ipo.input || cardData.ipo.storage || cardData.ipo.process || cardData.ipo.output) ? `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
                <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #3498db;">
                    <div style="font-size: 11px; font-weight: 600; color: #3498db; margin-bottom: 4px;">📥 输入</div>
                    <div style="font-size: 12px; color: #334155;">${FrameworkSystem.escapeHtml(cardData.ipo.input || '-')}</div>
                </div>
                <div style="background: rgba(156, 39, 176, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #9c27b0;">
                    <div style="font-size: 11px; font-weight: 600; color: #9c27b0; margin-bottom: 4px;">💾 存储</div>
                    <div style="font-size: 12px; color: #334155;">${FrameworkSystem.escapeHtml(cardData.ipo.storage || '-')}</div>
                </div>
                <div style="background: rgba(245, 158, 11, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 11px; font-weight: 600; color: #f59e0b; margin-bottom: 4px;">⚙️ 处理</div>
                    <div style="font-size: 12px; color: #334155;">${FrameworkSystem.escapeHtml(cardData.ipo.process || '-')}</div>
                </div>
                <div style="background: rgba(34, 197, 94, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #22c55e;">
                    <div style="font-size: 11px; font-weight: 600; color: #22c55e; margin-bottom: 4px;">📤 输出</div>
                    <div style="font-size: 12px; color: #334155;">${FrameworkSystem.escapeHtml(cardData.ipo.output || '-')}</div>
                </div>
            </div>
            ` : ''}
            
            <!-- 交互决策区 -->
            <div class="fcard-gate" id="fgate-${cardData.id}" style="background: #f8fafc; border-radius: 10px; padding: 16px; text-align: center; border: 1px dashed #e2e8f0;">
                <div style="font-size: 14px; color: #334155; margin-bottom: 12px;">基于上述逻辑结构，你能写出 <strong style="color: #2563EB;">${FrameworkSystem.escapeHtml(cardData.name)}</strong> 的代码吗？</div>
                <div style="display: flex; justify-content: center; gap: 12px;">
                    <button onclick="markFrameworkCanWrite('${cardData.id}')" style="padding: 10px 24px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">✅ 能，我可以写</button>
                    <button onclick="continueFrameworkDecompose('${cardData.id}')" style="padding: 10px 24px; background: white; color: #f59e0b; border: 2px solid #f59e0b; border-radius: 8px; font-weight: 600; cursor: pointer;">🔍 不能，继续分解</button>
                </div>
            </div>
            
            <!-- 代码输入区 -->
            <div class="fcard-code" id="fcode-${cardData.id}" style="display: none; margin-top: 12px;">
                <textarea id="fcodeinput-${cardData.id}" style="width: 100%; min-height: 100px; padding: 12px; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; font-family: Consolas, Monaco, monospace; font-size: 13px; resize: vertical;" placeholder="// 在这里写出该模块的代码..."></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                    <button onclick="cancelFrameworkCode('${cardData.id}')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;">取消</button>
                    <button onclick="confirmFrameworkCode('${cardData.id}')" style="padding: 8px 16px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">✓ 确认完成</button>
                </div>
            </div>
            
            <!-- 子卡片容器 -->
            <div id="fsub-${cardData.id}"></div>
        </div>
        
        <!-- 完成摘要 -->
        <div class="fcard-completed" id="fcompleted-${cardData.id}" style="display: none; padding: 12px 16px; background: rgba(34, 197, 94, 0.08); border-top: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 13px;">
            ✅ 模块已就绪 - 代码已编写
        </div>
    </div>
    `;
}

// ==================== 框架交互函数 ====================

// 渲染 Mermaid 图
async function renderFrameworkMermaid(cardId, cardData) {
    const container = document.getElementById(`fmermaid-${cardId}`);
    if (!container || typeof mermaid === 'undefined') {
        if (container) {
            container.innerHTML = `<span style="color: #64748b; font-size: 13px;">📊 ${cardData.name}</span>`;
        }
        return;
    }
    
    const subProblems = cardData.subProblems || [];
    let mermaidCode = '';
    
    if (subProblems.length === 0) {
        mermaidCode = `graph LR\n    A["📋 ${sanitizeMermaidText(cardData.name)}"]\n    style A fill:#e0f2fe,stroke:#3b82f6,stroke-width:2px`;
    } else {
        mermaidCode = 'graph LR\n';
        subProblems.forEach((sub, index) => {
            const nodeId = String.fromCharCode(65 + index);
            const nextId = String.fromCharCode(65 + index + 1);
            const ctrl = FrameworkSystem.controlTypes[sub.controlType] || FrameworkSystem.controlTypes.sequence;
            const name = sanitizeMermaidText(sub.name || `步骤${index + 1}`);
            
            mermaidCode += `    ${nodeId}["${ctrl.icon} ${name}"]\n`;
            if (index < subProblems.length - 1) {
                mermaidCode += `    ${nodeId} --> ${nextId}\n`;
            }
            
            const colors = { sequence: '#e0f2fe,#3b82f6', selection: '#fef3c7,#f59e0b', loop: '#dcfce7,#22c55e' };
            const [fill, stroke] = (colors[sub.controlType] || colors.sequence).split(',');
            mermaidCode += `    style ${nodeId} fill:${fill},stroke:${stroke},stroke-width:2px\n`;
        });
    }
    
    try {
        const id = `fmermaid-render-${cardId}-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        container.innerHTML = svg;
    } catch (error) {
        console.error('Mermaid 渲染失败:', error);
        container.innerHTML = `<span style="color: #64748b; font-size: 13px;">📊 ${cardData.name}</span>`;
    }
}

function sanitizeMermaidText(text) {
    if (!text) return '';
    return text.replace(/["\[\]{}()<>]/g, '').replace(/\n/g, ' ').substring(0, 25);
}

// 格式化语句提示文本
function formatCodeHint(text) {
    if (!text) return '';
    
    // 转义 HTML 特殊字符
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 格式化语句提示用于 textarea（不需要 HTML 转义）
function formatCodeHintForTextarea(text) {
    if (!text) return '';
    return text.trim();
}

// 折叠/展开卡片
function toggleFrameworkCard(cardId) {
    const body = document.getElementById(`fbody-${cardId}`);
    const toggle = document.getElementById(`ftoggle-${cardId}`);
    const completed = document.getElementById(`fcompleted-${cardId}`);
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (completed) completed.style.display = 'none';
        toggle.textContent = '▼';
    } else {
        body.style.display = 'none';
        const cardData = FrameworkSystem.cards.find(c => c.id === cardId);
        if (cardData && cardData.completed && completed) {
            completed.style.display = 'block';
        }
        toggle.textContent = '▶';
    }
}

// 全部折叠
function collapseAllFrameworkCards() {
    FrameworkSystem.cards.forEach(card => {
        const body = document.getElementById(`fbody-${card.id}`);
        const toggle = document.getElementById(`ftoggle-${card.id}`);
        const completed = document.getElementById(`fcompleted-${card.id}`);
        if (body) {
            body.style.display = 'none';
            if (toggle) toggle.textContent = '▶';
            if (card.completed && completed) completed.style.display = 'block';
        }
    });
}

// 全部展开
function expandAllFrameworkCards() {
    FrameworkSystem.cards.forEach(card => {
        const body = document.getElementById(`fbody-${card.id}`);
        const toggle = document.getElementById(`ftoggle-${card.id}`);
        const completed = document.getElementById(`fcompleted-${card.id}`);
        if (body) {
            body.style.display = 'block';
            if (toggle) toggle.textContent = '▼';
            if (completed) completed.style.display = 'none';
        }
    });
}

// 代码导出 - 将所有已编写的代码导出到右侧编辑器
function exportFrameworkCode() {
    const codeBlocks = [];
    
    // 按层级排序卡片
    const sortedCards = [...FrameworkSystem.cards].sort((a, b) => {
        if (a.layer !== b.layer) return a.layer - b.layer;
        return FrameworkSystem.cards.indexOf(a) - FrameworkSystem.cards.indexOf(b);
    });
    
    sortedCards.forEach(card => {
        const textarea = document.getElementById(`fcodeinput-${card.id}`);
        if (textarea && textarea.value.trim()) {
            const code = textarea.value.trim();
            
            codeBlocks.push(`// ==================================================`);
            codeBlocks.push(`// 模块: ${card.name}`);
            codeBlocks.push(`// 层级: L${card.layer}`);
            codeBlocks.push(`// ==================================================`);
            codeBlocks.push(code);
            codeBlocks.push('');
        }
    });
    
    if (codeBlocks.length === 0) {
        alert('⚠️ 暂无已编写的代码内容');
        return;
    }
    
    const exportContent = codeBlocks.join('\n');
    
    // 导出到右侧 Monaco 编辑器
    setEditorCode(exportContent);
    
    // 按钮反馈
    const btn = event ? event.target : null;
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✅ 已导出到编辑器';
        btn.style.background = '#22c55e';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#2563EB';
        }, 2000);
    }
}

// 切换语句建议显示/隐藏
function toggleCodeHint(cardId) {
    const hintDiv = document.getElementById(`fhint-${cardId}`);
    const btn = document.getElementById(`fhintbtn-${cardId}`);
    if (hintDiv && btn) {
        if (hintDiv.style.display === 'none') {
            hintDiv.style.display = 'block';
            btn.style.background = '#2563eb';
        } else {
            hintDiv.style.display = 'none';
            btn.style.background = '#3b82f6';
        }
    }
}

// 标记为"能写出代码"
function markFrameworkCanWrite(cardId) {
    const gate = document.getElementById(`fgate-${cardId}`);
    const codeArea = document.getElementById(`fcode-${cardId}`);
    
    if (gate) gate.style.display = 'none';
    if (codeArea) {
        codeArea.style.display = 'block';
        const textarea = document.getElementById(`fcodeinput-${cardId}`);
        if (textarea) textarea.focus();
    }
}

// 取消代码输入
function cancelFrameworkCode(cardId) {
    const gate = document.getElementById(`fgate-${cardId}`);
    const codeArea = document.getElementById(`fcode-${cardId}`);
    
    if (gate) gate.style.display = 'block';
    if (codeArea) codeArea.style.display = 'none';
}

// 确认代码完成
function confirmFrameworkCode(cardId) {
    const cardData = FrameworkSystem.cards.find(c => c.id === cardId);
    if (!cardData) return;
    
    cardData.completed = true;
    
    const header = document.querySelector(`#fcard-${cardId} .fcard-header`);
    const status = document.getElementById(`fstatus-${cardId}`);
    const body = document.getElementById(`fbody-${cardId}`);
    const completed = document.getElementById(`fcompleted-${cardId}`);
    const toggle = document.getElementById(`ftoggle-${cardId}`);
    
    if (header) header.style.background = '#22c55e';
    if (status) {
        status.textContent = '✅ 已完成';
        status.style.background = 'rgba(255,255,255,0.3)';
    }
    if (body) body.style.display = 'none';
    if (completed) completed.style.display = 'block';
    if (toggle) toggle.textContent = '▶';
    
    FrameworkSystem.recalculateCounts();
    checkFrameworkAllCompleted();
}

// 继续分解
async function continueFrameworkDecompose(cardId) {
    const cardData = FrameworkSystem.cards.find(c => c.id === cardId);
    if (!cardData) return;
    
    const subContainer = document.getElementById(`fsub-${cardId}`);
    const gate = document.getElementById(`fgate-${cardId}`);
    const status = document.getElementById(`fstatus-${cardId}`);
    
    if (gate) gate.style.display = 'none';
    
    // 标记为非叶子节点
    cardData.isLeaf = false;
    if (status) {
        status.textContent = '📂 已分解';
        status.style.background = 'rgba(255,255,255,0.3)';
    }
    
    // 如果已有子问题，直接渲染
    if (cardData.subProblems && cardData.subProblems.length > 0) {
        renderFrameworkSubCards(cardId, cardData.subProblems, cardData.layer + 1);
        return;
    }
    
    // 显示加载状态
    subContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;"><span style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> 正在分解子模块...</div>';
    
    try {
        const response = await fetch('/api/xiaohang/decompose_problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                level: cardData.layer + 1,
                parentProblem: cardData.name
            })
        });
        
        if (!response.ok) throw new Error('分解请求失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
        }
        
        const data = parseFrameworkResponse(fullText);
        if (data && data.subProblems) {
            cardData.subProblems = data.subProblems;
            renderFrameworkSubCards(cardId, data.subProblems, cardData.layer + 1);
        } else {
            subContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 8px;">该模块已足够简单，无需继续分解</div>';
        }
    } catch (error) {
        console.error('分解失败:', error);
        subContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #ef4444;">分解失败，请重试 <button onclick="continueFrameworkDecompose('${cardId}')" style="margin-left: 8px; padding: 4px 12px; cursor: pointer;">重试</button></div>`;
    }
}

function parseFrameworkResponse(text) {
    try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonStr = null;
        
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = text.substring(firstBrace, lastBrace + 1);
            }
        }
        
        if (jsonStr) return JSON.parse(jsonStr);
    } catch (error) {
        console.error('JSON 解析失败:', error);
    }
    return null;
}

// 渲染子卡片
function renderFrameworkSubCards(parentCardId, subProblems, layer) {
    const container = document.getElementById(`fsub-${parentCardId}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    subProblems.forEach((sub, index) => {
        const cardId = FrameworkSystem.generateCardId();
        const cardData = {
            id: cardId,
            parentId: parentCardId,
            layer: layer,
            name: sub.name || `子模块 ${index + 1}`,
            description: sub.description || '',
            controlType: sub.controlType || 'sequence',
            ipo: sub.ipo ? { input: sub.ipo.input || '', storage: sub.ipo.storage || '待定义', process: sub.ipo.process || '', output: sub.ipo.output || '' } : {},
            subProblems: [],
            needsFurtherDecomposition: sub.needsFurtherDecomposition !== false,
            codeHint: sub.codeHint || '',
            completed: false,
            isLeaf: true
        };
        
        FrameworkSystem.cards.push(cardData);
        
        setTimeout(() => {
            const cardHtml = createFrameworkSubCardHtml(cardData);
            container.insertAdjacentHTML('beforeend', cardHtml);
            renderFrameworkMermaid(cardId, cardData);
        }, index * 100);
    });
    
    FrameworkSystem.recalculateCounts();
}

// 创建子卡片 HTML
function createFrameworkSubCardHtml(cardData) {
    const ctrl = FrameworkSystem.controlTypes[cardData.controlType] || FrameworkSystem.controlTypes.sequence;
    const layerColor = FrameworkSystem.getLayerColor(cardData.layer);
    const textColor = FrameworkSystem.getLayerTextColor(cardData.layer);
    
    // 语句建议改为可折叠按钮
    const codeHintHtml = cardData.codeHint ? `
        <div style="margin-top: 12px;">
            <button onclick="toggleCodeHint('${cardData.id}')" id="fhintbtn-${cardData.id}" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">💡 语句建议</button>
            <div id="fhint-${cardData.id}" style="display: none; margin-top: 8px; background: #f0f9ff; padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                <div style="font-size: 13px; color: #1e40af; line-height: 1.6;">${formatCodeHint(cardData.codeHint)}</div>
            </div>
        </div>
    ` : '';
    
    const gateHtml = cardData.needsFurtherDecomposition ? `
        <div class="fcard-gate" id="fgate-${cardData.id}" style="background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center; border: 1px dashed #e2e8f0;">
            <div style="font-size: 13px; color: #334155; margin-bottom: 10px;">你能写出 <strong style="color: #2563EB;">${FrameworkSystem.escapeHtml(cardData.name)}</strong> 的代码吗？</div>
            <div style="display: flex; justify-content: center; gap: 10px;">
                <button onclick="markFrameworkCanWrite('${cardData.id}')" style="padding: 8px 20px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">✅ 能</button>
                <button onclick="continueFrameworkDecompose('${cardData.id}')" style="padding: 8px 20px; background: white; color: #f59e0b; border: 2px solid #f59e0b; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">🔍 继续分解</button>
            </div>
        </div>
    ` : `
        <div class="fcard-gate" id="fgate-${cardData.id}" style="background: #f0fdf4; border-radius: 10px; padding: 14px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 13px; color: #166534; margin-bottom: 10px;">✨ 该模块已足够简单，可以直接编写代码</div>
            <button onclick="markFrameworkCanWrite('${cardData.id}')" style="padding: 8px 20px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">✅ 开始编写</button>
            ${codeHintHtml}
        </div>
    `;
    
    return `
    <div class="framework-card" id="fcard-${cardData.id}" data-layer="${cardData.layer}" style="margin-top: 12px; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
        <div class="fcard-header" onclick="toggleFrameworkCard('${cardData.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${layerColor}; color: ${textColor}; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; background: rgba(255,255,255,0.25); border-radius: 4px;">L${cardData.layer}</span>
                <span style="font-weight: 600; font-size: 13px;">${FrameworkSystem.escapeHtml(cardData.name)}</span>
                <span style="font-size: 11px; padding: 2px 6px; background: rgba(255,255,255,0.2); border-radius: 8px;">${ctrl.icon}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="fcard-status" id="fstatus-${cardData.id}" style="font-size: 11px; padding: 2px 8px; background: rgba(255,255,255,0.2); border-radius: 8px;">待处理</span>
                <span class="fcard-toggle" id="ftoggle-${cardData.id}" style="font-size: 12px;">▶</span>
            </div>
        </div>
        <div class="fcard-body" id="fbody-${cardData.id}" style="padding: 14px; display: none;">
            ${cardData.description ? `<p style="color: #64748b; margin-bottom: 12px; font-size: 13px;">${FrameworkSystem.escapeHtml(cardData.description)}</p>` : ''}
            <div id="fmermaid-${cardData.id}" style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #94a3b8; font-size: 12px;">⏳ 加载中...</span>
            </div>
            ${gateHtml}
            <div class="fcard-code" id="fcode-${cardData.id}" style="display: none; margin-top: 12px;">
                <textarea id="fcodeinput-${cardData.id}" style="width: 100%; min-height: 80px; padding: 10px; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; font-family: Consolas, Monaco, monospace; font-size: 12px; resize: vertical; white-space: pre-wrap;" placeholder="// 在这里写出该模块的代码..."></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
                    <button onclick="cancelFrameworkCode('${cardData.id}')" style="padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 12px;">取消</button>
                    <button onclick="confirmFrameworkCode('${cardData.id}')" style="padding: 6px 12px; background: #22c55e; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px;">✓ 确认</button>
                </div>
            </div>
            <div id="fsub-${cardData.id}"></div>
        </div>
        <div class="fcard-completed" id="fcompleted-${cardData.id}" style="display: none; padding: 10px 14px; background: rgba(34, 197, 94, 0.08); border-top: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 12px;">✅ 模块已就绪</div>
    </div>
    `;
}

// 检查是否全部完成
function checkFrameworkAllCompleted() {
    if (FrameworkSystem.completedCount >= FrameworkSystem.totalCount && FrameworkSystem.totalCount > 0) {
        const container = document.getElementById('framework-cards-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', `
                <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; margin-top: 16px;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
                    <div style="font-size: 16px; font-weight: 600; color: #166534; margin-bottom: 4px;">太棒了！所有模块已完成</div>
                    <div style="color: #15803d; font-size: 13px;">你已经成功分解并实现了整个问题</div>
                </div>
            `);
        }
    }
}

// ==================== 工具函数 ====================

function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        // 配置marked以保留mermaid代码块的语言标识
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang === 'mermaid') {
                    return code; // 不高亮mermaid代码，保留原样
                }
                if (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return code;
            }
        });
        let html = marked.parse(text);
        // 高亮引导性问题
        html = highlightGuidingQuestions(html);
        return html;
    }
    return text.replace(/\n/g, '<br>');
}

// 高亮引导性问题
function highlightGuidingQuestions(html) {
    // 匹配以问号结尾的段落（引导性问题）
    // 匹配模式：包含"思考"、"想一想"、"试试"、"能否"、"如何"、"为什么"、"什么"等引导词的问句
    const guidingPatterns = [
        /(<p>)(.*?(?:思考|想一想|试试|能否|如何|为什么|什么|是否|怎样|怎么|哪些|哪个|请问|你认为|你觉得|能不能|可以|应该).*?\?)<\/p>/gi,
        /(<p>)(.*?(?:思考|想一想|试试|能否|如何|为什么|什么|是否|怎样|怎么|哪些|哪个|请问|你认为|你觉得|能不能|可以|应该).*?？)<\/p>/gi
    ];
    
    guidingPatterns.forEach(pattern => {
        html = html.replace(pattern, '<div class="guiding-question">$2</div>');
    });
    
    // 匹配最后的总结性问题（通常在文末，包含"现在"、"接下来"、"最后"等词）
    const finalPatterns = [
        /(<p>)(.*?(?:现在|接下来|最后|综上|总结|那么).*?(?:你能|你可以|试着|开始).*?[?？])<\/p>/gi,
        /(<p>)(.*?(?:准备好|开始编写|动手|实现).*?[?？])<\/p>/gi
    ];
    
    finalPatterns.forEach(pattern => {
        html = html.replace(pattern, '<div class="final-question">$2</div>');
    });
    
    // 匹配思考提示（包含"提示"、"注意"、"关键"等词的句子）
    const thinkPatterns = [
        /(<p>)(💡.*?)<\/p>/gi,
        /(<p>)(🤔.*?)<\/p>/gi,
        /(<p>)((?:提示|注意|关键|重点)[:：].*?)<\/p>/gi
    ];
    
    thinkPatterns.forEach(pattern => {
        html = html.replace(pattern, '<div class="think-prompt">$2</div>');
    });
    
    return html;
}

function highlightCode(container) {
    if (typeof hljs !== 'undefined') {
        container.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }
    // 为代码块添加复制按钮和主题切换
    enhanceCodeBlocks(container);
}

// 高亮代码中的 TODO 补全标记
function highlightTodoMarkers(container) {
    container.querySelectorAll('pre code').forEach(block => {
        // 处理已经被hljs高亮后的HTML内容
        const html = block.innerHTML;
        // 匹配 // TODO: ... 或 # TODO: ... 的注释行（可能被hljs包裹在span中）
        const todoRegex = /((?:<span[^>]*>)*\s*(?:\/\/|#)\s*TODO:\s*.*?(?:<\/span>)*)/gi;
        const newHtml = html.replace(todoRegex, (match) => {
            return `<span class="todo-highlight">${match}</span>`;
        });
        if (newHtml !== html) {
            block.innerHTML = newHtml;
        }
        
        // 备用：直接按文本行匹配（处理hljs未包裹的情况）
        if (!html.includes('TODO:')) return;
        const lines = block.innerHTML.split('\n');
        let changed = false;
        const newLines = lines.map(line => {
            const plainText = line.replace(/<[^>]*>/g, '');
            if (plainText.includes('TODO:') && !line.includes('todo-highlight')) {
                changed = true;
                return `<span class="todo-highlight">${line}</span>`;
            }
            return line;
        });
        if (changed) {
            block.innerHTML = newLines.join('\n');
        }
    });
}

// 增强代码块 - 添加复制按钮、主题切换、发送到编辑器功能
function enhanceCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre');
    
    codeBlocks.forEach((pre, index) => {
        // 跳过已经处理过的代码块
        if (pre.parentElement.classList.contains('code-block-container')) return;
        
        const code = pre.querySelector('code');
        if (!code) return;
        
        // 获取语言
        const langClass = Array.from(code.classList).find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : 'code';
        
        // 跳过mermaid代码块
        if (lang === 'mermaid') return;
        
        // 创建容器
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-container';
        
        // 创建头部
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
            <span class="code-block-lang">${lang.toUpperCase()}</span>
            <div class="code-block-actions">
                <button class="code-action-btn theme-toggle-btn" onclick="toggleCodeBlockTheme(this)" title="切换主题">
                    🌓 主题
                </button>
                <button class="code-action-btn send-to-editor-btn" onclick="sendCodeToEditor(this)" title="发送到编辑器">
                    📝 编辑器
                </button>
                <button class="code-action-btn copy-code-btn" onclick="copyCodeBlock(this)" title="复制代码">
                    📋 复制
                </button>
            </div>
        `;
        
        // 包装代码块
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        
        // 默认深色主题
        pre.classList.add('code-block-dark');
    });
}

// 切换代码块主题
function toggleCodeBlockTheme(btn) {
    const container = btn.closest('.code-block-container');
    const pre = container.querySelector('pre');
    
    if (pre.classList.contains('code-block-dark')) {
        pre.classList.remove('code-block-dark');
        pre.classList.add('code-block-light');
        btn.textContent = '🌙 深色';
    } else {
        pre.classList.remove('code-block-light');
        pre.classList.add('code-block-dark');
        btn.textContent = '🌓 主题';
    }
}

// 复制代码块
function copyCodeBlock(btn) {
    const container = btn.closest('.code-block-container');
    const code = container.querySelector('code');
    const text = code.textContent;
    
    copyToClipboard(text, btn, '📋 复制', '✅ 已复制');
}

// 发送代码到编辑器
function sendCodeToEditor(btn) {
    const container = btn.closest('.code-block-container');
    const code = container.querySelector('code');
    const text = code.textContent;
    
    setEditorCode(text);
    
    // 触发 Monaco 编辑器中的 TODO 高亮
    if (typeof highlightTodoInEditor === 'function') {
        setTimeout(highlightTodoInEditor, 100);
    }
    
    // 显示成功提示
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ 已发送';
    btn.classList.add('copied');
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
    }, 2000);
}

// 通用复制到剪贴板函数
function copyToClipboard(text, btn, originalText, successText) {
    navigator.clipboard.writeText(text).then(() => {
        if (btn) {
            btn.innerHTML = successText;
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        // 备用方案
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (btn) {
                btn.innerHTML = successText;
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        } catch (fallbackErr) {
            console.error('复制失败:', fallbackErr);
            alert('复制失败，请手动复制');
        }
    });
}

function renderMath(container) {
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ]
        });
    }
}


// ==================== 追问功能 ====================

// 当前辅导类型（用于追问）
let currentGuidanceType = null;

// 显示追问输入框
function showFollowUpInput(container) {
    // 检查是否已经有追问框
    if (container.querySelector('.follow-up-container')) {
        return;
    }
    
    // 创建追问按钮容器
    const followUpContainer = document.createElement('div');
    followUpContainer.className = 'follow-up-container';
    followUpContainer.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;';
    
    followUpContainer.innerHTML = `
        <button class="follow-up-toggle-btn" onclick="toggleFollowUpInput(this)" style="padding: 10px 25px; background: #1e90ff; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 13px; transition: all 0.3s;">
            💬 继续追问
        </button>
        <div class="follow-up-input-area" style="display: none; margin-top: 15px; text-align: left;">
            <textarea class="follow-up-input" placeholder="对这部分内容有疑问？继续提问..." 
                      style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
            <button onclick="submitFollowUp(this)" style="margin-top: 10px; padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">
                提交追问
            </button>
        </div>
        <div class="follow-up-response" style="margin-top: 15px;"></div>
    `;
    
    container.appendChild(followUpContainer);
}

// 切换追问输入框显示
function toggleFollowUpInput(btn) {
    const container = btn.closest('.follow-up-container');
    const inputArea = container.querySelector('.follow-up-input-area');
    
    if (inputArea.style.display === 'none') {
        inputArea.style.display = 'block';
        btn.textContent = '✕ 收起';
        btn.style.background = '#95a5a6';
    } else {
        inputArea.style.display = 'none';
        btn.textContent = '💬 继续追问';
        btn.style.background = '#1e90ff';
    }
}

// 提交追问
async function submitFollowUp(btn) {
    const container = btn.closest('.follow-up-container');
    const input = container.querySelector('.follow-up-input');
    const question = input.value.trim();
    
    if (!question) {
        alert('请输入问题！');
        return;
    }
    
    if (!currentGuidanceType) {
        alert('请先选择一个辅导模块！');
        return;
    }
    
    const responseDiv = container.querySelector('.follow-up-response');
    responseDiv.innerHTML = '<p class="loading">AI正在思考...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/follow_up_question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                type: currentGuidanceType,
                question: question
            })
        });
        
        if (!response.ok) {
            throw new Error('追问失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        responseDiv.innerHTML = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;"></div>';
        const contentDiv = responseDiv.firstChild;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            fullText += decoder.decode(value);
            contentDiv.innerHTML = renderMarkdown(fullText);
            highlightCode(contentDiv);
        }
        
        // 清空输入框
        input.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = '<p style="color: #e74c3c;">追问失败，请重试</p>';
    }
}


// ==================== 分割线拖拽功能 ====================

function initResizers() {
    // 左右分割线
    const resizerH = document.getElementById('resizer-horizontal');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const container = document.querySelector('.practice-container');
    
    if (resizerH && leftPanel && rightPanel) {
        let isResizingH = false;
        
        resizerH.addEventListener('mousedown', (e) => {
            isResizingH = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizingH) return;
            
            const containerRect = container.getBoundingClientRect();
            const newLeftWidth = e.clientX - containerRect.left - 10; // 10 is padding
            const containerWidth = containerRect.width - 20 - 6; // padding and resizer width
            
            const minWidth = 300;
            const maxWidth = containerWidth - 400;
            
            if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
                leftPanel.style.width = newLeftWidth + 'px';
                leftPanel.style.flex = 'none';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizingH) {
                isResizingH = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
    
    // 上下分割线
    const resizerV = document.getElementById('resizer-vertical');
    const editorSection = document.getElementById('editor-section');
    const rightContent = document.getElementById('right-content');
    const rightPanelEl = document.getElementById('right-panel');
    
    if (resizerV && editorSection && rightContent) {
        let isResizingV = false;
        
        resizerV.addEventListener('mousedown', (e) => {
            isResizingV = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizingV) return;
            
            e.preventDefault();
            
            const panelRect = rightPanelEl.getBoundingClientRect();
            // 获取工具栏和提交区域的实际高度
            const toolbar = rightPanelEl.querySelector('.right-toolbar');
            const submitSection = rightPanelEl.querySelector('.submit-section');
            const toolbarHeight = toolbar ? toolbar.offsetHeight : 50;
            const submitHeight = submitSection ? submitSection.offsetHeight : 60;
            const resizerHeight = 6;
            
            // 计算可用高度
            const availableHeight = panelRect.height - toolbarHeight - submitHeight - resizerHeight;
            
            // 计算编辑器新高度（相对于右侧面板顶部）
            const editorTop = editorSection.getBoundingClientRect().top;
            const newEditorHeight = e.clientY - editorTop;
            
            // 设置最小和最大高度限制
            const minEditorHeight = 150; // 编辑器最小高度
            const minContentHeight = 100; // 下方内容区最小高度
            const maxEditorHeight = availableHeight - minContentHeight;
            
            // 严格限制高度范围
            const clampedHeight = Math.max(minEditorHeight, Math.min(newEditorHeight, maxEditorHeight));
            
            // 计算下方内容区高度
            const contentHeight = availableHeight - clampedHeight;
            
            // 只有在有效范围内才更新
            if (contentHeight >= minContentHeight) {
                editorSection.style.flex = 'none';
                editorSection.style.height = clampedHeight + 'px';
                rightContent.style.flex = 'none';
                rightContent.style.height = contentHeight + 'px';
                rightContent.style.minHeight = minContentHeight + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizingV) {
                isResizingV = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // 触发Monaco编辑器重新布局
                if (monacoEditorReady && typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.layout) {
                    MonacoEditorManager.layout();
                }
            }
        });
    }
}

// 修改enterPracticePage函数，添加背景切换
const originalEnterPracticePage = enterPracticePage;
enterPracticePage = function() {
    document.body.classList.add('practice-mode');
    document.getElementById('selection-page').classList.add('hidden');
    document.getElementById('practice-page').classList.add('active');
    
    // 初始化分割线
    initResizers();
    
    // 初始化Monaco编辑器
    initMonacoEditor();
    
    // 生成第一道题目
    generateProblem();
};


// ==================== 浮动窗口功能 ====================

function openFloatingPanel(icon, title) {
    const panel = document.getElementById('floating-panel');
    const iconEl = document.getElementById('floating-panel-icon');
    const titleEl = document.getElementById('floating-panel-title-text');
    
    // 如果当前有显示的面板，先保存它的状态到圆球
    if (floatingPanelVisible && currentPanelId !== null) {
        saveCurrentPanelState();
    }
    
    iconEl.textContent = icon;
    titleEl.textContent = title;
    
    // 检查是否已有相同类型的面板在圆球中
    const existingPanel = minimizedPanels.find(p => p.title === title);
    if (existingPanel) {
        // 恢复已有面板
        restoreFromBubble(existingPanel.id);
        return;
    }
    
    // 检查是否已达到最大数量
    if (minimizedPanels.length >= MAX_BUBBLES) {
        alert('最多只能同时保留5个窗口，请先关闭一些窗口');
        return;
    }
    
    // 创建新面板
    currentPanelId = Date.now();
    
    // 设置初始位置（横向2/3，纵向5/6，居中悬浮）
    if (!floatingPanelVisible) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 横向宽度占屏幕的2/3，纵向高度占屏幕的5/6
        const initialWidth = Math.floor(screenWidth * 2 / 3);
        const initialHeight = Math.floor(screenHeight * 5 / 6);
        
        // 横向居中，纵向居中
        const initialLeft = Math.floor((screenWidth - initialWidth) / 2);
        const initialTop = Math.floor((screenHeight - initialHeight) / 2);
        
        panel.style.left = initialLeft + 'px';
        panel.style.top = initialTop + 'px';
        panel.style.width = initialWidth + 'px';
        panel.style.height = initialHeight + 'px';
    }
    
    // 添加到最小化列表（但不显示圆球，因为面板是打开的）
    minimizedPanels.push({
        id: currentPanelId,
        icon: icon,
        title: title,
        content: '<p class="loading">正在加载...</p>',
        position: {
            left: panel.style.left,
            top: panel.style.top,
            width: panel.style.width,
            height: panel.style.height
        }
    });
    
    panel.classList.add('active');
    floatingPanelVisible = true;
    floatingPanelMinimized = false;
    
    // 初始化拖拽和调整大小
    initFloatingPanelDrag();
    initFloatingPanelResize();
    
    // 渲染圆球
    renderBubbles();
}

function closeFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('active');
    panel.classList.remove('maximized');
    floatingPanelVisible = false;
    floatingPanelMinimized = false;
    floatingPanelMaximized = false;
    preMaximizePosition = null;
    
    // 重置最大化按钮
    const btn = document.getElementById('floating-panel-maximize-btn');
    if (btn) { btn.textContent = '□'; btn.title = '最大化'; }
    
    // 如果当前面板有ID，从最小化列表中移除，并清理类型映射和缓冲区
    if (currentPanelId !== null) {
        const titleEl = document.getElementById('floating-panel-title-text');
        if (titleEl) {
            panelIdByType.delete(titleEl.textContent);
        }
        panelStreamBuffers.delete(currentPanelId);
        removeBubble(currentPanelId);
        currentPanelId = null;
    }
}

function minimizeFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    const content = document.getElementById('floating-panel-content');
    const icon = document.getElementById('floating-panel-icon').textContent;
    const title = document.getElementById('floating-panel-title-text').textContent;
    
    // 如果处于最大化状态，先还原
    if (floatingPanelMaximized) {
        panel.classList.remove('maximized');
        floatingPanelMaximized = false;
        if (preMaximizePosition) {
            panel.style.left = preMaximizePosition.left;
            panel.style.top = preMaximizePosition.top;
            panel.style.width = preMaximizePosition.width;
            panel.style.height = preMaximizePosition.height;
        }
        const maxBtn = document.getElementById('floating-panel-maximize-btn');
        if (maxBtn) { maxBtn.textContent = '□'; maxBtn.title = '最大化'; }
        preMaximizePosition = null;
    }
    
    // 检查是否已达到最大圆球数量
    if (minimizedPanels.length >= MAX_BUBBLES && currentPanelId === null) {
        alert('最多只能同时保留5个最小化窗口');
        return;
    }
    
    // 保存当前面板状态
    const panelState = {
        id: currentPanelId !== null ? currentPanelId : Date.now(),
        icon: icon,
        title: title,
        content: content.innerHTML,
        position: {
            left: panel.style.left,
            top: panel.style.top,
            width: panel.style.width,
            height: panel.style.height
        }
    };
    
    // 如果是新面板，添加到列表
    if (currentPanelId === null) {
        minimizedPanels.push(panelState);
    } else {
        // 更新已有面板
        const index = minimizedPanels.findIndex(p => p.id === currentPanelId);
        if (index !== -1) {
            minimizedPanels[index] = panelState;
        }
    }
    
    currentPanelId = null;
    
    // 隐藏面板
    panel.classList.remove('active');
    floatingPanelVisible = false;
    
    // 渲染圆球
    renderBubbles();
}

function maximizeFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    const btn = document.getElementById('floating-panel-maximize-btn');
    
    if (floatingPanelMaximized) {
        // 还原
        panel.classList.remove('maximized');
        floatingPanelMaximized = false;
        
        // 恢复之前的位置和尺寸
        if (preMaximizePosition) {
            panel.style.left = preMaximizePosition.left;
            panel.style.top = preMaximizePosition.top;
            panel.style.width = preMaximizePosition.width;
            panel.style.height = preMaximizePosition.height;
        }
        
        if (btn) {
            btn.textContent = '□';
            btn.title = '最大化';
        }
    } else {
        // 保存当前位置和尺寸
        preMaximizePosition = {
            left: panel.style.left,
            top: panel.style.top,
            width: panel.style.width,
            height: panel.style.height
        };
        
        // 最大化
        panel.classList.add('maximized');
        floatingPanelMaximized = true;
        
        if (btn) {
            btn.textContent = '❐';
            btn.title = '还原';
        }
    }
}

function renderBubbles() {
    const container = document.getElementById('minimized-bubbles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 如果没有最小化的面板，直接返回
    if (minimizedPanels.length === 0) return;
    
    // 获取右侧编辑器区域位置
    const rightPanel = document.getElementById('right-panel');
    const rightPanelRect = rightPanel ? rightPanel.getBoundingClientRect() : null;
    
    minimizedPanels.forEach((panelState, index) => {
        const bubble = document.createElement('div');
        bubble.className = 'minimized-bubble';
        bubble.id = `bubble-${panelState.id}`;
        bubble.innerHTML = `
            <span class="bubble-icon">${panelState.icon}</span>
            <span class="bubble-close">×</span>
        `;
        bubble.title = panelState.title;
        
        // 设置圆球位置
        let bubbleLeft, bubbleTop;
        if (panelState.bubblePosition) {
            bubbleLeft = panelState.bubblePosition.left;
            bubbleTop = panelState.bubblePosition.top;
        } else {
            // 默认位置：右侧编辑器上方横向排列
            if (rightPanelRect) {
                bubbleLeft = rightPanelRect.left + 20 + index * 62;
                bubbleTop = rightPanelRect.top + 60;
            } else {
                bubbleLeft = window.innerWidth * 0.45 + index * 62;
                bubbleTop = 80;
            }
            // 保存默认位置
            panelState.bubblePosition = { left: bubbleLeft, top: bubbleTop };
        }
        
        bubble.style.left = bubbleLeft + 'px';
        bubble.style.top = bubbleTop + 'px';
        
        container.appendChild(bubble);
        
        // 添加事件监听
        initBubbleEvents(bubble, panelState.id);
    });
}

function initBubbleEvents(bubble, panelId) {
    let isDraggingBubble = false;
    let hasMoved = false;
    let startX, startY;
    let localDragOffset = { x: 0, y: 0 };
    
    const onMouseDown = (e) => {
        // 如果点击的是关闭按钮
        if (e.target.classList.contains('bubble-close')) {
            e.stopPropagation();
            e.preventDefault();
            removeBubbleAndRender(panelId);
            return;
        }
        
        e.preventDefault();
        isDraggingBubble = true;
        hasMoved = false;
        
        const rect = bubble.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        localDragOffset.x = e.clientX - rect.left;
        localDragOffset.y = e.clientY - rect.top;
        
        bubble.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    const onMouseMove = (e) => {
        if (!isDraggingBubble) return;
        
        const moveX = Math.abs(e.clientX - startX);
        const moveY = Math.abs(e.clientY - startY);
        
        // 移动超过5px才算拖动
        if (moveX > 5 || moveY > 5) {
            hasMoved = true;
        }
        
        let newLeft = e.clientX - localDragOffset.x;
        let newTop = e.clientY - localDragOffset.y;
        
        // 边界限制
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 50));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));
        
        bubble.style.left = newLeft + 'px';
        bubble.style.top = newTop + 'px';
        bubble.style.transform = 'none';
    };
    
    const onMouseUp = (e) => {
        if (!isDraggingBubble) return;
        
        isDraggingBubble = false;
        bubble.style.cursor = 'grab';
        document.body.style.userSelect = '';
        
        // 保存圆球位置
        const panelIndex = minimizedPanels.findIndex(p => p.id === panelId);
        if (panelIndex !== -1) {
            minimizedPanels[panelIndex].bubblePosition = {
                left: parseInt(bubble.style.left),
                top: parseInt(bubble.style.top)
            };
        }
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // 如果没有移动，才触发点击恢复面板
        if (!hasMoved) {
            restoreFromBubble(panelId);
        }
    };
    
    bubble.addEventListener('mousedown', onMouseDown);
}

function startBubbleDrag(e, panelId) {}
function handleBubbleDrag(e) {}
function stopBubbleDrag(e) {}

function restoreFromBubble(panelId) {
    const panelState = minimizedPanels.find(p => p.id === panelId);
    if (!panelState) return;
    
    // 如果当前有显示的面板，先保存它的状态
    if (floatingPanelVisible && currentPanelId !== null && currentPanelId !== panelId) {
        saveCurrentPanelState();
    }
    
    // 恢复选中的面板
    const panel = document.getElementById('floating-panel');
    const content = document.getElementById('floating-panel-content');
    const iconEl = document.getElementById('floating-panel-icon');
    const titleEl = document.getElementById('floating-panel-title-text');
    
    iconEl.textContent = panelState.icon;
    titleEl.textContent = panelState.title;
    content.innerHTML = panelState.content;
    
    // 恢复位置和大小
    if (panelState.position) {
        panel.style.left = panelState.position.left;
        panel.style.top = panelState.position.top;
        panel.style.width = panelState.position.width;
        panel.style.height = panelState.position.height;
    }
    
    panel.classList.add('active');
    floatingPanelVisible = true;
    currentPanelId = panelId;
    
    // 初始化拖拽和调整大小
    initFloatingPanelDrag();
    initFloatingPanelResize();
    
    // 重新渲染圆球（高亮当前选中的）
    renderBubbles();
}

function removeBubble(panelId) {
    minimizedPanels = minimizedPanels.filter(p => p.id !== panelId);
    renderBubbles();
}

function removeBubbleAndRender(panelId) {
    // 清理类型映射和缓冲区
    const panelState = minimizedPanels.find(p => p.id === panelId);
    if (panelState) {
        panelIdByType.delete(panelState.title);
    }
    panelStreamBuffers.delete(panelId);
    
    // 如果删除的是当前显示的面板，关闭它
    if (currentPanelId === panelId) {
        const panel = document.getElementById('floating-panel');
        panel.classList.remove('active');
        floatingPanelVisible = false;
        currentPanelId = null;
    }
    removeBubble(panelId);
}

function initFloatingPanelDrag() {
    const panel = document.getElementById('floating-panel');
    const header = document.getElementById('floating-panel-header');
    
    header.onmousedown = function(e) {
        if (e.target.closest('.floating-panel-btn')) return;
        
        isDragging = true;
        dragOffset.x = e.clientX - panel.offsetLeft;
        dragOffset.y = e.clientY - panel.offsetTop;
        
        document.body.style.userSelect = 'none';
    };
    
    document.addEventListener('mousemove', handleFloatingPanelDrag);
    document.addEventListener('mouseup', stopFloatingPanelDrag);
}

function handleFloatingPanelDrag(e) {
    if (!isDragging) return;
    
    const panel = document.getElementById('floating-panel');
    let newLeft = e.clientX - dragOffset.x;
    let newTop = e.clientY - dragOffset.y;
    
    // 边界限制
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panel.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));
    
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
}

function stopFloatingPanelDrag() {
    if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';
    }
}

function initFloatingPanelResize() {
    const panel = document.getElementById('floating-panel');
    const resizers = panel.querySelectorAll('.floating-panel-resize');
    
    resizers.forEach(resizer => {
        resizer.onmousedown = function(e) {
            e.preventDefault();
            isResizing = true;
            
            // 判断调整方向
            if (resizer.classList.contains('corner-br')) {
                resizeDirection = 'corner-br';
            } else if (resizer.classList.contains('corner-bl')) {
                resizeDirection = 'corner-bl';
            } else if (resizer.classList.contains('corner-tr')) {
                resizeDirection = 'corner-tr';
            } else if (resizer.classList.contains('corner-tl')) {
                resizeDirection = 'corner-tl';
            } else if (resizer.classList.contains('right')) {
                resizeDirection = 'right';
            } else if (resizer.classList.contains('left')) {
                resizeDirection = 'left';
            } else if (resizer.classList.contains('bottom')) {
                resizeDirection = 'bottom';
            } else if (resizer.classList.contains('top')) {
                resizeDirection = 'top';
            }
            
            initialSize.width = panel.offsetWidth;
            initialSize.height = panel.offsetHeight;
            initialPos.x = e.clientX;
            initialPos.y = e.clientY;
            initialPos.left = panel.offsetLeft;
            initialPos.top = panel.offsetTop;
            
            document.body.style.userSelect = 'none';
        };
    });
    
    document.addEventListener('mousemove', handleFloatingPanelResize);
    document.addEventListener('mouseup', stopFloatingPanelResize);
}

function handleFloatingPanelResize(e) {
    if (!isResizing) return;
    
    const panel = document.getElementById('floating-panel');
    const deltaX = e.clientX - initialPos.x;
    const deltaY = e.clientY - initialPos.y;
    
    const minWidth = 350;
    const minHeight = 250;
    
    // 右边调整
    if (resizeDirection === 'right' || resizeDirection === 'corner-br' || resizeDirection === 'corner-tr') {
        const newWidth = Math.max(minWidth, initialSize.width + deltaX);
        panel.style.width = newWidth + 'px';
    }
    
    // 左边调整
    if (resizeDirection === 'left' || resizeDirection === 'corner-bl' || resizeDirection === 'corner-tl') {
        const newWidth = Math.max(minWidth, initialSize.width - deltaX);
        if (newWidth >= minWidth) {
            panel.style.width = newWidth + 'px';
            panel.style.left = (initialPos.left + deltaX) + 'px';
        }
    }
    
    // 下边调整
    if (resizeDirection === 'bottom' || resizeDirection === 'corner-br' || resizeDirection === 'corner-bl') {
        const newHeight = Math.max(minHeight, initialSize.height + deltaY);
        panel.style.height = newHeight + 'px';
    }
    
    // 上边调整
    if (resizeDirection === 'top' || resizeDirection === 'corner-tr' || resizeDirection === 'corner-tl') {
        const newHeight = Math.max(minHeight, initialSize.height - deltaY);
        if (newHeight >= minHeight) {
            panel.style.height = newHeight + 'px';
            panel.style.top = (initialPos.top + deltaY) + 'px';
        }
    }
}

function stopFloatingPanelResize() {
    if (isResizing) {
        isResizing = false;
        resizeDirection = '';
        document.body.style.userSelect = '';
    }
}

