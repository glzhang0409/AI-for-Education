// 知识点检测功能交互逻辑

// 全局状态
let currentTab = 'knowledge'; // 'knowledge' 或 'error_analysis'
let currentAgent = 'core_teaching';
let teachingSessionId = null;
let errorAnalysisSessionId = null; // 错误代码分析使用独立的session
let selectedKnowledgeTopic = null;
let selectedErrorTopic = null;
let isStreaming = false;

// 知识点列表（从 TeachingAgent 获取）
const KNOWLEDGE_TOPICS = [
    { id: 'array', name: '数组 (Array)', description: '基础线性数据结构，连续内存存储' },
    { id: 'linked_list', name: '链表 (Linked List)', description: '节点指针连接的线性结构' },
    { id: 'stack', name: '栈 (Stack)', description: '后进先出 (LIFO) 的线性表' },
    { id: 'queue', name: '队列 (Queue)', description: '先进先出 (FIFO) 的线性表' },
    { id: 'tree', name: '树 (Tree)', description: '层级关系的非线性结构' },
    { id: 'graph', name: '图 (Graph)', description: '节点和边构成的复杂非线性结构' },
    { id: 'hash_table', name: '哈希表 (Hash Table)', description: '键值对映射的高效查找结构' },
    { id: 'heap', name: '堆 (Heap)', description: '特殊的完全二叉树，常用于优先级队列' }
];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initTeachingPage();
});

function initTeachingPage() {
    console.log('初始化知识点检测页面');

    // 加载知识点选项
    loadKnowledgeTopics();
    loadErrorTopics();

    // 绑定输入框事件
    const knowledgeInput = document.getElementById('knowledge-input');
    const errorInput = document.getElementById('error-input');

    // 自动调整文本框高度 - 已禁用，使用固定高度
    // function autoResize(textarea) {
    //     textarea.style.height = 'auto';
    //     textarea.style.height = textarea.scrollHeight + 'px';
    // }

    if (knowledgeInput) {
        // knowledgeInput.addEventListener('input', function() {
        //     autoResize(this);
        // });
        knowledgeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendKnowledgeMessage();
                // this.style.height = 'auto'; // 发送后重置高度
            }
        });
    }

    if (errorInput) {
        // errorInput.addEventListener('input', function() {
        //     autoResize(this);
        // });
        errorInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendErrorMessage();
                // this.style.height = 'auto'; // 发送后重置高度
            }
        });
    }
}

// 加载知识点学习选项
function loadKnowledgeTopics() {
    const container = document.getElementById('knowledge-topic-grid');
    if (!container) return;

    container.innerHTML = KNOWLEDGE_TOPICS.map(topic => `
        <label class="topic-option" data-topic-id="${topic.id}">
            <input type="radio" name="knowledge-topic" value="${topic.id}">
            <div>
                <strong>${topic.name}</strong>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">${topic.description}</div>
            </div>
        </label>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.topic-option').forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的选中状态
            container.querySelectorAll('.topic-option').forEach(opt => opt.classList.remove('selected'));
            // 添加当前选项的选中状态
            this.classList.add('selected');
            // 更新选中状态
            selectedKnowledgeTopic = this.dataset.topicId;
            // 启用开始按钮
            document.getElementById('start-knowledge-btn').disabled = false;
        });
    });
}

// 加载错误代码分析选项
function loadErrorTopics() {
    const container = document.getElementById('error-topic-grid');
    if (!container) return;

    container.innerHTML = KNOWLEDGE_TOPICS.map(topic => `
        <label class="topic-option" data-topic-id="${topic.id}">
            <input type="radio" name="error-topic" value="${topic.id}">
            <div>
                <strong>${topic.name}</strong>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">${topic.description}</div>
            </div>
        </label>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.topic-option').forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的选中状态
            container.querySelectorAll('.topic-option').forEach(opt => opt.classList.remove('selected'));
            // 添加当前选项的选中状态
            this.classList.add('selected');
            // 更新选中状态
            selectedErrorTopic = this.dataset.topicId;
            // 启用开始按钮
            document.getElementById('start-error-btn').disabled = false;
        });
    });
}

// Tab 切换
function switchTeachingTab(tab) {
    currentTab = tab;
    currentAgent = tab === 'knowledge' ? 'core_teaching' : 'error_analysis';

    // 更新 Tab 按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });

    console.log('切换到:', tab, 'Agent:', currentAgent);
}

// 获取当前功能的session ID
function getCurrentSessionId() {
    return currentAgent === 'core_teaching' ? teachingSessionId : errorAnalysisSessionId;
}

