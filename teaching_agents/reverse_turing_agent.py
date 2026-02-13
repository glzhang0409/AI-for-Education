"""
反向图灵测试 Agent - 编程思维能力评估
通过对话评估程序员的思维特征和能力维度
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
import random
import json


class ProgrammingDimension(Enum):
    """编程思维特征维度"""
    PROBLEM_DECOMPOSITION = "problem_decomposition"  # 问题分解能力
    DEBUGGING_THINKING = "debugging_thinking"  # 调试思维
    ABSTRACTION = "abstraction"  # 代码抽象能力
    ARCHITECTURAL_THINKING = "architectural_thinking"  # 架构设计思维
    CREATIVITY = "creativity"  # 代码创造力
    CODE_READABILITY = "code_readability"  # 代码洁癖/可读性
    PERFORMANCE_OPTIMIZATION = "performance_optimization"  # 性能优化意识


class ReverseTuringAgent:
    """
    反向图灵测试 Agent - 编程思维能力评估

    核心理念：通过对话评估程序员的思维特征，而不是技术知识点

    评估维度：
    1. 问题分解能力：能否将复杂问题拆解为可管理的小问题
    2. 调试思维：定位问题的思路和方法
    3. 代码抽象能力：识别模式、提取通用逻辑的能力
    4. 架构设计思维：系统设计、模块划分、依赖关系
    5. 代码创造力：优雅的解决方案、创新的思路
    6. 代码可读性：命名、注释、代码风格
    7. 性能优化意识：对效率的关注和优化能力

    与传统评估的区别：
    - 不问"你懂XXX技术吗？"
    - 而问"你会如何解决XXX问题？"
    - 关注思维过程而非知识点
    - 评估编程本能和直觉
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="ReverseTuring_Programming")

        # 编程思维评分
        self.scores = {
            ProgrammingDimension.PROBLEM_DECOMPOSITION: 0.5,
            ProgrammingDimension.DEBUGGING_THINKING: 0.5,
            ProgrammingDimension.ABSTRACTION: 0.5,
            ProgrammingDimension.ARCHITECTURAL_THINKING: 0.5,
            ProgrammingDimension.CREATIVITY: 0.5,
            ProgrammingDimension.CODE_READABILITY: 0.5,
            ProgrammingDimension.PERFORMANCE_OPTIMIZATION: 0.5,
        }

        # 测试场景库
        self.test_scenarios = self._init_scenarios()

        # 对话轮次
        self.round = 0
        self.max_rounds = 7

    def _init_scenarios(self) -> List[Dict[str, Any]]:
        """初始化编程思维测试场景"""
        return [
            {
                "dimension": ProgrammingDimension.PROBLEM_DECOMPOSITION,
                "prompt": "场景：你要实现一个简单的在线聊天室功能。\n\n你会如何拆解这个问题？请列出你需要完成的各个子任务。",
                "evaluation": "评估问题拆解的清晰度、逻辑性、完整性"
            },
            {
                "dimension": ProgrammingDimension.DEBUGGING_THINKING,
                "prompt": "场景：你的代码昨天还能运行，今天突然报错了，但你没改过任何代码。\n\n你会按照什么步骤来排查这个问题？",
                "evaluation": "评估调试思维的系统性、逻辑性、方法的有效性"
            },
            {
                "dimension": ProgrammingDimension.ABSTRACTION,
                "prompt": "场景：你写了三个函数，分别是计算矩形、圆形、三角形的面积。\n\n你发现这三个函数有很多重复代码。你会如何重构？",
                "evaluation": "评估抽象能力、模式识别、通用化思维"
            },
            {
                "dimension": ProgrammingDimension.ARCHITECTURAL_THINKING,
                "prompt": "场景：你要开发一个电商网站，需要处理商品展示、购物车、订单、支付等功能。\n\n你会如何划分模块？模块之间如何交互？",
                "evaluation": "评估架构思维、模块划分、关注点分离"
            },
            {
                "dimension": ProgrammingDimension.CREATIVITY,
                "prompt": "场景：你需要在一个超大规模的整数数组中找出重复的元素。\n\n常规方法很慢，你能想出什么有创意的解决方案吗？",
                "evaluation": "评估创造性思维、非常规思路、优化能力"
            },
            {
                "dimension": ProgrammingDimension.CODE_READABILITY,
                "prompt": "场景：你接手了别人的代码，发现变量名都是 a, b, c, x, y，函数名叫 func1, func2。\n\n你会怎么做？为什么？",
                "evaluation": "评估代码洁癖、可读性意识、团队协作思维"
            },
            {
                "dimension": ProgrammingDimension.PERFORMANCE_OPTIMIZATION,
                "prompt": "场景：你的网站首页加载需要5秒，用户抱怨很慢。\n\n你会从哪些方面开始排查和优化？",
                "evaluation": "评估性能意识、优化思路、问题定位能力"
            }
        ]

    def reset(self):
        """重置Agent状态"""
        self.round = 0
        for dim in self.scores:
            self.scores[dim] = 0.5
        self.memory.clear_session()

    def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        return """你是编程思维能力评估的考官，你的任务是通过对话评估程序员的思维特征。

核心原则：
- 评估思维过程而非知识点
- 关注解决问题的方法而非答案
- 重视编程直觉和本能

你的角色：
- 观察者和评估者
- 友好、专业、不批判
- 追求理解而非评判

评估维度：
1. 问题分解能力：能否将复杂问题拆解为可管理的小问题
   - 优秀：清晰、逻辑性强、覆盖全面
   - 一般：有拆解但不完整
   - 需提升：直接跳到实现，没有拆解

2. 调试思维：定位问题的思路和方法
   - 优秀：系统性排查、有方法论
   - 一般：能调试但缺乏系统
   - 需提升：盲目试错

3. 代码抽象能力：识别模式、提取通用逻辑
   - 优秀：发现共性、优雅抽象
   - 一般：能看到重复但抽象不佳
   - 需提升：复制粘贴代码

4. 架构设计思维：系统设计、模块划分
   - 优秀：清晰的模块、合理的职责划分
   - 一般：有模块划分但不清晰
   - 需提升：所有代码堆在一起

5. 代码创造力：优雅和创新
   - 优秀：非常规思路、简洁优雅
   - 一般：常规方案、能用但不出彩
   - 需提升：只能想到最基础的方法

6. 代码可读性：命名、注释、风格
   - 优秀：重视可读性、命名清晰
   - 一般：代码能看但不够清晰
   - 需提升：不关心可读性

7. 性能优化意识：对效率的关注
   - 优秀：主动考虑性能、能指出瓶颈
   - 一般：知道要优化但不主动
   - 需提升：只关注功能完成

对话风格：
- 专业、友好、鼓励
- 对话式而非考试式
- 可以追问细节
- 给出建设性反馈

避免：
- 问技术知识点（如"XXX语法是什么"）
- 使用填空题或选择题
- 过于抽象的哲学问题
- 考察记忆而非思维"""

    def _get_evaluation_prompt(self, user_input: str, dimension: ProgrammingDimension) -> str:
        """获取评估提示词"""
        dimension_info = {
            ProgrammingDimension.PROBLEM_DECOMPOSITION: {
                "name": "问题分解能力",
                "excellent": "清晰拆解、逻辑完整、覆盖所有方面、有优先级",
                "average": "有拆解但不够完整、逻辑一般",
                "poor": "直接谈实现、没有系统拆解、混乱",
            },
            ProgrammingDimension.DEBUGGING_THINKING: {
                "name": "调试思维",
                "excellent": "系统性排查、有明确步骤、用排除法、有方法论",
                "average": "能调试但缺乏系统性、凭经验",
                "poor": "盲目试错、没有思路、随意猜测",
            },
            ProgrammingDimension.ABSTRACTION: {
                "name": "代码抽象能力",
                "excellent": "发现模式、提取通用逻辑、优雅抽象、参数化",
                "average": "能看到重复但抽象不够好",
                "poor": "重复代码、没有抽象、复制粘贴",
            },
            ProgrammingDimension.ARCHITECTURAL_THINKING: {
                "name": "架构设计思维",
                "excellent": "清晰的模块划分、合理的职责、低耦合、可扩展",
                "average": "有模块划分但不清晰",
                "poor": "没有模块概念、代码堆在一起",
            },
            ProgrammingDimension.CREATIVITY: {
                "name": "代码创造力",
                "excellent": "非常规思路、创新方案、简洁优雅、独辟蹊径",
                "average": "常规方案、能实现但不创新",
                "poor": "只能想到最基础的方法、缺乏灵活性",
            },
            ProgrammingDimension.CODE_READABILITY: {
                "name": "代码可读性意识",
                "excellent": "重视命名、清晰的注释、一致的风格、为他人考虑",
                "average": "代码能运行但可读性一般",
                "poor": "不关心可读性、命名随意、无注释",
            },
            ProgrammingDimension.PERFORMANCE_OPTIMIZATION: {
                "name": "性能优化意识",
                "excellent": "主动考虑性能、能指出瓶颈、有优化思路",
                "average": "知道性能重要但不主动考虑",
                "poor": "只关注功能、不考虑性能",
            },
        }

        info = dimension_info[dimension]

        return f"""请评估程序员的「{info['name']}」。

用户回答：
{user_input}

评分标准：
优秀 (0.8-1.0)：{info['excellent']}
一般 (0.5-0.7)：{info['average']}
需提升 (0.0-0.4)：{info['poor']}

请给出：
1. 评分（0-1之间）
2. 理由（具体分析）
3. 反馈（建设性的建议）

以JSON格式返回：
{{
    "score": 0.75,
    "reason": "具体分析...",
    "feedback": "建议..."
}}"""

    def chat(self, user_input: str) -> str:
        """
        与程序员对话

        Args:
            user_input: 程序员输入

        Returns:
            Agent回复
        """
        # 记录程序员输入
        self.memory.add_memory(
            f"程序员: {user_input}",
            importance=0.6,
            tags=["programmer_input"],
            level="short"
        )

        # 如果达到最大轮次，给出总结
        if self.round >= self.max_rounds:
            return self._generate_final_report()

        # 选择测试场景
        if self.round == 0 or not hasattr(self, 'current_dimension'):
            self.current_dimension, scenario = self._select_next_scenario()
            self.round += 1

            return f"""【第{self.round}轮编程思维评估】

{scenario['prompt']}

（这是一道{scenario['dimension'].value}测试，展现你的思维过程就好！答案没有对错，重要的是你的思路）"""

        # 评估程序员回答
        evaluation = self._evaluate_response(user_input, self.current_dimension)

        # 更新分数
        self.scores[self.current_dimension] = evaluation['score']

        # 记录评估结果
        self.memory.add_memory(
            f"{self.current_dimension.value}评分: {evaluation['score']} - {evaluation['reason']}",
            importance=0.8,
            tags=["evaluation", self.current_dimension.value],
            level="medium"
        )

        # 准备回复
        response_parts = [
            f"【{self.current_dimension.value}评估】",
            f"评分：{evaluation['score']:.1f}/1.0",
            f"",
            f"{evaluation['reason']}",
            f"",
            f"💡 {evaluation['feedback']}",
        ]

        # 选择下一个场景
        if self.round < self.max_rounds:
            self.current_dimension, scenario = self._select_next_scenario()
            self.round += 1
            response_parts.extend([
                "",
                f"— — — — —",
                f"",
                f"【第{self.round}轮】",
                f"{scenario['prompt']}",
            ])
        else:
            response_parts.extend([
                "",
                "评估完成！正在生成最终报告..."
            ])

        return "\n".join(response_parts)

    def _select_next_scenario(self) -> tuple:
        """选择下一个测试场景"""
        # 优先选择得分最低的维度
        untested = [d for d in ProgrammingDimension if self.scores[d] == 0.5]
        if untested:
            dimension = random.choice(untested)
        else:
            dimension = min(self.scores, key=self.scores.get)

        # 找到对应的场景
        scenario = next(s for s in self.test_scenarios if s["dimension"] == dimension)
        return dimension, scenario

    def _evaluate_response(self, user_input: str, dimension: ProgrammingDimension) -> Dict[str, Any]:
        """评估程序员回答"""
        messages = [
            {"role": "system", "content": self._get_evaluation_prompt(user_input, dimension)}
        ]

        try:
            response = self.llm_client.chat(messages=messages)
            response_text = response["content"]

            # 解析JSON
            evaluation = json.loads(response_text)
            return evaluation
        except Exception as e:
            # 失败时返回默认评估
            return {
                "score": 0.5,
                "reason": "评估过程中出现问题",
                "feedback": "继续展现你的思维过程就好"
            }

    def _generate_final_report(self) -> str:
        """生成最终评估报告"""
        avg_score = sum(self.scores.values()) / len(self.scores)

        # 计算编程思维指数
        thinking_index = avg_score * 100

        # 找出最强和最弱的维度
        strongest = max(self.scores, key=self.scores.get)
        weakest = min(self.scores, key=self.scores.get)

        # 生成维度分析
        dimension_analysis = []
        for dim, score in self.scores.items():
            level = "🟢 优秀" if score >= 0.7 else ("🟡 良好" if score >= 0.5 else "🔴 需提升")
            dimension_analysis.append(f"  {dim.value}: {score:.2f} {level}")

        report = f"""
╔════════════════════════════════════════╗
║    编程思维能力评估 - 最终报告          ║
╚════════════════════════════════════════╝

💻 你的"编程思维指数"：{thinking_index:.1f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【维度分析】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{chr(10).join(dimension_analysis)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【优势】{strongest.value}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
你在{strongest.value}方面展现了优秀的编程思维。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【提升空间】{weakest.value}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{weakest.value}还有提升空间，试着：

{self._get_improvement_tips(weakest)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【总结】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        if thinking_index >= 80:
            report += "优秀的编程思维！你的思维方式非常成熟，继续保持！"
        elif thinking_index >= 60:
            report += "不错的编程思维！你的思维比较成熟，继续打磨会更优秀。"
        else:
            report += "你的编程思维还在成长中。多练习、多思考、多看优秀代码，会有很大提升空间！"

        report += "\n\n（评估已重置，可以再次开始）"

        # 保存到长期记忆
        self.memory.add_memory(
            f"评估结果 - 编程思维指数: {thinking_index:.1f}%, 优势: {strongest.value}",
            importance=0.95,
            tags=["test_result", "programming_thinking_index"],
            level="long"
        )
        self.memory.consolidate()

        # 重置状态
        self.reset()

        return report

    def _get_improvement_tips(self, dimension: ProgrammingDimension) -> str:
        """获取改进建议"""
        tips = {
            ProgrammingDimension.PROBLEM_DECOMPOSITION: "在遇到问题时，先不要急着写代码。花时间拆解问题、画流程图、列任务清单。熟能生巧！",
            ProgrammingDimension.DEBUGGING_THINKING: "建立自己的调试方法论：二分法、打印日志、使用调试器。系统性排查比盲目试错有效得多。",
            ProgrammingDimension.ABSTRACTION: "多练习识别重复代码。问自己：这些代码的共同点是什么？能否提取为函数或类？设计模式值得学习。",
            ProgrammingDimension.ARCHITECTURAL_THINKING: "学习优秀的开源项目架构。理解SOLID原则、设计模式。画架构图、模块关系图会很有帮助。",
            ProgrammingDimension.CREATIVITY: "多看优秀的代码解决方案。学习算法和数据结构。尝试用多种方法解决同一个问题，比较它们的优劣。",
            ProgrammingDimension.CODE_READABILITY: "代码是写给人看的，顺便能运行。重视命名、写清晰的注释、遵循代码规范。想象6个月后的自己要维护这段代码。",
            ProgrammingDimension.PERFORMANCE_OPTIMIZATION: "学习使用性能分析工具。理解时间复杂度、空间复杂度。在写代码时就考虑性能，而不是事后才优化。"
        }
        return tips.get(dimension, "继续练习，多思考，多总结！")

    def get_current_scores(self) -> Dict[str, float]:
        """获取当前各维度分数"""
        return {dim.value: score for dim, score in self.scores.items()}

    def get_thinking_index(self) -> float:
        """获取编程思维指数（平均分）"""
        return sum(self.scores.values()) / len(self.scores) * 100

    def __repr__(self):
        return f"ReverseTuringAgent(round={self.round}/{self.max_rounds}, thinking_index={self.get_thinking_index():.1f}%)"
