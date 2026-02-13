"""
错误代码分析 Agent - 专注于引导学生发现和修复代码错误
"""
import os
import sys
from typing import Dict, Any, List, Optional
from enum import Enum

# 添加 src 目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
src_dir = os.path.join(parent_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from llm_client import LLMClient
from teaching_agents.memory import AgentMemory
from teaching_agents.core_teaching_agent import KnowledgePoint, CoreTeachingAgent  # 复用 KnowledgePoint 定义

class ErrorAnalysisAgent:
    """
    错误代码分析 Agent
    
    逻辑：
    1. 用户选择知识点和难度
    2. Agent 提供该知识点的典型错误代码（C语言）
    3. Agent 引导学生分析代码中的错误
    4. 学生找到错误后，Agent 确认并解释
    5. 支持切换到下一个错误案例
    """
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="Error_Analyst")
        
        # 状态管理
        self.selected_topics: List[str] = []
        self.current_topic_index: int = 0
        self.difficulty_level = "medium"
        self.current_code_snippet: Optional[str] = None
        self.current_error_type: Optional[str] = None # 记录当前代码的主要错误类型，用于 Prompt
        
        # Bug 追踪
        self.current_bugs_list: List[str] = [] # 当前代码包含的 Bug 列表
        self.found_bugs_count: int = 0         # 已发现的 Bug 数量
        self.total_bugs_count: int = 0         # 总 Bug 数量
        
        # 复用 CoreTeachingAgent 的知识点定义
        self.AVAILABLE_TOPICS = CoreTeachingAgent.AVAILABLE_TOPICS
        
    def reset(self):
        """重置状态"""
        self.selected_topics = []
        self.current_topic_index = 0
        self.current_code_snippet = None
        self.current_error_type = None
        self.current_bugs_list = []
        self.found_bugs_count = 0
        self.total_bugs_count = 0
        self.memory.clear_session()

    def set_difficulty(self, level: str):
        """设置难度"""
        if level in ["easy", "medium", "hard"]:
            self.difficulty_level = level

    def set_selected_topics(self, topic_ids: List[str]) -> str:
        """设置选中的知识点并开始（单选模式，只使用第一个元素）"""
        valid_ids = [t.id for t in self.AVAILABLE_TOPICS]

        # 单选模式：只使用第一个元素
        if topic_ids and topic_ids[0] in valid_ids:
            self.selected_topics = [topic_ids[0]]
        else:
            self.selected_topics = []

        if not self.selected_topics:
            return "请至少选择一个知识点。"
            
        self.current_topic_index = 0
        
        # 加载第一个代码片段
        return self._load_next_code_snippet()

    def _load_next_code_snippet(self) -> str:
        """加载当前主题的代码片段并生成开场白"""
        if self.current_topic_index >= len(self.selected_topics):
            return "恭喜！你已经完成了所有选中知识点的错误分析。可以点击“新对话”重新开始。"
            
        topic_id = self.selected_topics[self.current_topic_index]
        topic = next(t for t in self.AVAILABLE_TOPICS if t.id == topic_id)
        
        self.current_code_snippet, self.current_error_type = self._get_code_snippet(topic_id)

        intro = f"""请仔细查看左侧的代码，这段代码中存在{self.difficulty_level}难度的错误。找出代码中的问题并告诉我你的发现。"""
        
        self.memory.add_memory(
            f"导师: {intro}",
            importance=0.8,
            tags=["tutor_init"],
            level="short"
        )
        return intro

    def next_question(self) -> str:
        """切换到下一个错误代码（或者强制跳过）"""
        self.current_topic_index += 1
        return self._load_next_code_snippet()

    def get_progress(self) -> Dict[str, Any]:
        """获取进度"""
        current_topic_id = self.selected_topics[self.current_topic_index] if self.current_topic_index < len(self.selected_topics) else None
        current_topic_name = None
        if current_topic_id:
            topic = next((t for t in self.AVAILABLE_TOPICS if t.id == current_topic_id), None)
            if topic:
                current_topic_name = topic.name

        return {
            "current_topic": current_topic_name or "未知",
            "current_topic_id": current_topic_id,
            "current_topic_index": self.current_topic_index,
            "total_topics": len(self.selected_topics),
            "found_bugs": self.found_bugs_count,
            "total_bugs": self.total_bugs_count,
            "current_code": self.current_code_snippet or ""
        }

    def chat(self, user_input: str) -> str:
        """核心对话逻辑"""
        # 检查特殊指令
        if user_input.strip() == "[NEXT_CODE]":
            self.current_topic_index += 1
            if self.current_topic_index >= len(self.selected_topics):
                return "恭喜！你已经完成了所有选中知识点的错误分析。"
            return self._load_next_code_snippet()

        # 如果还没有开始
        if not self.selected_topics:
            return "请先在左侧选择要分析的知识点。"

        self.memory.add_memory(
            f"学生: {user_input}",
            importance=0.8,
            tags=["student_input"],
            level="short"
        )

        # 构建 Prompt
        system_prompt = self._build_system_prompt()
        task_prompt = self._build_task_prompt(user_input)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": task_prompt}
        ]
        
        # 添加历史
        recent_memories = self.memory.short_term.get_all()[-6:]
        for m in recent_memories:
            messages.append({"role": "user", "content": m.content})

        # 调用 LLM
        response = self.llm_client.chat(messages=messages)
        response_text = response["content"]
        
        # 检查是否有 [BUG_FOUND] 信号
        if "[BUG_FOUND]" in response_text:
            self.found_bugs_count = min(self.found_bugs_count + 1, self.total_bugs_count)
            # 移除信号，不显示给用户
            response_text = response_text.replace("[BUG_FOUND]", "").strip()
        
        self.memory.add_memory(
            f"导师: {response_text}",
            importance=0.8,
            tags=["tutor_response"],
            level="short"
        )
        
        return response_text
    def _get_code_snippet(self, topic_id: str) -> tuple[str, str]:
        """通过 LLM 生成 C 语言错误代码片段"""
        
        topic_name = next((t.name for t in self.AVAILABLE_TOPICS if t.id == topic_id), topic_id)
        
        system_prompt = f"""你是一位专业的 C 语言编程导师，专注于通过“错误代码分析”来教学。
你的任务是编写一段包含特定错误的 C 语言代码，用于测试学生是否能发现这些错误。
代码主题：{topic_name}
难度等级：{self.difficulty_level}

请按以下格式返回结果（不要包含 Markdown 代码块标记，直接返回内容）：
[CODE_START]
<这里是 C 语言代码，必须包含至少 1-2 个典型的、隐蔽的错误。代码行数控制在 15-30 行之间。不要在代码注释中直接指出错误！>
[CODE_END]
[BUGS_START]
<这里列出所有的 Bug，每行一个，格式为：1. 错误描述>
[BUGS_END]
"""
        
        try:
            # 调用 LLM 生成代码
            messages = [{"role": "system", "content": system_prompt}]
            response = self.llm_client.chat(messages=messages)
            content = response["content"]
            
            # 解析返回内容
            code = ""
            bugs = []
            
            if "[CODE_START]" in content and "[CODE_END]" in content:
                code = content.split("[CODE_START]")[1].split("[CODE_END]")[0].strip()
            else:
                code = content
                
            if "[BUGS_START]" in content and "[BUGS_END]" in content:
                bugs_text = content.split("[BUGS_START]")[1].split("[BUGS_END]")[0].strip()
                bugs = [line.strip() for line in bugs_text.split('\n') if line.strip()]
            
            # 更新状态
            self.current_bugs_list = bugs
            self.total_bugs_count = len(bugs)
            self.found_bugs_count = 0
            
            return code, f"包含 {len(bugs)} 个错误"
            
        except Exception as e:
            print(f"Error generating code: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to a simple static example if generation fails
            fallback_code = f"""
// {topic_name} 代码生成失败，使用备用示例
#include <stdio.h>
#include <stdlib.h>

void example_function() {{
    int* ptr = (int*)malloc(sizeof(int));
    *ptr = 10;
    // 潜在错误：忘记释放内存
    printf("%d\\n", *ptr);
}}
"""
            # 更新状态（即使是备用代码也要设置）
            self.current_bugs_list = ["内存泄漏：未释放 malloc 分配的内存"]
            self.total_bugs_count = 1
            self.found_bugs_count = 0

            return (fallback_code, "内存泄漏 (备用示例)")

    def _build_system_prompt(self) -> str:
        return """你是一位严谨但循循善诱的 C 语言代码审查导师。
你的核心职责是**引导**学生自己发现代码中的 Bug，而不是展示你的知识。

【重要原则】
1. **绝对禁止**直接告诉学生答案或错误在哪一行。
2. **必须**通过提问的方式引导。例如：
   - ❌ 错误：第5行的循环条件错了，应该是 < size。
   - ✅ 正确：请仔细看看第5行的循环终止条件，当 i 等于 size 时，会发生什么？
3. 当学生回答错误时，不要急于纠正，而是让他去模拟代码执行。
4. 只有当学生明确指出了错误，你才能确认并解释原理。
5. 每次回复都要短小精悍，不要长篇大论。
"""

    def _build_task_prompt(self, user_input: str) -> str:
        current_topic = self.selected_topics[self.current_topic_index] if self.current_topic_index < len(self.selected_topics) else "未知"
        
        return f"""
【当前任务】
正在分析知识点：**{current_topic}** 的 C 语言代码实现。
代码中包含的总 Bug 数：{self.total_bugs_count}
已发现的 Bug 数：{self.found_bugs_count}
Bug 列表（仅供导师参考，不可直接泄露给学生）：
{chr(10).join(self.current_bugs_list)}

【学生的回答】
"{user_input}"

【你的行动】
1. 分析学生的回答是否指出了代码中的某个**尚未被发现**的 Bug。
2. 如果学生发现了一个**新**的 Bug：
   - 请在回复的**最开头**加上标记 `[BUG_FOUND]`。
   - 表扬并详细解释该错误的原理。
   - 询问学生如何修复。
3. 如果学生没有找到错误或回答错误：
   - 不要直接给出答案。
   - 针对特定的错误行给出提示。
4. 如果所有 Bug 都已发现：
   - 恭喜学生，并提示可以点击“下一题”。

请生成导师的回复。
"""
