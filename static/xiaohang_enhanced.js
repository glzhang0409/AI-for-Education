// 小航辅导模块 JavaScript - 增强版
// 新增功能：正确答案、追问、渴求知识

// ==================== Mermaid 图表渲染函数 ====================

// 预处理 Mermaid 代码，修复常见语法错误
function preprocessMermaidCode(code) {
    let processed = code;
    
    // 1. 移除节点文本中的双引号和单引号
    // 匹配 [文本] 或 {文本} 中的引号
    processed = processed.replace(/\[([^\]]*)"([^\]"]*)"\s*\]/g, '[$1$2]');
    processed = processed.replace(/\[([^\]]*)'([^\]']*)'\s*\]/g, '[$1$2]');
    processed = processed.replace(/\{([^\}]*)"([^\}"]*)"([^\}]*)\}/g, '{$1$2$3}');
    processed = processed.replace(/\{([^\}]*)'([^\}']*)'([^\}]*)\}/g, '{$1$2$3}');
    
    // 2. 修复箭头标签中的引号
    processed = processed.replace(/\|([^|]*)"([^|"]*)"\s*\|/g, '|$1$2|');
    processed = processed.replace(/\|([^|]*)'([^|']*)'\s*\|/g, '|$1$2|');
    
    // 3. 移除可能导致问题的特殊字符
    processed = processed.replace(/[""'']/g, '');
    
    return processed;
}

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
        
        // 预处理代码，修复常见语法错误
        code = preprocessMermaidCode(code);
        
        const pre = block.parentElement;
        
        // 创建一个新的 div 来放置渲染后的图表
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid-diagram';
        mermaidDiv.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 15px 0; text-align: center;';
        
        try {
            // 生成唯一 ID
            const id = `mermaid-${Date.now()}-${i}`;
            // 渲染 Mermaid 图表
            const { svg } = await mermaid.render(id, code);
            mermaidDiv.innerHTML = svg;
            // 替换原来的 pre 元素
            pre.parentNode.replaceChild(mermaidDiv, pre);
        } catch (error) {
            console.error('Mermaid 渲染错误:', error);
            mermaidDiv.innerHTML = `<p style="color: #e74c3c; margin-bottom: 10px;">⚠️ 图表渲染失败: ${error.message}</p>`;
            mermaidDiv.innerHTML += `<pre style="text-align: left; background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 8px; overflow-x: auto;"><code>${code}</code></pre>`;
            pre.parentNode.replaceChild(mermaidDiv, pre);
        }
    }
    
    // 同时处理直接的 mermaid 类 div（如果有的话）
    const mermaidDivs = container.querySelectorAll('.mermaid:not(.mermaid-diagram)');
    for (let i = 0; i < mermaidDivs.length; i++) {
        const div = mermaidDivs[i];
        let code = div.textContent;
        code = preprocessMermaidCode(code);
        
        try {
            const id = `mermaid-div-${Date.now()}-${i}`;
            const { svg } = await mermaid.render(id, code);
            div.innerHTML = svg;
            div.classList.add('mermaid-diagram');
        } catch (error) {
            console.error('Mermaid 渲染错误:', error);
        }
    }
}

// 高亮问号问题的函数
function highlightQuestions(element) {
    if (!element) return;
    
    // 遍历所有文本节点
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const nodesToReplace = [];
    let node;
    
    while (node = walker.nextNode()) {
        // 跳过代码块中的内容
        let parent = node.parentNode;
        let isInCode = false;
        while (parent && parent !== element) {
            if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
                isInCode = true;
                break;
            }
            parent = parent.parentNode;
        }
        
        if (!isInCode && node.textContent.includes('？')) {
            nodesToReplace.push(node);
        }
    }
    
    // 替换包含问号的文本节点
    nodesToReplace.forEach(node => {
        const text = node.textContent;
        // 匹配以问号结尾的句子（支持中英文问号）
        const regex = /([^。！\n]+[？\?])/g;
        
        if (regex.test(text)) {
            const span = document.createElement('span');
            span.innerHTML = text.replace(regex, '<span class="question-highlight">$1</span>');
            node.parentNode.replaceChild(span, node);
        }
    });
}

// 知识点列表
const KNOWLEDGE_POINTS = [
    '栈', '队列', '数组', '链表', '哈希表', '散列表', '堆', '优先队列',
    '树', '二叉树', '二叉搜索树', 'AVL', '红黑树', 'B树', '字典树', 'Trie',
    '图', 'DFS', 'BFS', '最短路', '最小生成树', '拓扑排序',
    '排序', '查找', '动态规划', '贪心', '回溯', '递归'
];

// 全局状态
let selectedTopics = [];
let sessionId = null;
let currentDifficulty = '简单';
let completedCount = 0;
let currentGuidanceType = null; // 当前辅导类型

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initKnowledgeGrid();
});

// 初始化知识点网格
function initKnowledgeGrid() {
    const grid = document.getElementById('knowledge-grid');
    grid.innerHTML = '';
    
    KNOWLEDGE_POINTS.forEach(point => {
        const btn = document.createElement('button');
        btn.className = 'knowledge-btn';
        btn.textContent = point;
        btn.onclick = () => toggleKnowledge(point, btn);
        grid.appendChild(btn);
    });
}