// 开始知识点学习
async function startKnowledgeLearning() {
    if (!selectedKnowledgeTopic) {
        alert('请先选择一个知识点');
        return;
    }

    const difficulty = document.querySelector('input[name="teaching-difficulty"]:checked').value;

    try {
        // 调用后端 API 选择知识点（使用独立的session_id）
        if (!teachingSessionId) {
            teachingSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        }

        const response = await fetch('/api/teaching/select-topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                agent_type: 'core_teaching',
                topic_ids: [selectedKnowledgeTopic], // 单选，只传一个
                difficulty: difficulty,
                session_id: teachingSessionId // 传递独立的session_id
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 切换到聊天界面
            document.getElementById('knowledge-selection').style.display = 'none';
            document.getElementById('knowledge-chat').style.display = 'grid';

            // 显示初始问题
            if (data.initial_response) {
                addMessage('knowledge', 'assistant', data.initial_response);
            }

            // 更新会话信息
            await updateTeachingInfo();
        } else {
            alert('开始学习失败: ' + (data.detail || data.message));
        }
    } catch (error) {
        console.error('开始学习失败:', error);
        alert('开始学习失败: ' + error.message);
    }
}

// 开始错误代码分析
async function startErrorAnalysis() {
    if (!selectedErrorTopic) {
        alert('请先选择一个知识点');
        return;
    }

    const difficulty = document.querySelector('input[name="error-difficulty"]:checked').value;

    try {
        // 调用后端 API 选择知识点（使用独立的session_id）
        if (!errorAnalysisSessionId) {
            errorAnalysisSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + '_error';
        }

        const response = await fetch('/api/teaching/select-topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                agent_type: 'error_analysis',
                topic_ids: [selectedErrorTopic], // 单选，只传一个
                difficulty: difficulty,
                session_id: errorAnalysisSessionId // 传递独立的session_id
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 切换到聊天界面
            document.getElementById('error-selection').style.display = 'none';
            document.getElementById('error-chat').style.display = 'grid';

            // 显示初始问题
            if (data.initial_response) {
                addMessage('error', 'assistant', data.initial_response);
            }

            // 更新会话信息（包括代码面板）
            await updateTeachingInfo();
        } else {
            alert('开始分析失败: ' + (data.detail || data.message));
        }
    } catch (error) {
        console.error('开始分析失败:', error);
        alert('开始分析失败: ' + error.message);
    }
}

// 发送知识点学习消息
async function sendKnowledgeMessage() {
    if (isStreaming) return;

    const input = document.getElementById('knowledge-input');
    const message = input.value.trim();

    if (!message) return;

    // 添加用户消息
    addMessage('knowledge', 'user', message);
    input.value = '';

    // 发送到后端（使用正确的session_id）
    await streamResponse('core_teaching', message, 'knowledge');
}

// 发送错误分析消息
async function sendErrorMessage() {
    if (isStreaming) return;

    const input = document.getElementById('error-input');
    const message = input.value.trim();

    if (!message) return;

    // 添加用户消息
    addMessage('error', 'user', message);
    input.value = '';

    // 发送到后端
    await streamResponse('error_analysis', message, 'error');
}

// 流式响应处理
async function streamResponse(agentType, message, tab) {
    isStreaming = true;

    const messagesContainer = document.getElementById(`${tab}-messages`);
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messagesContainer.appendChild(messageDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    messageDiv.appendChild(contentDiv);

    try {
        // 获取当前功能的session_id
        const sessionId = getCurrentSessionId();
        if (!sessionId) {
            throw new Error('No session ID');
        }

        const response = await fetch('/api/teaching/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                agent_type: agentType,
                message: message,
                session_id: sessionId  // 传递正确的session_id
            })
        });

        if (!response.ok) {
            throw new Error('请求失败: ' + response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));

                    if (data.content) {
                        fullContent += data.content;
                        contentDiv.innerHTML = marked ? marked.parse(fullContent) : fullContent;
                    }

                    // 实时更新进度信息（包括found_bugs）
                    if (data.progress) {
                        if (currentAgent === 'error_analysis') {
                            updateErrorCodePanel(data.progress);
                        } else if (currentAgent === 'core_teaching') {
                            if (data.progress) {
                                updateKnowledgeProgress(data.progress);
                            }
                        }
                    }

                    if (data.done) {
                        // 响应完成，再次更新面板信息确保数据最新
                        await updateTeachingInfo();
                    }
                }
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        contentDiv.innerHTML = `<span style="color: red;">错误: ${error.message}</span>`;
    } finally {
        isStreaming = false;
    }
}

