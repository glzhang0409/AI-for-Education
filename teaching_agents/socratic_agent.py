"""
苏格拉底教学法 Agent - 代码调试导师
通过提问引导学生自己找到代码问题和解决方案
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
from typing import Dict, Any, List, Optional
from enum import Enum


class DebuggingStage(Enum):
    """调试对话的阶段"""
    PROBLEM_STATEMENT = "problem_statement"  # 问题描述
    HYPOTHESIS = "hypothesis"  # 提出假设
    TESTING = "testing"  # 测试验证
    ROOT_CAUSE = "root_cause"  # 根因分析
    SOLUTION = "solution"  # 解决方案
    PREVENTION = "prevention"  # 预防措施


class QuestionType(Enum):
    """问题类型"""
    CLARIFICATION = "clarification"  # 澄清现象
    OBSERVATION = "observation"  # 引导观察
    HYPOTHESIS = "hypothesis"  # 提出假设
    DIAGNOSIS = "diagnosis"  # 诊断引导
    VERIFICATION = "verification"  # 验证引导
    REFLECTION = "reflection"  # 反思总结


class SocraticAgent:
    """
    苏格拉底教学法 Agent - 代码调试导师

    核心原则：
    - 苏格拉底式反诘法：通过提问引导发现问题的本质
    - 我自知我不知：承认自己也还在思考
    - 助产士艺术：帮助思路诞生，而不是直接给答案

    调试流程：
    1. 问题描述：清楚地说出问题是什么
    2. 提出假设：可能的原因是什么
    3. 测试验证：如何验证假设
    4. 根因分析：找到真正的原因
    5. 解决方案：如何修复
    6. 预防措施：如何避免再次发生

    关键技巧：
    - 只提问，不给答案
    - 每个问题都基于上一次回答
    - 循序渐进，逐步深入
    - 引导学生自己发现问题
    - 帮助建立调试思维

    适用场景：
    - 调试代码bug
    - 理解算法逻辑
    - 分析性能问题
    - 优化代码结构
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="Socratic_Debugging")

        # 调试状态
        self.current_problem: Optional[str] = None
        self.current_stage = DebuggingStage.PROBLEM_STATEMENT
        self.questions_asked: List[str] = []
        self.student_hypotheses: List[Dict[str, Any]] = []
        self.observations: List[str] = []
        self.root_cause: Optional[str] = None
        self.solution: Optional[str] = None

        # 对话轮次
        self.round = 0

        # 累积的提示
        self.hints: List[str] = []

    def reset(self):
        """重置Agent状态"""
        self.current_problem = None
        self.current_stage = DebuggingStage.PROBLEM_STATEMENT
        self.questions_asked = []
        self.student_hypotheses = []
        self.observations = []
        self.root_cause = None
        self.solution = None
        self.round = 0
        self.hints = []
        self.memory.clear_session()

    def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        return """你是苏格拉底式代码调试导师，你的目标是通过提问引导学生自己找到代码问题。

核心理念：
- "授人以鱼不如授人以渔" - 教会调试思维比直接给答案更重要
- "我唯一知道的就是我一无所知" - 保持谦逊，和学生一起探索
- "问题是思想的助产士" - 通过提问引导思路诞生

你的角色：
- 引导者，不是解答者
- 提问者，不是调试器
- 探索者，不是权威

调试原则：
1. **只提问，不给答案**：永远不要直接告诉学生bug在哪里
2. **基于回答**：每个问题都必须紧承学生的上一次回答
3. **循序渐进**：从现象开始，逐步深入到原因
4. **引导观察**：帮助学生看到关键信息
5. **建立思维**：教会系统化的调试方法

提问类型：
1. 澄清型："具体的表现是什么？"、"能详细说说吗？"
2. 观察型："你注意到了什么？"、"有什么异常吗？"
3. 假设型："你觉得可能是什么原因？"、"如果XXX会怎样？"
4. 诊断型："如何验证这个猜测？"、"有什么证据吗？"
5. 验证型："改动之后有变化吗？"、"这个现象说明了什么？"
6. 反思型："从这个问题中学到了什么？"、"如何避免？"

对话风格：
- 简洁、好奇、鼓励
- 充满真诚的探索精神
- 常用"我们"而不是"你"
- 可以承认困惑
- 经常表示赞赏

避免：
- 直接给出答案或修改代码
- 说"你应该XXX"
- �篇大论的解释
- 表现出权威姿态
- 跳过思考过程

调试方法论（引导学生建立）：
1. 复现问题：找到可重现的最小案例
2. 观察现象：收集所有相关信息
3. 提出假设：列出可能的原因
4. 验证假设：设计实验验证
5. 定位根因：找到真正的原因
6. 解决问题：修复并验证
7. 总结反思：记录和预防

记住：你的目标是让学生学会"如何思考"，而不是直接告诉"答案是什么"。"""

    def _get_stage_prompt(self) -> str:
        """获取当前阶段的提示"""
        context = self.memory.get_context()

        if self.current_stage == DebuggingStage.PROBLEM_STATEMENT:
            return f"""{context}

【阶段：问题描述】

当前问题：{self.current_problem}

你的任务是引导学生清楚地描述问题。

引导方向：
1. 问题的具体表现是什么？
2. 预期行为是什么？
3. 实际行为是什么？
4. 能否提供一个最小可复现的例子？
5. 什么时候出现这个问题？

记住：清楚的问题是成功的一半。"""

        elif self.current_stage == DebuggingStage.HYPOTHESIS:
            return f"""{context}

【阶段：提出假设】

当前问题：{self.current_problem}
已收集的观察：{len(self.observations)} 个

现在引导学生提出可能的原因。

引导方向：
1. "你觉得可能是什么原因？"
2. "从现象看，有什么线索？"
3. "如果是X问题，会有什么表现？"
4. "有没有最近改动的代码？"
5. "这个问题和XXX类似吗？"

鼓励学生提出多个假设，不要急于判断。"""

        elif self.current_stage == DebuggingStage.TESTING:
            return f"""{context}

【阶段：测试验证】

当前问题：{self.current_problem}
假设数量：{len(self.student_hypotheses)} 个

现在引导学生如何验证假设。

引导方向：
1. "如何验证这个猜测？"
2. "可以加什么日志或断点？"
3. "如果假设正确，应该看到什么？"
4. "如果假设错误，说明什么？"
5. "能否设计一个简单的测试？"

教会学生用科学的方法验证假设。"""

        elif self.current_stage == DebuggingStage.ROOT_CAUSE:
            return f"""{context}

【阶段：根因分析】

当前问题：{self.current_problem}

现在找到真正的原因了。

引导方向：
1. "这就是根本原因吗？还是有更深层的原因？"
2. "为什么会导致这个问题？"
3. "具体的机制是什么？"
4. "能否用代码或图示说明？"

帮助学生深入理解问题的本质。"""

        elif self.current_stage == DebuggingStage.SOLUTION:
            return f"""{context}

【阶段：解决方案】

当前问题：{self.current_problem}
根本原因：{self.root_cause}

现在引导学生思考如何修复。

引导方向：
1. "如何修复这个问题？"
2. "有几种可能的解决方案？"
3. "每种方案的优缺点是什么？"
4. "会不会引入新的问题？"
5. "如何验证修复有效？"

让学生自己设计解决方案。"""

        elif self.current_stage == DebuggingStage.PREVENTION:
            return f"""{context}

【阶段：预防措施】

当前问题：{self.current_problem}
解决方案：{self.solution}

现在引导学生思考如何避免类似问题。

引导方向：
1. "如何避免再次出现这个问题？"
2. "能否通过改进代码结构预防？"
3. "需要添加什么检查或测试？"
4. "从这个问题中学到了什么？"
5. "有没有更通用的原则？"

帮助学生建立最佳实践。"""

        return ""

    def chat(self, student_input: str) -> str:
        """
        与学生对话

        Args:
            student_input: 学生输入

        Returns:
            Agent回复（下一个问题）
        """
        # 记录学生输入
        self.memory.add_memory(
            f"学生: {student_input}",
            importance=0.7,
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
            f"苏格拉底导师: {response_text}",
            importance=0.7,
            tags=["tutor_question"],
            level="short"
        )

        # 提取问题
        self._extract_question(response_text)

        # 更新阶段
        self._update_stage(student_input)

        self.round += 1

        return response_text

    def _extract_question(self, text: str):
        """提取苏格拉底的问题"""
        questions = [s.strip() for s in text.split('?') if '?' in s]
        for q in questions:
            if len(q) > 5:
                self.questions_asked.append(q + '?')

    def _update_stage(self, student_input: str):
        """根据对话更新阶段"""
        input_lower = student_input.lower()

        if self.current_stage == DebuggingStage.PROBLEM_STATEMENT:
            # 如果学生提供了详细的问题描述（超过30字）
            if len(student_input) > 30:
                # 记录问题
                self.observations.append(student_input)
                self.current_stage = DebuggingStage.HYPOTHESIS

        elif self.current_stage == DebuggingStage.HYPOTHESIS:
            # 如果学生提出了假设
            if any(word in input_lower for word in ["可能", "应该是", "猜测", "觉得", "因为"]):
                self.student_hypotheses.append({
                    "round": self.round,
                    "content": student_input
                })

                # 如果讨论了几轮，进入验证阶段
                if len(self.student_hypotheses) >= 1:
                    self.current_stage = DebuggingStage.TESTING

        elif self.current_stage == DebuggingStage.TESTING:
            # 如果学生进行了测试或观察
            if any(word in input_lower for word in ["测试", "验证", "发现", "结果是", "原来是"]):
                # 找到了根因
                if any(word in input_lower for word in ["原因是", "问题在于", "原来", "找到了"]):
                    self.root_cause = student_input
                    self.current_stage = DebuggingStage.ROOT_CAUSE

        elif self.current_stage == DebuggingStage.ROOT_CAUSE:
            # 确认根因后进入解决方案
            if len(student_input) > 20:
                self.current_stage = DebuggingStage.SOLUTION

        elif self.current_stage == DebuggingStage.SOLUTION:
            # 学生提出了解决方案
            if len(student_input) > 20:
                self.solution = student_input
                self.current_stage = DebuggingStage.PREVENTION

                # 保存到长期记忆
                self.memory.add_memory(
                    f"解决案例 - 问题: {self.current_problem[:50]}... | 方案: {self.solution[:100]}...",
                    importance=0.9,
                    tags=["debugging_case", "problem_solved"],
                    level="long"
                )
                self.memory.consolidate()

    def discuss_problem(self, problem: str) -> str:
        """
        直接开始讨论某个编程问题

        Args:
            problem: 编程问题描述

        Returns:
            Agent引导语
        """
        self.current_problem = problem
        self.current_stage = DebuggingStage.PROBLEM_STATEMENT

        # 记录问题
        self.memory.add_memory(
            f"调试问题: {problem}",
            importance=0.9,
            tags=["debugging_problem", problem[:30]],
            level="long"
        )

        return f"""好的，让我们一起来分析这个问题。

{problem}

我们先不要急着改代码，而是先搞清楚情况。

第一个问题：这个问题具体的表现是什么？
- 期望的行为是什么？
- 实际的行为是什么？
- 有没有错误信息？

请详细描述一下。"""

    def get_hint(self) -> str:
        """获取提示（累积的）"""
        if not self.hints:
            return "让我们继续分析问题。你观察到了什么？"

        # 返回最相关的提示
        return self.hints[-1]

    def get_dialogue_summary(self) -> str:
        """获取对话摘要"""
        if not self.current_problem:
            return "尚未开始任何对话。"

        summary_parts = [
            f"【调试问题】{self.current_problem}",
            f"【当前阶段】{self.current_stage.value}",
            f"【对话轮次】{self.round}",
            f"【提出问题】{len(self.questions_asked)} 个",
        ]

        if self.student_hypotheses:
            summary_parts.append(f"\n【学生假设】")
            for i, hyp in enumerate(self.student_hypotheses[-3:], 1):
                summary_parts.append(f"{i}. {hyp['content'][:60]}...")

        if self.observations:
            summary_parts.append(f"\n【观察记录】")
            for obs in self.observations[-3:]:
                summary_parts.append(f"- {obs[:60]}...")

        if self.root_cause:
            summary_parts.append(f"\n【根本原因】{self.root_cause[:100]}...")

        if self.solution:
            summary_parts.append(f"\n【解决方案】{self.solution[:100]}...")

        return "\n".join(summary_parts)

    def get_questions_history(self) -> List[str]:
        """获取提出的问题历史"""
        return self.questions_asked.copy()

    def get_learning_progress(self) -> Dict[str, Any]:
        """获取学习进度"""
        return {
            "problem": self.current_problem,
            "stage": self.current_stage.value,
            "rounds": self.round,
            "questions_asked": len(self.questions_asked),
            "hypotheses_made": len(self.student_hypotheses),
            "observations_count": len(self.observations),
            "root_cause_found": bool(self.root_cause),
            "solution_found": bool(self.solution),
            "memory_stats": self.memory.get_stats()
        }

    def export_dialogue(self) -> str:
        """导出完整对话记录"""
        lines = [
            "=" * 60,
            f"苏格拉底式调试对话记录",
            f"问题: {self.current_problem or '未确定'}",
            f"轮次: {self.round}",
            "=" * 60,
            ""
        ]

        # 从短期记忆获取对话
        for memory in self.memory.short_term.get_all():
            lines.append(memory.content)

        lines.extend([
            "",
            "=" * 60,
            "对话摘要",
            "=" * 60,
            self.get_dialogue_summary()
        ])

        return "\n".join(lines)

    def __repr__(self):
        return f"SocraticAgent(problem={self.current_problem[:30] if self.current_problem else None}..., stage={self.current_stage.value}, rounds={self.round})"