// 切换知识点选择
function toggleKnowledge(point, btn) {
    if (btn.classList.contains('selected')) {
        // 取消选择
        btn.classList.remove('selected');
        selectedTopics = selectedTopics.filter(t => t !== point);
    } else {
        // 选择
        if (selectedTopics.length >= 3) {
            alert('最多只能选择3个知识点！');
            return;
        }
        btn.classList.add('selected');
        selectedTopics.push(point);
    }
    
    // 更新选择计数
    updateSelectedCount();
    
    // 更新其他按钮状态
    updateButtonStates();
}

// 更新选择计数
function updateSelectedCount() {
    const countElement = document.getElementById('selected-count');
    if (countElement) {
        countElement.textContent = selectedTopics.length;
    }
    
    // 更新确认按钮状态
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = selectedTopics.length === 0;
    }
}

// 更新按钮状态
function updateButtonStates() {
    const buttons = document.querySelectorAll('.knowledge-btn');
    buttons.forEach(btn => {
        if (!btn.classList.contains('selected') && selectedTopics.length >= 3) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

// 确认选择
async function confirmSelection() {
    if (selectedTopics.length === 0) {
        alert('请至少选择1个知识点！');
        return;
    }
    
    try {
        const response = await fetch('/api/xiaohang/init_session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                topics: selectedTopics
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            sessionId = data.session_id;
            // 切换到练习阶段
            document.getElementById('stage-selection').classList.remove('active');
            document.getElementById('stage-practice').classList.add('active');
            
            // 初始化进度显示为1/3（简单难度）
            const completedCountSpan = document.getElementById('completed-count');
            if (completedCountSpan) {
                completedCountSpan.textContent = '1';
            }
            
            // 生成第一道题目
            generateNewProblem();
        } else {
            alert(data.error || '初始化失败');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请重试');
    }
}

// 生成新题目
async function generateNewProblem() {
    const problemDisplay = document.getElementById('problem-display');
    problemDisplay.innerHTML = '<p class="loading"></p>';
    
    try {
        const response = await fetch('/api/xiaohang/generate_problem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('生成题目失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        problemDisplay.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullText += chunk;
            
            // 使用marked渲染Markdown
            if (typeof marked !== 'undefined') {
                problemDisplay.innerHTML = marked.parse(fullText);
            } else {
                problemDisplay.textContent = fullText;
            }
            
            // 语法高亮
            if (typeof hljs !== 'undefined') {
                problemDisplay.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
    } catch (error) {
        console.error('Error:', error);
        problemDisplay.innerHTML = '<p style="color: red;">生成题目失败，请重试</p>';
    }
}

// 提交代码 - 使用脚手架理论的智能诊断
async function submitCode() {
    // 直接提交，不带思路描述
    await submitCodeDirectly('');
}


// 将难度切换链接转换为按钮
function convertDifficultyLinksToButtons(container) {
    // 延迟执行，确保DOM完全渲染
    setTimeout(() => {
        console.log('开始转换难度按钮...');
        console.log('容器内容:', container.innerHTML.substring(0, 500));
        
        // 为"恭喜"消息添加背景样式
        const paragraphs = container.querySelectorAll('p');
        paragraphs.forEach(p => {
            const text = p.textContent;
            if (text.includes('🎉') && (text.includes('恭喜') || text.includes('太棒了') || text.includes('完美'))) {
                p.style.cssText = `
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 12px;
                    margin: 20px 0;
                    font-size: 20px;
                    font-weight: bold;
                    text-align: center;
                    box-shadow: 0 4px 20px rgba(79, 172, 254, 0.4);
                    animation: celebrationPulse 2s ease-in-out infinite;
                `;
                console.log('为恭喜消息添加样式:', text);
            }
        });
        
        // 找到所有包含"继续挑战"的h3标题
        const h3Elements = container.querySelectorAll('h3');
        console.log('找到h3元素数量:', h3Elements.length);
        
        h3Elements.forEach(h3 => {
            console.log('h3文本:', h3.textContent);
            if (h3.textContent.includes('继续挑战') || h3.textContent.includes('💡')) {
                console.log('找到"继续挑战"标题');
                // 找到紧跟的ul列表
                let nextElement = h3.nextElementSibling;
                
                // 跳过可能的空白文本节点
                while (nextElement && nextElement.nodeType === 3) {
                    nextElement = nextElement.nextSibling;
                }
                
                console.log('下一个元素:', nextElement ? nextElement.tagName : 'null');
                
                // 为"继续挑战"标题添加背景样式
                h3.style.cssText = `
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin: 20px 0 15px 0;
                    font-size: 18px;
                    box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);
                `;
                
                if (nextElement && nextElement.tagName === 'UL') {
                    console.log('找到UL列表，开始创建按钮');
                    // 创建按钮容器
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'difficulty-buttons-container';
                    buttonContainer.style.cssText = 'margin-top: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; width: 100%;';
                    
                    // 获取所有列表项
                    const listItems = nextElement.querySelectorAll('li');
                    console.log('列表项数量:', listItems.length);
                    
                    listItems.forEach(li => {
                        const link = li.querySelector('a[href^="#"]');
                        if (link) {
                            const href = link.getAttribute('href');
                            const text = li.textContent.trim();
                            const action = href.substring(1); // 去掉 #
                            
                            // 创建按钮
                            const button = document.createElement('button');
                            button.textContent = text;
                            button.className = 'difficulty-switch-btn';
                            button.style.cssText = `
                                padding: 15px 25px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white !important;
                                border: none;
                                border-radius: 12px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 15px;
                                text-align: left;
                                transition: all 0.3s;
                                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                                width: 100%;
                                display: block;
                                margin: 0;
                                line-height: 1.5;
                            `;
                            
                            console.log('创建按钮:', text, '动作:', action);
                            
                            // 根据不同类型设置不同颜色
                            if (action === 'next') {
                                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                            } else if (action === 'easy') {
                                button.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                                button.style.boxShadow = '0 4px 15px rgba(52, 152, 219, 0.3)';
                            } else if (action === 'medium') {
                                button.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
                                button.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.3)';
                            } else if (action === 'hard') {
                                button.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                                button.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
                            }
                            
                            // 悬停效果
                            button.onmouseover = () => {
                                button.style.transform = 'translateY(-2px)';
                                button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                            };
                            button.onmouseout = () => {
                                button.style.transform = 'translateY(0)';
                            };
                            
                            // 点击事件
                            button.onclick = () => handleDifficultyChange(action);
                            
                            buttonContainer.appendChild(button);
                        }
                    });
                    
                    // 如果成功创建了按钮，替换原来的列表
                    if (buttonContainer.children.length > 0) {
                        console.log('成功创建', buttonContainer.children.length, '个按钮，替换列表');
                        nextElement.replaceWith(buttonContainer);
                    } else {
                        console.log('未创建任何按钮');
                    }
                } else {
                    console.log('未找到UL列表');
                }
            }
        });
        console.log('按钮转换完成');
    }, 500); // 增加延迟时间，确保流式内容完全加载
}

// 处理难度切换
async function handleDifficultyChange(action) {
    let newDifficulty = null;
    
    if (action === 'next') {
        // 生成下一题（保持当前难度）
        await generateNextProblem();
        return;
    } else if (action === 'easy') {
        newDifficulty = '简单';
    } else if (action === 'medium') {
        newDifficulty = '中等';
    } else if (action === 'hard') {
        newDifficulty = '困难';
    }
    
    if (newDifficulty) {
        await changeDifficulty(newDifficulty);
    }
}

// 难度选择器变更处理
async function onDifficultySelect(newDifficulty) {
    if (!newDifficulty || newDifficulty === currentDifficulty) return;
    await changeDifficulty(newDifficulty);
}

// 统一的难度切换函数
async function changeDifficulty(newDifficulty) {
    try {
        // 调用API切换难度
        const response = await fetch('/api/xiaohang/change_difficulty', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ difficulty: newDifficulty })
        });
        
        if (!response.ok) {
            throw new Error('切换难度失败');
        }
        
        const result = await response.json();
        
        // 更新全局难度状态
        currentDifficulty = newDifficulty;
        
        // 更新难度选择器和进度
        updateDifficultySelector(newDifficulty);
        
        // 生成新题目
        await generateNextProblem();
        
    } catch (error) {
        console.error('Error:', error);
        alert('切换难度失败，请重试');
        // 恢复选择器到之前的值
        const selector = document.getElementById('difficulty-selector');
        if (selector) {
            selector.value = currentDifficulty;
            selector.className = 'difficulty-selector ' + currentDifficulty;
        }
    }
}

// 更新难度选择器样式和进度显示
function updateDifficultySelector(difficulty) {
    const selector = document.getElementById('difficulty-selector');
    const completedCountSpan = document.getElementById('completed-count');
    
    if (selector) {
        selector.value = difficulty;
        selector.className = 'difficulty-selector ' + difficulty;
    }
    
    if (completedCountSpan) {
        if (difficulty === '简单') {
            completedCountSpan.textContent = '1';
        } else if (difficulty === '中等') {
            completedCountSpan.textContent = '2';
        } else if (difficulty === '困难') {
            completedCountSpan.textContent = '3';
        }
    }
}

// 生成下一题
async function generateNextProblem() {
    // 清空当前内容 - 兼容 Monaco Editor 和普通 textarea
    if (typeof clearEditorCode === 'function') {
        clearEditorCode();
    } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.clear) {
        MonacoEditorManager.clear();
    } else {
        const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
        if (textarea) textarea.value = '';
    }
    document.getElementById('judgment-result').style.display = 'none';
    document.getElementById('guidance-display').style.display = 'none';
    
    // 调用生成题目函数
    await generateNewProblem();
}

// 更新难度徽章和进度显示（兼容选择器）
function updateDifficultyBadge() {
    const selector = document.getElementById('difficulty-selector');
    const completedCountSpan = document.getElementById('completed-count');
    
    // 从评判结果中检测难度变化
    const judgmentContent = document.getElementById('judgment-content');
    if (!judgmentContent) return;
    
    const text = judgmentContent.textContent || '';
    let newDifficulty = null;
    
    if (text.includes('恭喜！你已掌握简单难度') || text.includes('现在进入中等难度')) {
        newDifficulty = '中等';
        if (completedCountSpan) completedCountSpan.textContent = '2';
    } else if (text.includes('太棒了！你已掌握中等难度') || text.includes('现在挑战困难难度')) {
        newDifficulty = '困难';
        if (completedCountSpan) completedCountSpan.textContent = '3';
    } else if (text.includes('完美！你已完全掌握')) {
        newDifficulty = '困难';
        if (completedCountSpan) completedCountSpan.textContent = '3';
    }
    
    if (newDifficulty && selector) {
        selector.value = newDifficulty;
        selector.className = 'difficulty-selector ' + newDifficulty;
        currentDifficulty = newDifficulty;
    }
}

// 根据当前难度更新进度显示
function updateProgressDisplay() {
    const selector = document.getElementById('difficulty-selector');
    const completedCountSpan = document.getElementById('completed-count');
    
    if (!completedCountSpan) return;
    
    const difficulty = selector ? selector.value : currentDifficulty;
    
    if (difficulty === '简单') {
        completedCountSpan.textContent = '1';
    } else if (difficulty === '中等') {
        completedCountSpan.textContent = '2';
    } else if (difficulty === '困难') {
        completedCountSpan.textContent = '3';
    }
}

// 获取辅导内容
async function getGuidance(type) {
    currentGuidanceType = type;
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    const titleMap = {
        '思路': '💭 智能审题',
        '框架': '🏗️ 代码框架',
        '伪代码': '📋 代码分析',
        '核心语句': '🔑 关键点拨'
    };
    
    guidanceTitle.textContent = titleMap[type] || '辅导内容';
    guidanceDisplay.style.display = 'block';
    guidanceContent.innerHTML = '<p class="loading"></p>';
    
    try {
        const response = await fetch('/api/xiaohang/get_guidance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ type })
        });
        
        if (!response.ok) {
            throw new Error('获取辅导失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        guidanceContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullText += chunk;
            
            // 框架类型：流式显示时先显示加载提示，不显示原始JSON
            if (type === '框架') {
                guidanceContent.innerHTML = '<p class="loading">正在生成代码框架可视化...</p>';
            } else {
                // 其他类型：使用marked渲染
                if (typeof marked !== 'undefined') {
                    guidanceContent.innerHTML = marked.parse(fullText);
                } else {
                    guidanceContent.textContent = fullText;
                }
                
                // 语法高亮
                if (typeof hljs !== 'undefined') {
                    guidanceContent.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }
            }
        }
        
        // 框架类型：解析JSON并渲染可视化图表
        if (type === '框架') {
            await renderFrameworkVisualization(fullText, guidanceContent);
        } else {
            // 高亮问号问题
            highlightQuestions(guidanceContent);
            
            // 渲染 Mermaid 图表（ISPO 可视化）
            await renderMermaidDiagrams(guidanceContent);
        }
        
        // 内容生成完成后，添加追问按钮
        showFollowUpInput();
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">获取辅导失败，请重试</p>';
    }
}

// 新增：渲染框架可视化
async function renderFrameworkVisualization(fullText, container) {
    console.log('renderFrameworkVisualization 被调用，文本长度:', fullText.length);
    console.log('文本前100字符:', fullText.substring(0, 100));
    
    try {
        // 尝试从响应中提取JSON
        let jsonStr = null;
        
        // 方法1：匹配 ```json ... ``` 包裹的内容
        const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
            console.log('方法1成功：从```json```中提取');
        }
        
        // 方法2：如果没有找到，尝试匹配裸JSON对象（从第一个{到最后一个}）
        if (!jsonStr) {
            const firstBrace = fullText.indexOf('{');
            const lastBrace = fullText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = fullText.substring(firstBrace, lastBrace + 1);
                console.log('方法2成功：从第一个{到最后一个}提取');
            }
        }
        
        console.log('提取的JSON字符串长度:', jsonStr ? jsonStr.length : 0);
        
        if (jsonStr) {
            // 清理可能的问题字符
            jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ''); // 移除控制字符
            
            const frameworkData = JSON.parse(jsonStr);
            console.log('JSON解析成功，parentProblem:', frameworkData.parentProblem);
            
            // 验证数据结构
            if (frameworkData && frameworkData.parentProblem) {
                // 检查是否有FrameworkVisualizer（来自xiaohang_framework.js）
                if (typeof FrameworkVisualizer !== 'undefined' && FrameworkVisualizer.renderFullVisualization) {
                    console.log('使用FrameworkVisualizer渲染');
                    // 使用专业的可视化渲染器
                    await FrameworkVisualizer.renderFullVisualization(frameworkData, container);
                } else {
                    console.log('使用简单框架渲染');
                    // 降级：使用简单的可视化
                    renderSimpleFramework(frameworkData, container);
                }
                return; // 成功渲染，直接返回
            }
        }
        
        console.log('未找到有效JSON，尝试直接解析');
        
        // 没有找到有效JSON，尝试直接解析整个文本
        if (fullText.trim().startsWith('{') && fullText.trim().endsWith('}')) {
            try {
                const simpleData = JSON.parse(fullText.trim());
                if (simpleData && simpleData.parentProblem) {
                    console.log('直接解析成功');
                    renderSimpleFramework(simpleData, container);
                    return;
                }
            } catch (e) {
                console.error('直接解析失败:', e);
            }
        }
        
        // 最终降级：显示Markdown渲染的内容
        console.log('最终降级：显示Markdown');
        if (typeof marked !== 'undefined') {
            container.innerHTML = marked.parse(fullText);
        } else {
            container.textContent = fullText;
        }
        
        // 语法高亮
        if (typeof hljs !== 'undefined') {
            container.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    } catch (error) {
        console.error('框架可视化渲染失败:', error);
        
        // 最后尝试：直接解析整个文本作为JSON
        try {
            const directData = JSON.parse(fullText.trim());
            if (directData && directData.parentProblem) {
                console.log('异常处理中直接解析成功');
                renderSimpleFramework(directData, container);
                return;
            }
        } catch (e) {
            console.error('异常处理中解析也失败:', e);
        }
        
        // 降级显示原始内容
        if (typeof marked !== 'undefined') {
            container.innerHTML = marked.parse(fullText);
        } else {
            container.textContent = fullText;
        }
    }
}

