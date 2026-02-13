// 小航辅导模块 JavaScript

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
    
    updateSelectionUI();
}

// 更新选择UI
function updateSelectionUI() {
    document.getElementById('selected-count').textContent = selectedTopics.length;
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.disabled = selectedTopics.length === 0;
    
    // 如果已选3个，禁用其他按钮
    const allBtns = document.querySelectorAll('.knowledge-btn');
    allBtns.forEach(btn => {
        if (!btn.classList.contains('selected') && selectedTopics.length >= 3) {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
        } else {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
        }
    });
}

// 确认选择
async function confirmSelection() {
    if (selectedTopics.length === 0) {
        alert('请至少选择1个知识点');
        return;
    }
    
    try {
        const response = await fetch('/api/xiaohang/init_session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topics: selectedTopics
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.session_id;
            currentDifficulty = data.difficulty;
            
            // 切换到练习阶段
            document.getElementById('stage-selection').classList.remove('active');
            document.getElementById('stage-practice').classList.add('active');
            
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
    problemDisplay.innerHTML = '<p class="loading">正在生成题目，请稍候...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/generate_problem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
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
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            
            // 实时渲染Markdown
            problemDisplay.innerHTML = marked.parse(fullText);
            
            // 代码高亮
            problemDisplay.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }
        
        // 更新难度显示
        updateDifficultyBadge();
        
    } catch (error) {
        console.error('Error:', error);
        problemDisplay.innerHTML = '<p style="color: red;">生成题目失败，请重试</p>';
    }
}

// 提交代码
async function submitCode() {
    const code = document.getElementById('code-editor').value.trim();
    
    if (!code) {
        alert('请先编写代码');
        return;
    }
    
    const judgmentResult = document.getElementById('judgment-result');
    const judgmentContent = document.getElementById('judgment-content');
    
    judgmentResult.style.display = 'block';
    judgmentContent.innerHTML = '<p class="loading">正在评判代码，请稍候...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/submit_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code
            })
        });
        
        if (!response.ok) {
            throw new Error('提交失败');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        judgmentContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            
            // 实时渲染Markdown
            judgmentContent.innerHTML = marked.parse(fullText);
            
            // 代码高亮
            judgmentContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }
        
        // 检查是否正确并需要生成新题
        if (fullText.includes('评判结果：** 正确') || fullText.includes('评判结果：**正确')) {
            completedCount++;
            document.getElementById('completed-count').textContent = completedCount;
            
            // 检查是否升级难度
            if (fullText.includes('进入中等难度') || fullText.includes('挑战困难难度')) {
                currentDifficulty = fullText.includes('中等难度') ? '中等' : '困难';
                updateDifficultyBadge();
                
                // 自动生成新题
                setTimeout(() => {
                    if (confirm('恭喜通过！是否立即生成下一道题目？')) {
                        generateNewProblem();
                        document.getElementById('code-editor').value = '';
                        judgmentResult.style.display = 'none';
                    }
                }, 1000);
            } else if (fullText.includes('完全掌握')) {
                alert('🏆 恭喜！你已完全掌握所选知识点！');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        judgmentContent.innerHTML = '<p style="color: red;">提交失败，请重试</p>';
    }
}

// 获取辅导
async function getGuidance(type) {
    const code = document.getElementById('code-editor').value;
    const guidanceDisplay = document.getElementById('guidance-display');
    const guidanceTitle = document.getElementById('guidance-title');
    const guidanceContent = document.getElementById('guidance-content');
    
    // 显示辅导区域
    guidanceDisplay.style.display = 'block';
    
    // 设置标题
    const titleMap = {
        '思路': '💭 5步启发式 - 简洁思路引导',
        '框架': '🏗️ 智能审题 - 核心函数框架',
        '伪代码': '📋 代码分析 - 伪代码补充',
        '核心语句': '🔑 关键点拨 - 核心代码框架',
        '完整代码': '✅ 正确代码 - 完整实现'
    };
    guidanceTitle.textContent = titleMap[type] || '辅导内容';
    
    guidanceContent.innerHTML = '<p class="loading">正在生成辅导内容，请稍候...</p>';
    
    try {
        const response = await fetch('/api/xiaohang/get_guidance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: type,
                code: code
            })
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
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            
            // 实时渲染Markdown
            guidanceContent.innerHTML = marked.parse(fullText);
            
            // 代码高亮
            guidanceContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
            
            // 滚动到底部
            guidanceContent.scrollTop = guidanceContent.scrollHeight;
        }
        
    } catch (error) {
        console.error('Error:', error);
        guidanceContent.innerHTML = '<p style="color: red;">获取辅导失败，请重试</p>';
    }
}

// 关闭辅导
function closeGuidance() {
    document.getElementById('guidance-display').style.display = 'none';
}

// 更新难度徽章
function updateDifficultyBadge() {
    const badge = document.getElementById('current-difficulty');
    badge.textContent = currentDifficulty;
    badge.className = 'badge ' + currentDifficulty;
}

// 重新开始
async function restartSession() {
    if (!confirm('确定要重新选择知识点吗？当前进度将被清空。')) {
        return;
    }
    
    try {
        await fetch('/api/xiaohang/reset_session', {
            method: 'POST'
        });
        
        // 重置状态
        selectedTopics = [];
        sessionId = null;
        currentDifficulty = '简单';
        completedCount = 0;
        
        // 清空UI
        document.getElementById('code-editor').value = '';
        document.getElementById('judgment-result').style.display = 'none';
        document.getElementById('guidance-display').style.display = 'none';
        
        // 切换回选择阶段
        document.getElementById('stage-practice').classList.remove('active');
        document.getElementById('stage-selection').classList.add('active');
        
        // 重新初始化知识点网格
        initKnowledgeGrid();
        updateSelectionUI();
        
    } catch (error) {
        console.error('Error:', error);
        alert('重置失败，请刷新页面');
    }
}

// 配置marked选项
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});