// 添加消息到聊天区域
function addMessage(tab, role, content) {
    const messagesContainer = document.getElementById(`${tab}-messages`);

    // 移除欢迎消息
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = marked ? marked.parse(content) : content;

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 更新教学信息
async function updateTeachingInfo() {
    try {
        // 获取当前功能的session_id和agent_type
        const sessionId = getCurrentSessionId();
        if (!sessionId) {
            console.log('No session ID yet');
            return;
        }

        const response = await fetch(`/api/teaching/info?agent_type=${currentAgent}&session_id=${sessionId}`);
        if (!response.ok) return;

        const info = await response.json();

        if (currentAgent === 'core_teaching') {
            // 更新学习进度
            if (info.progress) {
                updateKnowledgeProgress(info.progress);
            }

            // 更新评分
            if (info.scores) {
                updateScores(info.scores);
            }
        } else if (currentAgent === 'error_analysis') {
            // 更新错误代码面板
            if (info.progress) {
                updateErrorCodePanel(info.progress);
            }
        }
    } catch (error) {
        console.error('更新教学信息失败:', error);
    }
}

// 更新学习进度
function updateKnowledgeProgress(progress) {
    const progressDiv = document.getElementById('knowledge-progress');
    if (!progress || !progressDiv) return;

    const currentTopic = progress.current_topic || '未知';
    const currentIndex = progress.current_index !== undefined ? progress.current_index : 0;
    const totalTopics = progress.total_topics || 1;

    // 显示进度：currentIndex 从 0 开始，所以显示为 currentIndex + 1
    const displayIndex = totalTopics > 0 ? currentIndex + 1 : 0;

    progressDiv.innerHTML = `
        <p><strong>当前知识点:</strong> ${currentTopic}</p>
        <p><strong>学习进度:</strong> ${displayIndex} / ${totalTopics}</p>
        ${progress.current_stage ? `<p><strong>当前阶段:</strong> ${progress.current_stage}</p>` : ''}
    `;
}

// 更新评分
function updateScores(scores) {
    const conceptScore = scores['概念理解'] || 0.5;
    const logicalScore = scores['逻辑思维'] || 0.5;
    const codeScore = scores['代码应用'] || 0.5;
    const criticalScore = scores['举一反三'] || 0.5;

    // 综合能力 = (逻辑思维 + 代码应用 + 举一反三) / 3
    const comprehensiveScore = (logicalScore + codeScore + criticalScore) / 3;

    document.getElementById('concept-score').style.width = (conceptScore * 100) + '%';
    document.getElementById('comprehensive-score').style.width = (comprehensiveScore * 100) + '%';
}

// 更新错误代码面板
function updateErrorCodePanel(progress) {
    const codeDisplay = document.getElementById('error-code-display');
    const foundBugs = document.getElementById('found-bugs');
    const totalBugs = document.getElementById('total-bugs');
    const progressFill = document.getElementById('error-progress-fill');

    if (codeDisplay && progress.current_code) {
        codeDisplay.textContent = progress.current_code;
        if (hljs) {
            hljs.highlightElement(codeDisplay);
        }
    }

    if (foundBugs && progress.found_bugs !== undefined) {
        foundBugs.textContent = progress.found_bugs;
    }

    if (totalBugs && progress.total_bugs !== undefined) {
        totalBugs.textContent = progress.total_bugs;
    }

    if (progressFill && progress.found_bugs !== undefined && progress.total_bugs) {
        const percentage = (progress.found_bugs / progress.total_bugs) * 100;
        progressFill.style.width = percentage + '%';
    }
}

// 下一题
async function nextErrorCode() {
    try {
        const sessionId = errorAnalysisSessionId;
        if (!sessionId) {
            alert('请先开始错误代码分析');
            return;
        }

        const response = await fetch('/api/teaching/next-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                session_id: sessionId
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 添加系统消息
            addMessage('error', 'assistant', data.response || '已切换到下一题');

            // 更新面板
            await updateTeachingInfo();
        } else {
            alert('切换失败: ' + (data.detail || data.message));
        }
    } catch (error) {
        console.error('切换失败:', error);
        alert('切换失败: ' + error.message);
    }
}

// 重置会话
async function resetTeachingSession(agentType) {
    if (!confirm('确定要重新开始吗？当前进度将会丢失。')) {
        return;
    }

    try {
        // 清空消息
        const messagesContainer = document.getElementById(`${agentType === 'core_teaching' ? 'knowledge' : 'error'}-messages`);
        messagesContainer.innerHTML = '<div class="welcome-message"><p>欢迎！请选择一个知识点开始。</p></div>';

        // 重置选择界面
        const selectionCard = document.getElementById(`${agentType === 'core_teaching' ? 'knowledge' : 'error'}-selection`);
        const chatArea = document.getElementById(`${agentType === 'core_teaching' ? 'knowledge' : 'error'}-chat`);

        selectionCard.style.display = 'block';
        chatArea.style.display = 'none';

        // 重置选中状态
        if (agentType === 'core_teaching') {
            selectedKnowledgeTopic = null;
            document.querySelectorAll('#knowledge-topic-grid .topic-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('start-knowledge-btn').disabled = true;
        } else {
            selectedErrorTopic = null;
            document.querySelectorAll('#error-topic-grid .topic-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('start-error-btn').disabled = true;
        }

        // 调用后端重置 API（可选）
        if (agentType === 'core_teaching') {
            teachingSessionId = null;
        } else {
            errorAnalysisSessionId = null;
        }

    } catch (error) {
        console.error('重置失败:', error);
        alert('重置失败: ' + error.message);
    }
}

// 复制错误代码到剪贴板
function copyErrorCode() {
    const codeElement = document.getElementById('error-code-display');
    const code = codeElement.textContent || codeElement.innerText;

    // 使用 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopy(code);
        });
    } else {
        // 回退方案
        fallbackCopy(code);
    }
}

// 回退复制方案
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            alert('复制失败，请手动复制');
        }
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }

    document.body.removeChild(textArea);
}

// 显示复制成功提示
function showCopySuccess() {
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✓ 已复制';
    copyBtn.classList.add('copied');

    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove('copied');
    }, 2000);
}