// 简单框架可视化（降级方案）
function renderSimpleFramework(data, container) {
    const controlTypeMap = {
        'sequence': { icon: '📋', name: '顺序结构', color: '#3498db' },
        'selection': { icon: '🔀', name: '选择结构', color: '#e74c3c' },
        'loop': { icon: '🔄', name: '循环结构', color: '#27ae60' }
    };
    
    let html = `
    <div class="simple-framework" style="padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0;">🎯 ${data.parentProblem || '主问题'}</h4>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px;">第${data.level || 1}层分解</span>
        </div>
    `;
    
    if (data.subProblems && data.subProblems.length > 0) {
        html += '<div style="display: grid; gap: 16px;">';
        data.subProblems.forEach((sub, index) => {
            const ctrl = controlTypeMap[sub.controlType] || controlTypeMap['sequence'];
            html += `
            <div style="background: white; border-left: 4px solid ${ctrl.color}; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 24px;">${ctrl.icon}</span>
                    <div>
                        <strong style="color: #2c3e50;">${sub.name || '子模块' + (index + 1)}</strong>
                        <span style="background: ${ctrl.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;">${ctrl.name}</span>
                    </div>
                </div>
                <p style="color: #666; margin: 0 0 12px 0; font-size: 14px;">${sub.description || ''}</p>
                ${sub.ipo ? `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 12px;">
                    <div style="background: #e3f2fd; padding: 8px; border-radius: 6px;">
                        <strong style="color: #1976d2;">📥 输入</strong><br>${sub.ipo.input || '-'}
                    </div>
                    <div style="background: #f3e5f5; padding: 8px; border-radius: 6px;">
                        <strong style="color: #7b1fa2;">💾 存储</strong><br>${sub.ipo.storage || '-'}
                    </div>
                    <div style="background: #fff8e1; padding: 8px; border-radius: 6px;">
                        <strong style="color: #f57c00;">⚙️ 处理</strong><br>${sub.ipo.process || '-'}
                    </div>
                    <div style="background: #e8f5e9; padding: 8px; border-radius: 6px;">
                        <strong style="color: #388e3c;">📤 输出</strong><br>${sub.ipo.output || '-'}
                    </div>
                </div>
                ` : ''}
                ${sub.codeHint ? `
                <div style="margin-top: 12px; background: #f0f9ff; padding: 10px; border-radius: 6px; border-left: 3px solid #3b82f6;">
                    <strong style="color: #3b82f6; font-size: 12px;">💡 语句建议：</strong>
                    <div style="margin: 8px 0 0 0; font-size: 13px; color: #1e40af; line-height: 1.6;">${sub.codeHint}</div>
                </div>
                ` : ''}
            </div>
            `;
        });
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // 语法高亮
    if (typeof hljs !== 'undefined') {
        container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

// 新增：获取正确答案
async function getCorrectAnswer() {
    currentGuidanceType = '正确答案';
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    guidanceTitle.textContent = '✅ 正确答案';
    guidanceDisplay.style.display = 'block';
    guidanceContent.innerHTML = '<p class="loading"></p>';
    
    try {
        const response = await fetch('/api/xiaohang/get_correct_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('获取正确答案失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        guidanceContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullText += chunk;
            
            // 使用marked渲染
            if (typeof marked !== 'undefined') {
                guidanceContent.innerHTML = marked.parse(fullText);
            } else {
                guidanceContent.textContent = fullText;
            }
            
            // 语法高亮
            if (typeof hljs !== 'undefined') {
                guidanceContent.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
        
        // 高亮问号问题
        highlightQuestions(guidanceContent);
        
        // 渲染 Mermaid 图表
        await renderMermaidDiagrams(guidanceContent);
        
        // 内容生成完成后，添加追问按钮
        showFollowUpInput();
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">获取正确答案失败，请重试</p>';
    }
}

// 新增：显示追问输入框（改为按钮触发）
function showFollowUpInput() {
    const guidanceContent = document.getElementById('guidance-content');
    
    // 检查是否已经有追问框
    if (document.getElementById('follow-up-container')) {
        return;
    }
    
    // 创建追问按钮容器
    const followUpContainer = document.createElement('div');
    followUpContainer.id = 'follow-up-container';
    followUpContainer.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 2px solid #e9ecef; text-align: center;';
    
    followUpContainer.innerHTML = `
        <button onclick="toggleFollowUpInput()" id="follow-up-toggle-btn" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
            💬 继续追问
        </button>
        <div id="follow-up-input-area" style="display: none; margin-top: 15px; text-align: left;">
            <textarea id="follow-up-input" placeholder="对这部分内容有疑问？继续提问..." 
                      style="width: 100%; min-height: 80px; padding: 10px; border: 2px solid #dee2e6; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
            <button onclick="submitFollowUp()" style="margin-top: 10px; padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                提交追问
            </button>
        </div>
        <div id="follow-up-response" style="margin-top: 15px;"></div>
    `;
    
    guidanceContent.appendChild(followUpContainer);
}

// 新增：切换追问输入框显示
function toggleFollowUpInput() {
    const inputArea = document.getElementById('follow-up-input-area');
    const toggleBtn = document.getElementById('follow-up-toggle-btn');
    
    if (inputArea.style.display === 'none') {
        inputArea.style.display = 'block';
        toggleBtn.textContent = '✕ 收起';
        toggleBtn.style.background = '#95a5a6';
    } else {
        inputArea.style.display = 'none';
        toggleBtn.textContent = '💬 继续追问';
        toggleBtn.style.background = '#667eea';
    }
}

// 新增：提交追问
async function submitFollowUp() {
    const input = document.getElementById('follow-up-input');
    const question = input.value.trim();
    
    if (!question) {
        alert('请输入问题！');
        return;
    }
    
    if (!currentGuidanceType) {
        alert('请先选择一个辅导模块！');
        return;
    }
    
    const responseDiv = document.getElementById('follow-up-response');
    responseDiv.innerHTML = '<p class="loading">AI正在思考...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/follow_up_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        
        responseDiv.innerHTML = '<div style="background: #f0f3ff; padding: 15px; border-radius: 8px; margin-top: 10px;"></div>';
        const contentDiv = responseDiv.firstChild;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullText += chunk;
            
            // 使用marked渲染
            if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(fullText);
            } else {
                contentDiv.textContent = fullText;
            }
            
            // 语法高亮
            if (typeof hljs !== 'undefined') {
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
        
        // 高亮问号问题
        highlightQuestions(contentDiv);
        
        // 清空输入框
        input.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = '<p style="color: red;">追问失败，请重试</p>';
    }
}

// 新增：显示渴求知识弹窗
function showKnowledgeSeeking() {
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'knowledge-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 40px; width: 56.25vh; height: 80vh; overflow-y: auto; position: relative; display: flex; flex-direction: column;">
            <button onclick="closeKnowledgeModal()" style="position: absolute; top: 20px; right: 20px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 20px;">✕</button>
            
            <h2 style="color: #667eea; margin-bottom: 20px;">📖 知识点总结</h2>
            
            <div id="knowledge-topics" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                <strong>当前题目涉及的知识点：</strong>
                <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${selectedTopics.map(t => `<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 15px; border-radius: 20px; font-weight: bold;">${t}</span>`).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">💭 你想了解什么？（可选）</label>
                <textarea id="knowledge-question" placeholder="例如：这些知识点之间有什么联系？\n如何系统学习这些内容？\n有什么学习建议？" 
                          style="width: 100%; min-height: 100px; padding: 15px; border: 2px solid #dee2e6; border-radius: 10px; font-size: 14px; resize: vertical;"></textarea>
            </div>
            
            <button onclick="requestKnowledge()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                🔍 生成学习思路
            </button>
            
            <div id="knowledge-response" style="margin-top: 20px;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 新增：关闭渴求知识弹窗
function closeKnowledgeModal() {
    const modal = document.getElementById('knowledge-modal');
    if (modal) {
        modal.remove();
    }
}

// 新增：请求知识学习思路
async function requestKnowledge() {
    const question = document.getElementById('knowledge-question').value.trim();
    const responseDiv = document.getElementById('knowledge-response');
    
    responseDiv.innerHTML = '<p class="loading"></p>';
    
    try {
        const response = await fetch('/api/xiaohang/knowledge_seeking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ question })
        });
        
        if (!response.ok) {
            throw new Error('获取学习思路失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        responseDiv.innerHTML = '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; max-height: 400px; overflow-y: auto;"></div>';
        const contentDiv = responseDiv.firstChild;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullText += chunk;
            
            // 使用marked渲染
            if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(fullText);
            } else {
                contentDiv.textContent = fullText;
            }
            
            // 语法高亮
            if (typeof hljs !== 'undefined') {
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
        
        // 高亮问号问题
        highlightQuestions(contentDiv);
        
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = '<p style="color: red;">获取学习思路失败，请重试</p>';
    }
}

// 关闭辅导显示
function closeGuidance() {
    const guidanceDisplay = document.getElementById('guidance-display');
    guidanceDisplay.style.display = 'none';
    currentGuidanceType = null;
}

// ==================== 脚手架理论新增功能 ====================

// 当前提示级别
let currentHintLevel = 1;

// 生成反例
async function generateCounterexample() {
    // 获取当前代码
    let code = '';
    if (typeof getEditorCode === 'function') {
        code = getEditorCode();
    } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.getCode) {
        code = MonacoEditorManager.getCode();
    } else {
        const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
        code = textarea ? textarea.value : '';
    }
    
    if (!code.trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    guidanceTitle.textContent = '🎯 反例生成器';
    guidanceDisplay.style.display = 'block';
    guidanceContent.innerHTML = '<p class="loading">正在构造最小反例...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/generate_counterexample', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) throw new Error('生成反例失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        guidanceContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
            if (typeof marked !== 'undefined') {
                guidanceContent.innerHTML = marked.parse(fullText);
            } else {
                guidanceContent.textContent = fullText;
            }
            if (typeof hljs !== 'undefined') {
                guidanceContent.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
            }
        }
        
        highlightQuestions(guidanceContent);
        showFollowUpInput();
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">生成反例失败，请重试</p>';
    }
}

// 复杂度分析
async function analyzeComplexity() {
    let code = '';
    if (typeof getEditorCode === 'function') {
        code = getEditorCode();
    } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.getCode) {
        code = MonacoEditorManager.getCode();
    } else {
        const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
        code = textarea ? textarea.value : '';
    }
    
    if (!code.trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    guidanceTitle.textContent = '⏱️ 复杂度分析卫士';
    guidanceDisplay.style.display = 'block';
    guidanceContent.innerHTML = '<p class="loading">正在分析代码复杂度...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/analyze_complexity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) throw new Error('复杂度分析失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        guidanceContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
            if (typeof marked !== 'undefined') {
                guidanceContent.innerHTML = marked.parse(fullText);
            } else {
                guidanceContent.textContent = fullText;
            }
            if (typeof hljs !== 'undefined') {
                guidanceContent.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
            }
        }
        
        // 渲染KaTeX数学公式
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(guidanceContent, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }
        
        highlightQuestions(guidanceContent);
        showFollowUpInput();
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">复杂度分析失败，请重试</p>';
    }
}

// 获取分层提示
async function getHint(level) {
    currentHintLevel = level;
    
    let code = '';
    if (typeof getEditorCode === 'function') {
        code = getEditorCode();
    } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.getCode) {
        code = MonacoEditorManager.getCode();
    } else {
        const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
        code = textarea ? textarea.value : '';
    }
    
    if (!code.trim()) {
        alert('请先编写代码！');
        return;
    }
    
    const levelNames = {
        1: '💡 Level 1 - 轻微提示',
        2: '🎯 Level 2 - 反例提示',
        3: '📚 Level 3 - 概念回溯'
    };
    
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    guidanceTitle.textContent = levelNames[level] || '💡 提示';
    guidanceDisplay.style.display = 'block';
    guidanceContent.innerHTML = '<p class="loading">正在生成提示...</p>';
    
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
        guidanceContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
            if (typeof marked !== 'undefined') {
                guidanceContent.innerHTML = marked.parse(fullText);
            } else {
                guidanceContent.textContent = fullText;
            }
            if (typeof hljs !== 'undefined') {
                guidanceContent.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
            }
        }
        
        highlightQuestions(guidanceContent);
        
        // 添加提示级别切换按钮
        addHintLevelButtons(guidanceContent, level);
        showFollowUpInput();
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">获取提示失败，请重试</p>';
    }
}

