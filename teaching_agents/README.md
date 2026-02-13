# 教学AI Agent系统 - 技术文档

## 目录
1. [系统概述](#系统概述)
2. [架构设计](#架构设计)
3. [记忆系统](#记忆系统)
4. [费曼学习法Agent](#费曼学习法agent)
5. [反向图灵测试Agent](#反向图灵测试agent)
6. [苏格拉底教学法Agent](#苏格拉底教学法agent)
7. [使用指南](#使用指南)
8. [API参考](#api参考)

---

## 系统概述

本项目实现了三个基于大语言模型的教学AI Agent，每个Agent都集成了三级记忆系统，用于个性化和智能化的教学互动。

### 核心特性

- **三级记忆系统**：短期、中期、长期记忆，模拟人类记忆机制
- **对话状态管理**：每个Agent维护独立的对话上下文和状态机
- **智能阶段转换**：根据对话内容自动推进教学阶段
- **持久化存储**：重要知识保存到本地JSON文件
- **可扩展架构**：基于现有LLMClient构建，易于扩展新Agent

### 三个教学Agent

| Agent | 教学法 | 核心理念 | 适用场景 |
|-------|--------|----------|----------|
| FeynmanAgent | 费曼学习法 | 用简单语言解释来检验理解 | 深度学习、概念掌握 |
| ReverseTuringAgent | 反向图灵测试 | 评估和提升人类特征 | 自我认知、创造力培养 |
| SocraticAgent | 苏格拉底教学法 | 通过提问引导发现真理 | 批判性思维、哲学探讨 |

---

## 架构设计

### 整体架构

```
teaching_agents/
├── memory.py              # 记忆系统（三级记忆）
├── feynman_agent.py       # 费曼学习法Agent
├── reverse_turing_agent.py # 反向图灵测试Agent
├── socratic_agent.py      # 苏格拉底教学法Agent
├── __init__.py            # 模块初始化
└── demo.py                # 演示程序
```

### 依赖关系

```
┌─────────────────────────────────────────┐
│         LLMClient (src/llm_client.py)   │
│    - OpenAI API调用                       │
│    - Function Calling支持                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         AgentMemory (memory.py)         │
│    - ShortTermMemory  (工作记忆)         │
│    - MediumTermMemory (会话记忆)         │
│    - LongTermMemory  (知识库)            │
└──────────────┬───────────────────────────┘
               │
       ┌───────┴────────┬──────────────┐
       ▼                ▼              ▼
┌──────────┐    ┌─────────────┐  ┌──────────┐
│ Feynman  │    │ Reverse     │  │ Socratic │
│  Agent   │    │  Turing     │  │  Agent   │
└──────────┘    └─────────────┘  └──────────┘
```

### 设计模式

1. **策略模式**：每个Agent实现不同的教学策略
2. **状态机模式**：Agent内部维护阶段转换逻辑
3. **记忆模式**：三级记忆模拟人类认知
4. **装饰器模式**：Tool系统（来自原有架构）

---

## 记忆系统

### 三级记忆架构

#### 1. 短期记忆 (ShortTermMemory)

**功能**：维护对话上下文

**特点**：
- 容量：10-20条最近对话
- 保留时间：会话期间
- 自动清理：超过容量时移除最旧的

**实现细节**：
```python
class ShortTermMemory:
    def __init__(self, max_items: int = 20)
    def add(self, content: str, importance: float, tags: List[str]) -> Memory
    def get_recent(self, n: int) -> List[Memory]
    def clear(self)
```

**使用场景**：
- 保存最近的对话历史
- 维护对话上下文
- 提供给LLM作为参考

#### 2. 中期记忆 (MediumTermMemory)

**功能**：记录学习过程中的关键信息

**特点**：
- 容量：100-200条
- 保留时间：当前学习会话
- 支持标签搜索
- 定期整合和总结

**实现细节**：
```python
class MediumTermMemory:
    def __init__(self, max_items: int = 200)
    def add(self, content: str, importance: float, tags: List[str]) -> Memory
    def search_by_tags(self, tags: List[str]) -> List[Memory]
    def search_by_keyword(self, keyword: str) -> List[Memory]
    def get_important(self, threshold: float) -> List[Memory]
    def consolidate(self) -> str  # 生成摘要
```

**使用场景**：
- 记录学习者的理解过程
- 保存重要对话
- 跟踪知识盲点

#### 3. 长期记忆 (LongTermMemory)

**功能**：存储已掌握的知识和经验

**特点**：
- 容量：几乎无限
- 保留时间：永久
- 持久化存储：JSON文件
- 支持知识图谱
- 智能遗忘：定期清理不重要的旧记忆

**实现细节**：
```python
class LongTermMemory:
    def __init__(self, storage_path: str = "long_term_memory.json")
    def add(self, content: str, importance: float, tags: List[str]) -> Memory
    def search(self, query: str, top_k: int = 5) -> List[Memory]
    def get_by_tags(self, tags: List[str]) -> List[Memory]
    def save(self)  # 保存到磁盘
    def forget_old(self, days: int, min_importance: float)
```

**使用场景**：
- 保存学习者已掌握的知识
- 跨会话记忆
- 个性化推荐

### 记忆单元 (Memory)

所有记忆都使用统一的数据结构：

```python
@dataclass
class Memory:
    content: str          # 记忆内容
    timestamp: str        # 时间戳
    importance: float     # 重要性 (0-1)
    access_count: int     # 访问次数
    tags: List[str]       # 标签列表
    memory_id: str        # 唯一标识符
```

### AgentMemory统一接口

```python
class AgentMemory:
    def __init__(self, agent_name: str, storage_path: str = None)

    # 添加记忆
    def add_memory(self, content: str, importance: float,
                   tags: List[str], level: str) -> Memory

    # 搜索记忆
    def search(self, query: str, levels: List[str] = None) -> List[Memory]

    # 获取上下文（用于prompt）
    def get_context(self, max_items: int = 10) -> str

    # 整合记忆
    def consolidate(self)

    # 清理会话记忆
    def clear_session(self)

    # 获取统计信息
    def get_stats(self) -> Dict[str, Any]
```

### 记忆流程

```
用户输入
   ↓
添加到短期记忆（重要度0.5）
   ↓
对话进行...
   ↓
识别重要内容（重要度>=0.7）→ 迁移到中期记忆
   ↓
对话结束或达到阈值
   ↓
识别核心知识（重要度>=0.8）→ 迁移到长期记忆
   ↓
保存到磁盘
```

---

## 费曼学习法Agent

### 核心理念

费曼学习法的四个步骤：

1. **选择概念**：确定要学习的主题
2. **简单解释**：用小学生能懂的语言解释
3. **发现盲点**：识别理解不足的地方
4. **简化回顾**：重新组织和简化

**名言**："如果你不能简单地解释它，你就没有真正理解它。"

### 实现架构

#### 状态机

```python
class FeynmanStage(Enum):
    TOPIC_SELECTION = "topic_selection"      # 主题选择
    TEACHING = "teaching"                     # 尝试教学
    GAP_IDENTIFICATION = "gap_identification" # 发现盲点
    SIMPLIFICATION = "simplification"         # 简化回顾
```

#### 核心方法

```python
class FeynmanAgent:
    def __init__(self, llm_client: LLMClient)

    # 对话接口
    def chat(self, user_input: str) -> str

    # 直接开始学习某个主题
    def learn_topic(self, topic: str) -> str

    # 获取学习进度
    def get_progress(self) -> Dict[str, Any]

    # 获取学习总结
    def get_learning_summary(self) -> str

    # 重置状态
    def reset(self)
```

### 系统提示词设计

费曼Agent使用双系统提示词：

1. **角色定义提示词**：
   - 费曼学习法核心理念
   - 导师角色定位
   - 工作原则和互动风格

2. **阶段特定提示词**：
   - 根据当前阶段动态生成
   - 包含记忆上下文
   - 提供具体的任务指导

### 对话示例

```
用户: 我想学习量子纠缠

费曼: 太好了！让我们开始学习「量子纠缠」。

现在，请你用自己的话解释一下「量子纠缠」，
就像讲给一个12岁的孩子听。

用户: 量子纠缠就是两个粒子之间有某种神奇的联系，
无论它们相隔多远，一个粒子的状态改变了，
另一个粒子也会立即改变。

费曼: 很好的开始！让我追问几个问题来帮你深入理解：

1. 你说的"神奇的联系"具体是什么？
2. 如果这两个粒子相隔光年的距离，
   立即改变是不是违反了相对论？
3. 你能举个日常生活中的例子来类比吗？

试着想想这些问题，然后再次解释量子纠缠...
```

### 阶段转换逻辑

```python
def _update_stage(self, user_input: str, agent_response: str):
    if self.current_stage == TOPIC_SELECTION:
        # 用户提供了主题 → 进入教学阶段
        if len(user_input) > 5:
            self.current_topic = user_input
            self.current_stage = TEACHING

    elif self.current_stage == TEACHING:
        # 用户提供了详细解释 → 进入盲点发现
        if len(user_input) > 100:
            self.current_stage = GAP_IDENTIFICATION

    elif self.current_stage == GAP_IDENTIFICATION:
        # 用户理解了问题 → 进入简化回顾
        if "理解了" in agent_response:
            self.current_stage = SIMPLIFICATION

    elif self.current_stage == SIMPLIFICATION:
        # 用户提供了简化总结 → 保存到长期记忆
        if len(user_input) > 50:
            self.memory.consolidate()
```

### 记忆使用

- **短期记忆**：最近的对话交互
- **中期记忆**：用户的解释、发现的盲点
- **长期记忆**：已掌握的概念和主题

---

## 反向图灵测试Agent

### 核心理念

**传统图灵测试**：人类判断AI是否像人类
**反向图灵测试**：AI评估用户展现的人类特征

### 评估维度

| 维度 | 说明 | AI特征 | 人类特征 |
|------|------|--------|----------|
| 情感表达 | 真实、复杂的情感 | 泛泛而谈、过于理性 | 具体细节、矛盾情感 |
| 创造力 | 新颖独特的想法 | 常见答案、模式化 | 出人意料、荒诞有趣 |
| 幽默感 | 理解和使用幽默 | 过于正经、不懂笑点 | 会玩梗、有节奏感 |
| 上下文理解 | 读懂言外之意 | 只看字面意思 | 敏锐、感受潜台词 |
| 道德判断 | 伦理推理和价值观 | 标准答案、过于原则 | 复杂、矛盾、个人化 |
| 直觉思维 | 非线性推理 | 过度依赖逻辑 | 凭感觉、承认不确定 |
| 不完美性 | 接受错误和矛盾 | 追求正确、完美 | 接受缺陷、坦然面对 |

### 实现架构

#### 评分系统

```python
self.scores = {
    HumanDimension.EMOTION: 0.5,
    HumanDimension.CREATIVITY: 0.5,
    HumanDimension.HUMOR: 0.5,
    HumanDimension.CONTEXT_AWARENESS: 0.5,
    HumanDimension.MORAL_JUDGMENT: 0.5,
    HumanDimension.INTUITION: 0.5,
    HumanDimension.IMPERFECTION: 0.5,
}
```

#### 测试流程

```
开始测试
   ↓
选择测试场景（优先测试得分低的维度）
   ↓
展示测试问题
   ↓
用户回答
   ↓
评估回答（LLM分析）
   ↓
更新分数
   ↓
达到最大轮次？
   ├─ 是 → 生成最终报告
   └─ 否 → 继续下一轮
```

#### 评估Prompt

```python
def _evaluate_response(self, user_input: str, dimension: HumanDimension):
    # 构建评估提示
    prompt = f"""
    请评估用户在「{dimension}」维度上的人类特征。

    用户输入：{user_input}

    评估指标：
    - [具体指标列表]

    对比标准：
    - AI常见特征：...
    - 人类典型特征：...

    请返回JSON：
    {{
        "score": 0.75,
        "reason": "具体分析...",
        "feedback": "建议..."
    }}
    """

    # 调用LLM
    response = self.llm_client.chat(messages=[prompt])

    # 解析评估结果
    return json.loads(response["content"])
```

### 最终报告

```python
╔════════════════════════════════════════╗
║       反向图灵测试 - 最终报告           ║
╚════════════════════════════════════════╝

🤖 你的"人类指数"：78.5%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【维度分析】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  emotion: 0.85 🟢 优秀
  creativity: 0.72 🟢 优秀
  humor: 0.45 🔴 需提升
  context_awareness: 0.68 🟡 良好
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【优势】emotion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
你在情感表达方面展现了强烈的人类特征。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【提升空间】humor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
幽默感还有提升空间，试着：
尝试使用幽默、双关、自嘲。
记住：幽默是智慧的体现。
```

### 记忆使用

- **短期记忆**：测试对话
- **中期记忆**：评估结果、反馈
- **长期记忆**：最终人类指数、优势和改进建议

---

## 苏格拉底教学法Agent

### 核心理念

苏格拉底式对话（Socratic Dialogue）的核心原则：

1. **只提问，不给答案**：真正的知识来自自己的思考
2. **基于上一次回答**：每个问题都紧承前文
3. **揭示矛盾**：帮助发现观点中的问题
4. **保持谦逊**："我唯一知道的就是我一无所知"

### 对话阶段

```python
class SocraticStage(Enum):
    TOPIC = "topic"              # 确定讨论主题
    DEFINITION = "definition"    # 寻求定义
    EXAMINATION = "examination"  # 检验观点
    CONTRADICTION = "contradiction"  # 发现矛盾
    INSIGHT = "insight"          # 产生洞见
    REFINEMENT = "refinement"    # 完善观点
```

### 问题类型

```python
class QuestionType(Enum):
    CLARIFICATION = "clarification"      # 澄清概念
    ASSUMPTION = "assumption"            # 探究假设
    EVIDENCE = "evidence"                # 询问证据
    IMPLICATION = "implication"          # 推导结论
    PERSPECTIVE = "perspective"          # 不同视角
    COUNTEREXAMPLE = "counterexample"    # 反例
```

### 对话流程

```
确定主题
   ↓
"你认为X是什么？"（寻求定义）
   ↓
学习者给出定义
   ↓
"这个定义能涵盖所有情况吗？"（检验）
   ↓
"如果是Y情况，这个定义还适用吗？"（反例）
   ↓
"好像有点矛盾..."（发现矛盾）
   ↓
学习者重新思考
   ↓
"很有意思的想法！能详细说说吗？"（洞见）
   ↓
"现在我们对X的理解是..."（完善）
```

### 对话示例

```
苏格拉底: 你认为"正义"是什么？

学习者: 正义就是给每个人应得的东西。

苏格拉底: 很好。那么，如果医生生病了，
另一个医生给他毒药，这是"应得的东西"吗？

学习者: 不对，医生应该给良药。

苏格拉底: 所以"给每个人应得的"还不够？
我们需要加上"好的"或"正确的"东西？

学习者: 是的，正义是给每个人应得的好的东西。

苏格拉底: 但如果这个人是个罪犯，
法官给他惩罚（这对他是"坏的"），这是正义吗？

学习者: 是的，这是正义。

苏格拉底: 所以有时候正义也包含"坏的"东西？
那我们的定义是不是有问题？

学习者: 嗯...你说得对。
也许正义不仅是"应得的"或"好的"...

苏格拉底: 很好！你发现了问题的关键。
让我们重新思考：正义到底是什么...
```

### 关键数据结构

```python
# 学习者的信念演变
self.learner_beliefs = [
    {
        "round": 1,
        "content": "正义是给每个人应得的东西",
        "type": "definition"
    },
    {
        "round": 3,
        "content": "正义是给每个人应得的好的东西",
        "type": "refined_definition"
    }
]

# 发现的矛盾
self.contradictions_found = [
    "第2轮发现矛盾：给医生毒药不是应得的好东西",
    "第4轮发现矛盾：惩罚不是'好的'但是正义的"
]

# 产生的洞见
self.insights = [
    "正义不仅包含应得性，还包含道德正确性"
]
```

### 导出功能

```python
def export_dialogue(self) -> str:
    """
    导出完整的苏格拉底式对话记录

    返回格式：
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    苏格拉底式对话记录
    主题: 正义
    轮次: 15
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    苏格拉底: 你认为"正义"是什么？

    学习者: 正义就是给每个人应得的东西。

    ...

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    对话摘要
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    【讨论主题】正义
    【当前阶段】refinement
    【对话轮次】15
    【提出问题】12 个
    """
```

### 记忆使用

- **短期记忆**：完整对话记录
- **中期记忆**：信念演变、发现的矛盾
- **长期记忆**：最终理解、掌握的概念

---

## 使用指南

### 安装

```bash
# 已在simple_agent项目根目录
cd teaching_agents

# 确保已安装依赖
pip install -r ../requirements.txt
```

### 配置

确保`.env`文件配置正确：

```env
API_BASE=https://api.openai.com/v1
API_KEY=your_api_key_here
MODEL=gpt-3.5-turbo
```

### 基本使用

#### 1. 费曼学习法Agent

```python
from teaching_agents import FeynmanAgent
from llm_client import LLMClient

# 创建Agent
llm = LLMClient()
agent = FeynmanAgent(llm)

# 方式1：直接开始学习
print(agent.learn_topic("量子纠缠"))

# 对话循环
while True:
    user_input = input("你的回答: ")
    response = agent.chat(user_input)
    print(f"费曼导师: {response}")

# 查看进度
print(agent.get_learning_summary())
```

#### 2. 反向图灵测试Agent

```python
from teaching_agents import ReverseTuringAgent
from llm_client import LLMClient

# 创建Agent
llm = LLMClient()
agent = ReverseTuringAgent(llm)

# 开始测试
while True:
    response = agent.chat("")  # 自动提问
    print(response)

    if "测试完成" in response:
        break

    user_input = input("你的回答: ")
    # 用户回答会在下一轮被评估
```

#### 3. 苏格拉底教学法Agent

```python
from teaching_agents import SocraticAgent
from llm_client import LLMClient

# 创建Agent
llm = LLMClient()
agent = SocraticAgent(llm)

# 开始讨论
print(agent.discuss_topic("正义"))

# 对话循环
while True:
    user_input = input("你的回答: ")
    response = agent.chat(user_input)
    print(f"苏格拉底: {response}")

# 导出对话记录
print(agent.export_dialogue())
```

#### 4. 记忆系统独立使用

```python
from teaching_agents.memory import AgentMemory

# 创建记忆系统
memory = AgentMemory(agent_name="MyAgent")

# 添加记忆
memory.add_memory(
    "用户学会了Python装饰器",
    importance=0.9,
    tags=["python", "mastered"],
    level="long"
)

# 搜索记忆
results = memory.search("装饰器")

# 获取上下文（用于Prompt）
context = memory.get_context()

# 整合记忆
memory.consolidate()

# 查看统计
print(memory.get_stats())
```

### 运行演示程序

```bash
python teaching_agents/demo.py
```

演示程序提供交互式菜单：
1. 费曼学习法 Agent
2. 反向图灵测试 Agent
3. 苏格拉底教学法 Agent
4. 记忆系统演示

---

## API参考

### FeynmanAgent

```python
class FeynmanAgent:
    """费曼学习法Agent"""

    def __init__(self, llm_client: LLMClient)
        """初始化Agent"""

    def chat(self, user_input: str) -> str
        """与用户对话"""

    def learn_topic(self, topic: str) -> str
        """直接开始学习某个主题"""

    def get_progress(self) -> Dict[str, Any]
        """获取学习进度"""

    def get_learning_summary(self) -> str
        """获取学习总结"""

    def reset(self)
        """重置Agent状态"""
```

### ReverseTuringAgent

```python
class ReverseTuringAgent:
    """反向图灵测试Agent"""

    def __init__(self, llm_client: LLMClient)
        """初始化Agent"""

    def chat(self, user_input: str) -> str
        """与用户对话，自动提问和评估"""

    def get_current_scores(self) -> Dict[str, float]
        """获取当前各维度分数"""

    def get_human_index(self) -> float
        """获取人类指数（平均分）"""

    def reset(self)
        """重置Agent状态"""
```

### SocraticAgent

```python
class SocraticAgent:
    """苏格拉底教学法Agent"""

    def __init__(self, llm_client: LLMClient)
        """初始化Agent"""

    def chat(self, user_input: str) -> str
        """与学习者对话"""

    def discuss_topic(self, topic: str) -> str
        """直接开始讨论某个主题"""

    def get_dialogue_summary(self) -> str
        """获取对话摘要"""

    def get_questions_history(self) -> List[str]
        """获取提出的问题历史"""

    def get_beliefs_evolution(self) -> List[Dict[str, Any]]
        """获取信念演变历史"""

    def get_learning_progress(self) -> Dict[str, Any]
        """获取学习进度"""

    def export_dialogue(self) -> str
        """导出完整对话记录"""

    def reset(self)
        """重置Agent状态"""
```

### AgentMemory

```python
class AgentMemory:
    """Agent记忆系统"""

    def __init__(self, agent_name: str, storage_path: str = None)
        """初始化记忆系统"""

    def add_memory(
        self,
        content: str,
        importance: float = 0.5,
        tags: List[str] = None,
        level: str = "short"
    ) -> Memory
        """添加记忆到指定层级"""

    def search(
        self,
        query: str,
        levels: List[str] = None
    ) -> List[Memory]
        """搜索记忆"""

    def get_context(self, max_items: int = 10) -> str
        """获取上下文（用于prompt）"""

    def consolidate(self)
        """整合记忆：将重要记忆从短期迁移到长期"""

    def clear_session(self)
        """清理会话记忆（短期和中期）"""

    def get_stats(self) -> Dict[str, Any]
        """获取记忆统计信息"""
```

### Memory（数据类）

```python
@dataclass
class Memory:
    """记忆单元"""
    content: str          # 记忆内容
    timestamp: str        # 时间戳
    importance: float     # 重要性 (0-1)
    access_count: int     # 访问次数
    tags: List[str]       # 标签列表
    memory_id: str        # 唯一标识符
```

---

## 高级话题

### 自定义记忆策略

```python
# 自定义记忆迁移策略
class CustomAgent:
    def __init__(self):
        self.memory = AgentMemory(agent_name="Custom")

    def custom_consolidate(self):
        """自定义记忆整合逻辑"""
        # 获取所有短期记忆
        short_memories = self.memory.short_term.get_all()

        # 自定义迁移逻辑
        for mem in short_memories:
            if "重要" in mem.content:
                self.memory.long_term.add(
                    mem.content,
                    importance=0.9,
                    tags=mem.tags
                )

        # 保存到磁盘
        self.memory.long_term.save()
```

### 扩展新的Agent

```python
from teaching_agents.memory import AgentMemory
import sys
sys.path.append('src')
from llm_client import LLMClient

class MyTeachingAgent:
    """自定义教学Agent"""

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.memory = AgentMemory(agent_name="MyAgent")
        self.state = "initial"

    def chat(self, user_input: str) -> str:
        """实现对话逻辑"""
        # 1. 记录用户输入
        self.memory.add_memory(
            f"用户: {user_input}",
            importance=0.6,
            tags=["user_input"],
            level="short"
        )

        # 2. 构建prompt（包含记忆上下文）
        context = self.memory.get_context()
        messages = [
            {"role": "system", "content": self._build_system_prompt()},
            {"role": "system", "content": f"上下文：\n{context}"},
            {"role": "user", "content": user_input}
        ]

        # 3. 调用LLM
        response = self.llm_client.chat(messages)
        response_text = response["content"]

        # 4. 记录回复
        self.memory.add_memory(
            f"Agent: {response_text}",
            importance=0.7,
            tags=["agent_response"],
            level="short"
        )

        # 5. 更新状态
        self._update_state(user_input, response_text)

        return response_text

    def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        return "你是一个教学助手..."

    def _update_state(self, user_input: str, response: str):
        """更新Agent状态"""
        # 实现状态转换逻辑
        pass
```

### 批量导入记忆

```python
from teaching_agents.memory import AgentMemory

memory = AgentMemory(agent_name="ImportAgent")

# 批量导入长期记忆
existing_knowledge = [
    ("Python装饰器用于在不修改原函数的情况下添加功能", 0.95, ["python", "mastered"]),
    ("递归是函数调用自身的技术", 0.9, ["algorithms", "mastered"]),
    ("时间复杂度衡量算法效率", 0.85, ["algorithms", "basics"]),
]

for content, importance, tags in existing_knowledge:
    memory.add_memory(content, importance, tags, level="long")

# 保存
memory.long_term.save()
```

---

## 最佳实践

### 1. 记忆重要性分级

```python
# 推荐：明确的重要性分级
memory.add_memory("简单问候", importance=0.3, tags=[], level="short")
memory.add_memory("用户提问", importance=0.6, tags=["question"], level="short")
memory.add_memory("关键理解", importance=0.8, tags=["insight"], level="medium")
memory.add_memory("已掌握知识", importance=0.95, tags=["mastered"], level="long")
```

### 2. 标签策略

```python
# 推荐：使用层级标签
memory.add_memory(
    "学会了Python列表推导式",
    importance=0.9,
    tags=["python", "syntax", "list_comprehension", "mastered"],
    level="long"
)

# 便于按主题检索
python_memories = memory.search("", levels=["long"])
python_memories = [m for m in python_memories if "python" in m.tags]
```

### 3. 定期整合

```python
# 推荐：每N轮对话整合一次记忆
class MyAgent:
    def __init__(self):
        self.memory = AgentMemory(agent_name="MyAgent")
        self.round_count = 0

    def chat(self, user_input: str) -> str:
        # ... 对话逻辑 ...

        self.round_count += 1

        # 每5轮整合一次
        if self.round_count % 5 == 0:
            self.memory.consolidate()
```

### 4. 错误处理

```python
# 推荐：处理LLM调用失败
try:
    response = self.llm_client.chat(messages)
    response_text = response["content"]
except Exception as e:
    # 记录错误
    self.memory.add_memory(
        f"LLM调用失败: {str(e)}",
        importance=0.5,
        tags=["error"],
        level="short"
    )
    # 返回友好错误信息
    return "抱歉，我遇到了一些问题。请稍后再试。"
```

---

## 故障排除

### 问题1：记忆文件损坏

**症状**：加载长期记忆时出现JSON解析错误

**解决**：
```python
# LongTermMemory会自动处理错误
# 如果需要重置：
memory.long_term.clear()  # 这会删除所有记忆
```

### 问题2：阶段转换卡住

**症状**：Agent一直停留在某个阶段

**解决**：
```python
# 检查对话历史
print(agent.get_learning_summary())

# 手动重置
agent.reset()

# 或强制推进阶段（高级用法）
agent.current_stage = FeynmanStage.SIMPLIFICATION
```

### 问题3：内存占用过高

**症状**：程序运行时间长了之后变慢

**解决**：
```python
# 定期清理会话记忆
if round_count % 50 == 0:
    memory.clear_session()

# 或清理旧记忆
memory.long_term.forget_old(days=30, min_importance=0.5)
```

---

## 未来扩展

### 可能的改进方向

1. **向量数据库集成**
   - 使用ChromaDB或FAISS进行语义搜索
   - 更智能的记忆检索

2. **多Agent协作**
   - 费曼Agent和苏格拉底Agent协同工作
   - 交叉验证学习效果

3. **个性化学习路径**
   - 基于长期记忆生成学习计划
   - 自适应难度调整

4. **可视化界面**
   - Web界面（Flask/FastAPI）
   - 对话历史可视化
   - 记忆图谱展示

5. **更多教学Agent**
   - 蒙特梭利教学法Agent
   - 项目式学习Agent
   - 同伴学习Agent

---

## 许可证

本项目遵循原simple_agent项目的许可证。

---

## 联系方式

如有问题或建议，请提交issue或pull request。

---

**文档版本**: 1.0
**最后更新**: 2025-01-20
