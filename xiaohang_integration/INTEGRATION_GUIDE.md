# 小航助教平台 - 题目生成模块集成指南

本文件夹包含“编程学伴”题目生成核心模块的所有必要依赖。您可以将此文件夹内容整体迁移至小航助教平台的后端服务中。

## 📁 文件说明

- `generator_service.py`: **主入口**。封装了 `generate_problem` 核心函数。
- `retriever.py`: 题目检索逻辑。
- `mutator.py`: 题目变异（LLM 改写）逻辑。
- `leetcode_db.json`: 题目种子库（包含约 3800 道基础题目）。
- `requirements.txt`: 运行所需的 Python 依赖包。
- `example.py`: 集成调用示例代码。

## 🛠️ 集成步骤

### 1. 安装依赖
在您的后端运行环境中安装必要的库：
```bash
pip install -r requirements.txt
```

### 2. 配置环境 (API Key)
在该目录下创建 `.env` 文件，填入模型接口信息：
```env
OPEN_AI_API_KEY=您的Key
OPEN_AI_BASE_URL=您的接口地址
MODEL_NAME=loopcoder
```

### 3. 调用 API
在您的业务逻辑中引入并使用：
```python
from generator_service import generate_problem, Difficulty, ProblemType

# 生成题目
result = generate_problem("Array", Difficulty.EASY, ProblemType.FILL_IN_THE_BLANK)

# 获取结果
if "error" not in result:
    display_text = result["problem"]      # 用于展示给学生的题目文本
    correct_answer = result["answer"]     # 用于后台校验或展示的参考答案
```

## 📝 题型说明
- `FILL_IN_THE_BLANK`: **代码填空**。会自动在代码核心逻辑处生成 3-5 个 `_________`。
- `BUG_FINDING`: **代码找错**。在逻辑中植入隐蔽 Bug，并提供错误解析。
- `PERFORMANCE_ANALYSIS`: **性能分析**。要求学生分析时空复杂度并给出优化思路。
- `SOLUTION_DESIGN`: **方案设计**。提供现实场景，考察学生的架构设计能力。

---
*由“编程学伴”开发团队提供支持*