// 添加提示级别切换按钮
function addHintLevelButtons(container, currentLevel) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 2px solid #e9ecef; display: flex; gap: 10px; flex-wrap: wrap;';
    
    const levels = [
        { level: 1, text: '💡 更轻微的提示', color: '#3498db' },
        { level: 2, text: '🎯 给我一个反例', color: '#f39c12' },
        { level: 3, text: '📚 回顾相关概念', color: '#e74c3c' }
    ];
    
    levels.forEach(({ level, text, color }) => {
        if (level !== currentLevel) {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = `padding: 10px 20px; background: ${color}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;`;
            btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
            btn.onmouseout = () => btn.style.transform = 'translateY(0)';
            btn.onclick = () => getHint(level);
            buttonsDiv.appendChild(btn);
        }
    });
    
    container.appendChild(buttonsDiv);
}

// 显示思路描述输入框（提交代码前）
function showThoughtInput() {
    const modal = document.createElement('div');
    modal.id = 'thought-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 30px; width: 500px; max-width: 90%;">
            <h3 style="color: #667eea; margin-bottom: 20px;">💭 描述你的思路（可选）</h3>
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">
                简单描述一下你的解题思路，这有助于AI更好地理解你的意图并给出针对性的反馈。
            </p>
            <textarea id="thought-input" placeholder="例如：我打算用双指针从两端向中间遍历..." 
                style="width: 100%; min-height: 100px; padding: 15px; border: 2px solid #dee2e6; border-radius: 10px; font-size: 14px; resize: vertical;"></textarea>
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button onclick="submitCodeWithThought()" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    提交代码
                </button>
                <button onclick="closeThoughtModal()" style="padding: 12px 25px; background: #95a5a6; color: white; border: none; border-radius: 10px; cursor: pointer;">
                    跳过
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 关闭思路输入框
function closeThoughtModal() {
    const modal = document.getElementById('thought-modal');
    if (modal) modal.remove();
    submitCodeDirectly();
}

// 带思路描述提交代码
async function submitCodeWithThought() {
    const thought = document.getElementById('thought-input').value.trim();
    const modal = document.getElementById('thought-modal');
    if (modal) modal.remove();
    await submitCodeDirectly(thought);
}

// 直接提交代码（内部函数）
async function submitCodeDirectly(thought = '') {
    let code = '';
    if (typeof getEditorCode === 'function') {
        code = getEditorCode();
    } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.getCode) {
        code = MonacoEditorManager.getCode();
    } else {
        const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
        code = textarea ? textarea.value : '';
    }
    code = code.trim();
    
    if (!code) {
        alert('请先编写代码！');
        return;
    }
    
    const resultDiv = document.getElementById('judgment-result');
    const contentDiv = document.getElementById('judgment-content');
    
    resultDiv.style.display = 'block';
    contentDiv.innerHTML = '<p class="loading">🔍 正在进行智能诊断...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/submit_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code, thought })
        });
        
        if (!response.ok) throw new Error('提交失败');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        contentDiv.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value);
            if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(fullText);
            } else {
                contentDiv.textContent = fullText;
            }
            if (typeof hljs !== 'undefined') {
                contentDiv.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
            }
        }
        
        // 渲染KaTeX数学公式
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(contentDiv, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }
        
        // 检查是否答对并升级难度
        const isCorrect = fullText.includes('✅ 正确') || 
                         fullText.includes('恭喜！你已掌握') || 
                         fullText.includes('太棒了！你已掌握') || 
                         fullText.includes('完美！你已完全掌握');
        
        if (isCorrect) {
            updateDifficultyBadge();
        }
        
        // 添加脚手架工具按钮
        addScaffoldingButtons(contentDiv);
        
        convertDifficultyLinksToButtons(contentDiv);
        
    } catch (error) {
        console.error('Error:', error);
        contentDiv.innerHTML = '<p style="color: red;">提交失败，请重试</p>';
    }
}

