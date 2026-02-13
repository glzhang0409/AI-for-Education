"""
核心教学 Agent - 融合费曼学习法与苏格拉底教学法
"""
import os
import sys
import json
import re
from enum import Enum
from typing import Dict, Any, List, Optional

# 添加 src 目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
src_dir = os.path.join(parent_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from llm_client import LLMClient
from teaching_agents.memory import AgentMemory


class CoreTeachingStage(Enum):
    """教学阶段"""
    SELECTION = "selection"        # 知识点选择
    CONCEPT_LEARNING = "concept"   # 概念学习（苏格拉底提问）
    CODE_ANALYSIS = "code"         # 代码分析（能力侧）
    COMPLETED = "completed"        # 完成所有学习


class KnowledgePoint:
    def __init__(self, id: str, name: str, description: str):
        self.id = id
        self.name = name
        self.description = description


class TeachingMode(Enum):
    KNOWLEDGE_LEARNING = "knowledge_learning"
    # ERROR_ANALYSIS = "error_analysis" # Moved to ErrorAnalysisAgent


class TeachingDimension(Enum):
    """教学评估维度"""
    CONCEPT_UNDERSTANDING = "概念理解"
    LOGICAL_THINKING = "逻辑思维"
    CODE_APPLICATION = "代码应用"
    CRITICAL_THINKING = "举一反三"


class CoreTeachingAgent:
    """
    核心教学 Agent - 专注于知识点学习
    """
    
    AVAILABLE_TOPICS = [
        KnowledgePoint("array", "数组 (Array)", "基础线性数据结构，连续内存存储"),
        KnowledgePoint("linked_list", "链表 (Linked List)", "节点指针连接的线性结构"),
        KnowledgePoint("stack", "栈 (Stack)", "后进先出 (LIFO) 的线性表"),
        KnowledgePoint("queue", "队列 (Queue)", "先进先出 (FIFO) 的线性表"),
        KnowledgePoint("tree", "树 (Tree)", "层级关系的非线性结构"),
        KnowledgePoint("graph", "图 (Graph)", "节点和边构成的复杂非线性结构"),
        KnowledgePoint("hash_table", "哈希表 (Hash Table)", "键值对映射的高效查找结构"),
        KnowledgePoint("heap", "堆 (Heap)", "特殊的完全二叉树，常用于优先级队列")
    ]

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="Core_Teacher")
        
        # 状态管理
        self.current_mode = TeachingMode.KNOWLEDGE_LEARNING
        self.selected_topics: List[str] = []
        self.current_topic_index: int = 0
        self.current_stage = CoreTeachingStage.SELECTION
        self.difficulty_level = "medium"  # easy, medium, hard
        
        # 学习进度追踪
        self.topic_status: Dict[str, Dict[str, Any]] = {}
        
        # 当前对话上下文
        self.last_question: Optional[str] = None
        self.waiting_for_answer: bool = False

        # 评估分数
        self.scores = {
            TeachingDimension.CONCEPT_UNDERSTANDING.value: 0.5,
            TeachingDimension.LOGICAL_THINKING.value: 0.5,
            TeachingDimension.CODE_APPLICATION.value: 0.5,
            TeachingDimension.CRITICAL_THINKING.value: 0.5
        }

    def reset(self):
        """重置状态"""
        self.selected_topics = []
        self.current_topic_index = 0
        self.current_stage = CoreTeachingStage.SELECTION
        self.topic_status = {}
        self.last_question = None
        self.waiting_for_answer = False
        for key in self.scores:
            self.scores[key] = 0.5
        self.memory.clear_session()

    def set_mode(self, mode: str):
        """设置教学模式 (已废弃，保留接口兼容)"""
        pass

    def set_difficulty(self, level: str):
        """设置难度"""
        if level in ["easy", "medium", "hard"]:
            self.difficulty_level = level

    def get_current_scores(self) -> Dict[str, float]:
        """获取当前评估分数"""
        return self.scores.copy()

    def get_comprehensive_scores(self) -> Dict[str, float]:
        """获取合并后的综合评分（用于前端显示）"""
        concept_score = self.scores[TeachingDimension.CONCEPT_UNDERSTANDING.value]
        logical_score = self.scores[TeachingDimension.LOGICAL_THINKING.value]
        code_score = self.scores[TeachingDimension.CODE_APPLICATION.value]
        critical_score = self.scores[TeachingDimension.CRITICAL_THINKING.value]

        # 综合能力 = (逻辑思维 + 代码应用 + 举一反三) / 3
        comprehensive_score = (logical_score + code_score + critical_score) / 3

        return {
            "概念理解": concept_score,
            "综合能力": comprehensive_score
        }

    def get_progress(self) -> Dict[str, Any]:
        """获取学习进度"""
        # 构造所有选中 topic 的状态详情，即使未开始也包含在内
        details = {}
        for tid in self.selected_topics:
            if tid in self.topic_status:
                details[tid] = self.topic_status[tid]
            else:
                details[tid] = {"completed": False, "status": "pending"}

        # 将当前 topic id 转换为 name
        current_topic_id = self.selected_topics[self.current_topic_index] if self.selected_topics and self.current_topic_index < len(self.selected_topics) else None
        current_topic_name = None
        if current_topic_id:
            topic = next((t for t in self.AVAILABLE_TOPICS if t.id == current_topic_id), None)
            if topic:
                current_topic_name = topic.name

        return {
            "completed_topics": [t for t, status in self.topic_status.items() if status.get("completed")],
            "current_topic": current_topic_name or "未知",
            "current_topic_id": current_topic_id,
            "total_topics": len(self.selected_topics),
            "current_index": self.current_topic_index,
            "stage": self.current_stage.value,
            "details": details
        }

    def set_selected_topics(self, topic_ids: List[str]) -> str:
        """设置选中的知识点并开始学习（单选模式，只使用第一个元素）"""
        valid_ids = [t.id for t in self.AVAILABLE_TOPICS]

        # 单选模式：只使用第一个元素
        if topic_ids and topic_ids[0] in valid_ids:
            self.selected_topics = [topic_ids[0]]
        else:
            self.selected_topics = []

        if not self.selected_topics:
            return "请至少选择一个知识点。"
            
        self.current_topic_index = 0
        
        # 初始化阶段
        self.current_stage = CoreTeachingStage.CONCEPT_LEARNING
        
        # 初始化第一个主题的状态
        current_topic_id = self.selected_topics[0]
        
        # 根据难度设置初始深度
        initial_depth = 1
        if self.difficulty_level == "medium":
            initial_depth = 2
        elif self.difficulty_level == "hard":
            initial_depth = 3
            
        # 默认子步骤
        default_milestones = {
            "concept": "概念理解",
            "example": "代码示例",
            "practice": "互动练习",
            "summary": "总结"
        }
            
        self.topic_status[current_topic_id] = {
            "stage": "concept", 
            "depth": initial_depth,
            "mistakes": 0,
            "mastery": 0,
            "milestones": {k: "pending" for k in default_milestones}, # pending, active, completed
            "milestone_names": default_milestones
        }
        
        # 激活第一个里程碑
        self.topic_status[current_topic_id]["milestones"]["concept"] = "active"
        
        # 生成第一个问题
        return self._generate_first_question(current_topic_id)

    def _update_stage(self, user_input: str, response_text: str = ""):
        """更新状态（兼容流式调用）"""
        # 如果没有传入 response_text，尝试从最近的 memory 获取（虽然通常 backend 会传）
        if not response_text:
            return

        # 1. 解析进度步骤标记 [STEP:xxx]
        step_match = re.search(r"\[STEP:(\w+)\]", response_text)
        current_topic_id = self.selected_topics[self.current_topic_index] if self.selected_topics else None
        
        if step_match and current_topic_id:
            next_step = step_match.group(1)
            
            if current_topic_id in self.topic_status:
                # 更新大阶段状态
                self.topic_status[current_topic_id]["stage"] = next_step
                
                # 更新子步骤里程碑状态
                milestones = self.topic_status[current_topic_id]["milestones"]
                step_order = ["concept", "example", "practice", "summary"]
                
                if next_step in step_order:
                    found_new = False
                    for s in step_order:
                        if s == next_step:
                            milestones[s] = "active"
                            found_new = True
                        elif not found_new:
                            milestones[s] = "completed"
                        else:
                            milestones[s] = "pending"

        # 2. 解析评分标记 [SCORE:xxx]
        score_match = re.search(r"\[SCORE:(\d+)\]", response_text)
        if score_match:
            score_val = int(score_match.group(1)) / 100.0
            # 简单更新逻辑：根据当前阶段更新不同维度的分数
            if current_topic_id and current_topic_id in self.topic_status:
                stage = self.topic_status[current_topic_id].get("stage", "concept")
                
                target_dim = TeachingDimension.CONCEPT_UNDERSTANDING.value
                if stage == "example" or stage == "code":
                    target_dim = TeachingDimension.CODE_APPLICATION.value
                elif stage == "practice":
                    target_dim = TeachingDimension.LOGICAL_THINKING.value
                elif stage == "summary":
                    target_dim = TeachingDimension.CRITICAL_THINKING.value
                
                # 平滑更新
                old_score = self.scores[target_dim]
                self.scores[target_dim] = old_score * 0.7 + score_val * 0.3
                
                # 更新掌握程度
                current_mastery = self.topic_status[current_topic_id].get("mastery", 0)
                new_mastery = min(100, current_mastery + (score_val * 10))
                self.topic_status[current_topic_id]["mastery"] = int(new_mastery)

        # 3. 检查切换信号
        if "[TOPIC_COMPLETED]" in response_text:
            if current_topic_id in self.topic_status:
                self.topic_status[current_topic_id]["mastery"] = 100
            self._advance_topic()
            # 注意：流式输出中，我们无法像 chat() 那样追加文本到 response，
            # 这里只能更新状态。实际的文本生成在 backend.py 中已经完成。
            # 如果需要自动开始下一个话题，backend.py 需要处理，或者 LLM 已经生成了。
            
    def _get_stage_prompt(self) -> str:
        """获取流式对话的阶段 Prompt"""
        if not self.selected_topics or self.current_stage == CoreTeachingStage.COMPLETED:
            return ""
        
        current_topic_id = self.selected_topics[self.current_topic_index]
        current_topic = next(t for t in self.AVAILABLE_TOPICS if t.id == current_topic_id)
        topic_state = self.topic_status.get(current_topic_id, {})
        
        # 尝试获取最近的用户输入
        last_user_input = "..."
        memories = self.memory.short_term.get_all()
        if memories:
            last_msg = memories[-1]
            if "学生" in last_msg.content:
                last_user_input = last_msg.content.replace("学生: ", "")
        
        return self._build_stage_prompt(current_topic, topic_state, last_user_input)

    def chat(self, user_input: str) -> str:
        """
        核心对话逻辑
        """
        # 0. 检查特殊指令
        if user_input.strip() == "[FORCE_NEXT_TOPIC]":
            response_text = "好的，我们跳过当前知识点，进入下一个。"
            self._advance_topic()
            if self.current_stage != CoreTeachingStage.COMPLETED:
                next_topic_id = self.selected_topics[self.current_topic_index]
                next_topic = next(t for t in self.AVAILABLE_TOPICS if t.id == next_topic_id)
                response_text += f"\n\n接下来，我们开始学习 **{next_topic.name}**。"
                
                initial_depth = 1
                if self.difficulty_level == "medium":
                    initial_depth = 2
                elif self.difficulty_level == "hard":
                    initial_depth = 3
                
                initial_stage = "concept"
                self.topic_status[next_topic_id] = {
                    "stage": initial_stage, 
                    "depth": initial_depth, 
                    "mistakes": 0, 
                    "mastery": 0
                }
                
                first_q = self._generate_first_question(next_topic_id)
                response_text += f"\n\n{first_q}"
            return response_text

        # 1. 如果还在选择阶段
        if self.current_stage == CoreTeachingStage.SELECTION:
            return "请先在左侧选择要学习的知识点。"

        # 2. 记录用户输入
        self.memory.add_memory(
            f"学生: {user_input}",
            importance=0.8,
            tags=["student_input"],
            level="short"
        )

        # 3. 如果已经完成所有学习
        if self.current_stage == CoreTeachingStage.COMPLETED:
            return "恭喜你！你已经完成了所有选定知识点的学习。需要开始新的学习吗？"

        # 4. 获取当前上下文
        current_topic_id = self.selected_topics[self.current_topic_index]
        current_topic = next(t for t in self.AVAILABLE_TOPICS if t.id == current_topic_id)
        topic_state = self.topic_status.get(current_topic_id, {})
        
        # 5. 构建 Prompt 进行评估和生成下一步
        # 我们需要判断用户的回答质量，并决定是深入、浅出还是进入代码环节
        
        system_prompt = self._build_system_prompt()
        stage_prompt = self._build_stage_prompt(current_topic, topic_state, user_input)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": stage_prompt}
        ]
        
        # 添加最近的历史记录（避免过长）
        recent_memories = self.memory.short_term.get_all()[-6:] 
        for m in recent_memories:
            messages.append({"role": "user", "content": m.content})
            
        # 调用 LLM
        response = self.llm_client.chat(messages=messages)
        response_text = response["content"]
        
        # 6. 解析 LLM 的意图（这一步可以通过结构化输出来优化，这里先用文本分析）
        # 我们假设 LLM 会在回复中包含下一步的指示，或者我们直接让 LLM 扮演老师输出回复
        # 为了更好地控制流程，我们可以让 LLM 输出 JSON，但为了兼容流式输出，我们让 LLM 直接输出对话，
        # 并在内部维护状态。
        
        # 这里我们需要一种机制来判断是否该切换话题或阶段。
        # 简单起见，我们让 LLM 在回复末尾带上特殊标记，或者完全由 LLM 的上下文判断来驱动。
        # 鉴于 user_input 已经传入，LLM 应该评估 user_input 并给出反馈 + 下一个问题。
        
        # 记录回复
        self.memory.add_memory(
            f"老师: {response_text}",
            importance=0.8,
            tags=["teacher_response"],
            level="short"
        )
        
        self.last_question = response_text
        
        # 解析进度步骤标记 [STEP:xxx]
        step_match = re.search(r"\[STEP:(\w+)\]", response_text)
        if step_match:
            next_step = step_match.group(1)
            response_text = response_text.replace(step_match.group(0), "")
            
            if current_topic_id in self.topic_status:
                # 更新大阶段状态
                self.topic_status[current_topic_id]["stage"] = next_step
                
                # 更新子步骤里程碑状态
                milestones = self.topic_status[current_topic_id]["milestones"]
                step_order = ["concept", "example", "practice", "summary"]
                
                if next_step in step_order:
                    found_new = False
                    for s in step_order:
                        if s == next_step:
                            milestones[s] = "active"
                            found_new = True
                        elif not found_new:
                            milestones[s] = "completed"
                        else:
                            milestones[s] = "pending"

        # 检查是否包含切换信号
        if "[TOPIC_COMPLETED]" in response_text:
            response_text = response_text.replace("[TOPIC_COMPLETED]", "")
            
            # 更新掌握程度为 100%
            if current_topic_id in self.topic_status:
                self.topic_status[current_topic_id]["mastery"] = 100
            
            self._advance_topic()
            if self.current_stage != CoreTeachingStage.COMPLETED:
                next_topic_id = self.selected_topics[self.current_topic_index]
                next_topic = next(t for t in self.AVAILABLE_TOPICS if t.id == next_topic_id)
                response_text += f"\n\n太棒了！你已经完全掌握了这个知识点。\n接下来，我们开始学习 **{next_topic.name}**。"
                
                initial_depth = 1
                if self.difficulty_level == "medium":
                    initial_depth = 2
                elif self.difficulty_level == "hard":
                    initial_depth = 3
                
                initial_stage = "concept"
                self.topic_status[next_topic_id] = {
                    "stage": initial_stage, 
                    "depth": initial_depth, 
                    "mistakes": 0, 
                    "mastery": 0
                }
                
                first_q = self._generate_first_question(next_topic_id)
                response_text += f"\n\n{first_q}"
        
        # 简单估算掌握程度（基于深度和阶段）
        # 概念阶段：深度 1-5 对应 10%-50%
        # 代码阶段：深度 1-5 对应 60%-100%
        if current_topic_id in self.topic_status:
            state = self.topic_status[current_topic_id]
            base_score = 0
            if state["stage"] == "concept":
                base_score = state.get("depth", 1) * 10
            elif state["stage"] == "code":
                base_score = 50 + (state.get("depth", 1) * 10)
            
            # 只有当新估算的分数更高时才更新（避免倒退）
            if base_score > state.get("mastery", 0):
                state["mastery"] = base_score

        return response_text

    def force_next_topic(self) -> str:
        """强制进入下一个主题（API调用）"""
        return self.chat("[FORCE_NEXT_TOPIC]")

    def get_progress(self) -> Dict[str, Any]:
        """获取学习进度"""
        if self.current_stage == CoreTeachingStage.SELECTION:
            return {
                "current_topic": None,
                "current_topic_id": None,
                "current_index": 0,
                "total_topics": 0,
                "status": "请先选择知识点"
            }

        if self.current_stage == CoreTeachingStage.COMPLETED:
            return {
                "current_topic": "已完成",
                "current_topic_id": None,
                "current_index": len(self.selected_topics),
                "total_topics": len(self.selected_topics),
                "status": "已完成所有学习",
                "mode": "knowledge_learning"
            }

        # 当前进度
        current_topic_id = self.selected_topics[self.current_topic_index]
        current_topic = next((t for t in self.AVAILABLE_TOPICS if t.id == current_topic_id), None)
        topic_state = self.topic_status.get(current_topic_id, {})

        stage_map = {"concept": "概念理解", "code": "代码分析"}
        stage_name = stage_map.get(topic_state.get("stage", "concept"), "未知")

        return {
            "current_topic": current_topic.name if current_topic else "未知",
            "current_topic_id": current_topic_id,
            "current_index": self.current_topic_index,
            "total_topics": len(self.selected_topics),
            "current_stage": stage_name,
            "difficulty_depth": f"{topic_state.get('depth', 1)}/5",
            "remaining_topics": len(self.selected_topics) - self.current_topic_index - 1,
            "mode": "knowledge_learning"
        }

    def _get_topics_status_list(self) -> List[Dict[str, Any]]:
        """获取所有已选主题的详细状态列表"""
        status_list = []
        for tid in self.selected_topics:
            topic = next(t for t in self.AVAILABLE_TOPICS if t.id == tid)
            state = self.topic_status.get(tid, {})
            
            # 判断状态
            is_current = (self.current_stage != CoreTeachingStage.COMPLETED and 
                         self.selected_topics[self.current_topic_index] == tid)
            is_completed = state.get("mastery", 0) >= 100 or (
                not is_current and self.selected_topics.index(tid) < self.current_topic_index
            )
            
            status_list.append({
                "id": tid,
                "name": topic.name,
                "mastery": state.get("mastery", 0),
                "is_current": is_current,
                "is_completed": is_completed,
                "stage": state.get("stage", "concept")
            })
        return status_list

    def _advance_topic(self):
        """推进到下一个主题"""
        self.current_topic_index += 1
        if self.current_topic_index >= len(self.selected_topics):
            self.current_stage = CoreTeachingStage.COMPLETED
        else:
            self.current_stage = CoreTeachingStage.CONCEPT_LEARNING

    def _generate_first_question(self, topic_id: str) -> str:
        """生成特定主题的第一个基础问题"""
        topic = next(t for t in self.AVAILABLE_TOPICS if t.id == topic_id)
        
        prompt = f"""
        你是一位循循善诱的计算机科学老师。
        学生刚开始学习知识点：{topic.name} ({topic.description})。
        请提出了一个最基础、最简单的问题来启动教学。
        问题应该聚焦于该概念的核心定义或生活中的类比。
        不要长篇大论，只提一个问题。
        """
        
        messages = [{"role": "system", "content": prompt}]
        response = self.llm_client.chat(messages=messages)
        text = response["content"]
        
        self.memory.add_memory(
            f"老师: {text}",
            importance=0.8,
            tags=["teacher_response", "first_question"],
            level="short"
        )
        self.last_question = text
        return text

    def _build_system_prompt(self) -> str:
        return """你是一位精通费曼学习法和苏格拉底教学法的计算机科学导师。
你的目标是帮助学生彻底掌握数据结构知识点。

【核心原则】
1. **主动提问**：永远是你问学生，而不是学生问你。
2. **循序渐进**：从最基础的概念开始，逐步深入。
3. **费曼学习法**：
   - 发现学生回答模糊或错误时，用通俗易懂的语言（生活类比）重新解释。
   - 解释后，要求学生用自己的话复述。
4. **苏格拉底追问**：
   - 学生回答正确时，不要只说"对"，要追问"为什么"、"底层原理"或"更复杂的情况"。
   - 引导学生自己发现真理。

【教学流程】
1. **概念阶段**：确保学生理解定义、特点、优缺点。
2. **代码分析阶段**：给出代码段（可能包含错误或低效写法），让学生分析。
3. **完成判断**：只有当学生在概念和代码分析都表现良好时，才允许进入下一个知识点。

【交互规则】
- 语气亲切、鼓励，但对知识点要求严谨。
- 每次回复的结尾必须是一个明确的问题（除非是恭喜完成）。
- 如果学生拒绝回答或不知道，降低难度，给出提示或类比解释，然后问一个更简单的问题。
"""

    def _build_stage_prompt(self, topic: KnowledgePoint, state: Dict, user_input: str) -> str:
        """
        根据当前状态构建阶段性 Prompt
        """
        stage = state.get("stage", "concept")
        depth = state.get("depth", 1)
        mistakes = state.get("mistakes", 0)
        milestones = state.get("milestones", {})
        
        # 确定当前活跃的里程碑
        current_milestone = "concept"
        for m, status in milestones.items():
            if status == "active":
                current_milestone = m
                break
        
        base_prompt = f"""
【当前教学状态】
- 知识点: {topic.name} ({topic.description})
- 阶段: {stage}
- 深度: Level {depth} (1-5)
- 当前环节: {current_milestone} (概念理解 -> 代码示例 -> 互动练习 -> 总结)

【你的任务】
1. 评估学生的回答 "{user_input}" 是否正确理解了当前内容。
2. 根据评估结果，决定下一步行动：
   - 如果回答正确且深入，推进到下一个环节。
   - 如果回答模糊或错误，进行引导或纠正，保持在当前环节。
3. **重要**：
   - 如果决定切换环节，请在回复开头输出标记 `[STEP:环节代码]` (例如 `[STEP:example]`)。
   - 请对学生的回答质量进行评分（0-100），并输出标记 `[SCORE:分数]` (例如 `[SCORE:85]`)，请将此标记放在回复的最后。
   - 环节代码：concept, example, practice, summary
   - 如果当前环节已是 summary 且学生理解良好，输出 `[TOPIC_COMPLETED]`.

【教学策略】
- 费曼学习法：要求学生用简单的语言解释。
- 苏格拉底提问：通过提问引导思考，而不是直接给答案。
- 难度适应：当前难度 Level {depth}，请调整问题深度。
"""
        return base_prompt
