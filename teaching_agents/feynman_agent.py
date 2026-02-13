"""
费曼学习法 Agent - 编程概念解释专家
专门帮助学生深入理解复杂的编程概念
"""
import os
import sys

# 添加 src 目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
src_dir = os.path.join(parent_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from llm_client import LLMClient
from teaching_agents.memory import AgentMemory
from typing import Dict, Any, List
from enum import Enum


class FeynmanStage(Enum):
    """费曼学习法的四个阶段"""
    CONCEPT_SELECTION = "concept_selection"  # 概念选择
    EXPLANATION = "explanation"  # 尝试解释
    GAP_ANALYSIS = "gap_analysis"  # 发现理解盲点
    CODE_SIMPLIFICATION = "code_simplification"  # 代码简化


class FeynmanAgent:
    """
    费曼学习法 Agent - 编程概念解释专家

    核心理念：如果你不能用简单的语言解释一个编程概念，说明你没有真正理解它

    四个步骤：
    1. 选择概念：确定要理解的编程概念
    2. 简单解释：用初学者能懂的语言解释（避免术语）
    3. 发现盲点：识别理解中的模糊或不准确之处
    4. 代码简化：用简单的代码示例验证理解

    适用场景：
    - 理解复杂的编程概念（递归、闭包、异步等）
    - 掌握设计模式和算法
    - 深入理解语言特性
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="Feynman_Programming")
        self.current_stage = FeynmanStage.CONCEPT_SELECTION
        self.current_concept = None
        self.explanation_history = []
        self.knowledge_gaps = []
        self.code_examples = []

    def reset(self):
        """重置Agent状态"""
        self.current_stage = FeynmanStage.CONCEPT_SELECTION
        self.current_concept = None
        self.explanation_history = []
        self.knowledge_gaps = []
        self.code_examples = []
        self.memory.clear_session()

    def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        return """你是费曼学习法编程导师，你的目标是帮助程序员深入理解编程概念。

核心理念：
"如果你不能用简单的语言解释它，你就没有真正理解它" - 费曼

你的专长：
- 帮助程序员理解复杂的编程概念
- 鼓励用最简单的语言和比喻
- 识别理解中的盲点和误区
- 通过代码示例验证理解

教学原则：
1. 要求用初学者能懂的语言（就像教一个完全不会编程的朋友）
2. 鼓励使用生活化的类比（如用"快递员"类比"消息队列"）
3. 避免专业术语，或者先解释术语
4. 用简单的代码示例来说明概念
5. 追问细节来暴露理解盲点
6. 承认自己的困惑，一起探索

互动风格：
- 友好、鼓励、但严格要求准确性
- 总是问"为什么"而不是直接告诉答案
- 经常说"能否更简单一点？"
- 鼓励用代码来验证理解

常见编程概念：
- 基础：变量、函数、循环、条件
- 进阶：递归、闭包、装饰器、生成器
- 高级：异步编程、并发、内存管理
- 算法：排序、搜索、动态规划
- 设计模式：单例、工厂、观察者等"""

    def _get_stage_prompt(self) -> str:
        """获取当前阶段的提示词"""
        context = self.memory.get_context()

        if self.current_stage == FeynmanStage.CONCEPT_SELECTION:
            return f"""{context}

【阶段：选择编程概念】

请引导学生选择一个想要深入理解的编程概念。

建议概念分类：
1. 语言特性：闭包、装饰器、迭代器、生成器、上下文管理器
2. 编程范式：面向对象、函数式编程、响应式编程
3. 核心概念：递归、异步、并发、指针、引用
4. 算法思想：动态规划、贪心、分治、回溯
5. 设计模式：单例、工厂、策略、观察者
6. 架构概念：MVC、微服务、事件驱动

用友好、好奇的方式开始对话。"""

        elif self.current_stage == FeynmanStage.EXPLANATION:
            return f"""{context}

【阶段：尝试解释】

当前概念：{self.current_concept}

现在要求学生：
1. 用最简单的语言解释这个概念（就像教一个编程新手）
2. 使用生活中的类比或比喻
3. 尽量避免专业术语，或者用简单语言解释术语
4. 如果能用伪代码或简单代码示例更好

评估标准：
- ✅ 清晰简单：用日常语言就能理解
- ✅ 有类比：用了生活中的例子
- ⚠️ 有术语：要求用简单词替换
- ⚠️ 太抽象：要求举具体例子
- ❌ 照本宣科：要求用自己的话重新说

给予具体反馈，指出哪里清晰、哪里模糊。"""

        elif self.current_stage == FeynmanStage.GAP_ANALYSIS:
            return f"""{context}

【阶段：发现理解盲点】

当前概念：{self.current_concept}

你的任务是深入挖掘学生的理解，找出盲点：

追问策略：
1. "这个概念和XXX有什么区别？"（对比理解）
2. "如果不这样会怎样？"（反向思考）
3. "能举个反例吗？"（边界情况）
4. "底层原理是什么？"（深入本质）
5. "为什么需要这个概念？"（理解动机）
6. "什么时候用错了会有问题？"（常见陷阱）

记录发现的问题：
- 概念混淆：和其他概念搞混
- 理解不深：知其然不知其所以然
- 边界不清：不知道适用范围
- 常见误区：典型的错误理解

记住：发现盲点是进步的机会，要鼓励学生！"""

        elif self.current_stage == FeynmanStage.CODE_SIMPLIFICATION:
            return f"""{context}

【阶段：代码简化验证】

当前概念：{self.current_concept}
已发现的盲点：{len(self.knowledge_gaps)} 个

现在要求学生：
1. 写一个最简单的代码示例来演示这个概念
2. 代码要能运行，并展示核心特性
3. 每一行代码都要能解释清楚
4. 如果可能，用注释说明每一步

对代码的要求：
- 简洁：不超过20行（除非必要）
- 清晰：变量名要有意义
- 可运行：实际能执行的代码
- 有输出：能看到效果

最终检验：
- 学生能否用3句话总结这个概念？
- 能否用一个简单的代码片段演示？
- 能否说出什么时候应该用、什么时候不该用？
- 能否说出常见的坑和如何避免？"""

        return ""

    def chat(self, user_input: str) -> str:
        """
        与学生对话

        Args:
            user_input: 学生输入

        Returns:
            Agent回复
        """
        # 记录学生输入
        self.memory.add_memory(
            f"学生: {user_input}",
            importance=0.6,
            tags=["student_input"],
            level="short"
        )

        # 构建消息
        messages = [
            {"role": "system", "content": self._build_system_prompt()},
            {"role": "system", "content": self._get_stage_prompt()},
        ]

        # 添加对话历史
        for memory in self.memory.short_term.get_all():
            messages.append({
                "role": "user",
                "content": memory.content
            })

        # 调用LLM
        response = self.llm_client.chat(messages=messages)
        response_text = response["content"]

        # 记录Agent回复
        self.memory.add_memory(
            f"费曼导师: {response_text}",
            importance=0.7,
            tags=["tutor_response"],
            level="short"
        )

        # 智能阶段转换
        self._update_stage(user_input)

        return response_text

    def _update_stage(self, user_input: str):
        """根据对话内容更新阶段"""
        user_lower = user_input.lower()

        if self.current_stage == FeynmanStage.CONCEPT_SELECTION:
            # 如果学生提供了概念名称
            if len(user_input) > 2 and not any(word in user_lower for word in ["不知道", "不确定", "帮我选", "哪个"]):
                self.current_concept = user_input
                self.current_stage = FeynmanStage.EXPLANATION

                # 记录概念到长期记忆
                self.memory.add_memory(
                    f"学习概念: {self.current_concept}",
                    importance=0.9,
                    tags=["concept", self.current_concept],
                    level="long"
                )

        elif self.current_stage == FeynmanStage.EXPLANATION:
            # 如果学生提供了详细的解释（超过50字）
            if len(user_input) > 50:
                self.explanation_history.append(user_input)
                self.current_stage = FeynmanStage.GAP_ANALYSIS

                # 保存解释到中期记忆
                self.memory.add_memory(
                    f"学生解释: {user_input[:300]}...",
                    importance=0.8,
                    tags=["explanation", self.current_concept],
                    level="medium"
                )

        elif self.current_stage == FeynmanStage.GAP_ANALYSIS:
            # 如果发现了盲点并讨论了几轮
            if len(self.explanation_history) >= 2:
                self.current_stage = FeynmanStage.CODE_SIMPLIFICATION

        elif self.current_stage == FeynmanStage.CODE_SIMPLIFICATION:
            # 如果学生提供了代码示例（包含代码特征）
            if any(marker in user_input for marker in ["def ", "function", "class ", "=>", "{", "```"]):
                self.code_examples.append(user_input)

                # 保存到长期记忆
                self.memory.add_memory(
                    f"已掌握概念 - {self.current_concept}: 包含代码示例",
                    importance=0.95,
                    tags=["mastered", self.current_concept, "with_code"],
                    level="long"
                )
                self.memory.consolidate()

    def learn_concept(self, concept: str) -> str:
        """
        直接开始学习某个编程概念

        Args:
            concept: 编程概念

        Returns:
            Agent引导语
        """
        self.current_concept = concept
        self.current_stage = FeynmanStage.EXPLANATION

        # 记录概念
        self.memory.add_memory(
            f"学习概念: {concept}",
            importance=0.9,
            tags=["concept", concept],
            level="long"
        )

        return f"""太好了！让我们用费曼学习法来深入理解「{concept}」。

📚 费曼学习法的核心：用最简单的语言解释复杂概念

现在，请你试着用大白话解释一下「{concept}」：

要求：
1. 就像教一个完全不会编程的朋友
2. 可以用生活中的类比或比喻
3. 避免使用专业术语（或者先解释术语）
4. 如果有简单的代码示例更好

开始吧！用你自己的话来说明「{concept}」是什么。"""

    def advance_stage(self):
        """手动推进到下一阶段（用于跳过）"""
        stages = list(FeynmanStage)
        current_index = stages.index(self.current_stage)
        if current_index < len(stages) - 1:
            self.current_stage = stages[current_index + 1]

    def get_progress(self) -> Dict[str, Any]:
        """获取学习进度"""
        return {
            "current_concept": self.current_concept,
            "current_stage": self.current_stage.value,
            "explanations_count": len(self.explanation_history),
            "gaps_identified": len(self.knowledge_gaps),
            "code_examples_count": len(self.code_examples),
            "memory_stats": self.memory.get_stats()
        }

    def get_learning_summary(self) -> str:
        """获取学习总结"""
        if not self.current_concept:
            return "尚未开始学习任何概念。"

        summary_parts = [
            f"【学习概念】{self.current_concept}",
            f"【当前阶段】{self.current_stage.value}",
            f"【解释次数】{len(self.explanation_history)}",
            f"【代码示例】{len(self.code_examples)} 个",
        ]

        if self.knowledge_gaps:
            summary_parts.append(f"【发现盲点】{len(self.knowledge_gaps)} 个")

        # 从长期记忆获取相关信息
        related_memories = self.memory.search(self.current_concept, levels=["long"])
        if related_memories:
            summary_parts.append("\n【相关记忆】")
            for m in related_memories[:3]:
                summary_parts.append(f"- {m.content[:50]}...")

        return "\n".join(summary_parts)

    def __repr__(self):
        return f"FeynmanAgent(concept={self.current_concept}, stage={self.current_stage.value})"