// 添加脚手架工具按钮
function addScaffoldingButtons(container) {
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'scaffolding-tools';
    toolsDiv.style.cssText = `
        margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 15px; border: 2px solid #dee2e6;
    `;
    
    toolsDiv.innerHTML = `
        <h4 style="color: #667eea; margin-bottom: 15px; font-size: 16px;">🛠️ 脚手架工具箱</h4>
        <p style="color: #666; font-size: 13px; margin-bottom: 15px;">需要更多帮助？选择合适的工具：</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            <button onclick="getHint(1)" class="scaffold-btn" style="padding: 12px 15px; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; text-align: left; transition: all 0.3s;">
                <span style="font-size: 18px;">💡</span> Level 1 提示<br>
                <small style="opacity: 0.8; font-weight: normal;">轻微点拨</small>
            </button>
            <button onclick="getHint(2)" class="scaffold-btn" style="padding: 12px 15px; background: #f39c12; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; text-align: left; transition: all 0.3s;">
                <span style="font-size: 18px;">🎯</span> Level 2 提示<br>
                <small style="opacity: 0.8; font-weight: normal;">反例引导</small>
            </button>
            <button onclick="getHint(3)" class="scaffold-btn" style="padding: 12px 15px; background: #e74c3c; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; text-align: left; transition: all 0.3s;">
                <span style="font-size: 18px;">📚</span> Level 3 提示<br>
                <small style="opacity: 0.8; font-weight: normal;">概念回溯</small>
            </button>
            <button onclick="generateCounterexample()" class="scaffold-btn" style="padding: 12px 15px; background: #9b59b6; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; text-align: left; transition: all 0.3s;">
                <span style="font-size: 18px;">🔬</span> 反例生成器<br>
                <small style="opacity: 0.8; font-weight: normal;">构造最小反例</small>
            </button>
            <button onclick="analyzeComplexity()" class="scaffold-btn" style="padding: 12px 15px; background: #1abc9c; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; text-align: left; transition: all 0.3s;">
                <span style="font-size: 18px;">⏱️</span> 复杂度分析<br>
                <small style="opacity: 0.8; font-weight: normal;">时空复杂度诊断</small>
            </button>
        </div>
    `;
    
    // 添加悬停效果
    setTimeout(() => {
        toolsDiv.querySelectorAll('.scaffold-btn').forEach(btn => {
            btn.onmouseover = () => {
                btn.style.transform = 'translateY(-3px)';
                btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            };
        });
    }, 0);
    
    container.appendChild(toolsDiv);
}

// 重新开始
async function restartSession() {
    if (!confirm('确定要重新选择知识点吗？当前进度将被清空。')) {
        return;
    }
    
    try {
        await fetch('/api/xiaohang/reset_session', {
            method: 'POST',
            credentials: 'include'
        });
        
        // 重置状态
        selectedTopics = [];
        sessionId = null;
        currentDifficulty = '简单';
        completedCount = 0;
        currentGuidanceType = null;
        
        // 切换回选择阶段
        document.getElementById('stage-practice').classList.remove('active');
        document.getElementById('stage-selection').classList.add('active');
        
        // 重新初始化
        initKnowledgeGrid();
        updateSelectedCount();
        
        // 清空编辑器和结果 - 兼容 Monaco Editor 和普通 textarea
        if (typeof clearEditorCode === 'function') {
            clearEditorCode();
        } else if (typeof MonacoEditorManager !== 'undefined' && MonacoEditorManager.clear) {
            MonacoEditorManager.clear();
        } else {
            const textarea = document.getElementById('code-editor') || document.getElementById('code-editor-fallback');
            if (textarea) textarea.value = '';
        }
        document.getElementById('judgment-result').style.display = 'none';
        document.getElementById('guidance-display').style.display = 'none';
        
    } catch (error) {
        console.error('Error:', error);
        alert('重置失败，请刷新页面');
    }
}
