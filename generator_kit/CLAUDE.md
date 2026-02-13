# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 LLM 的编程题目测试点生成工具包。主要功能是解析题目描述,自动生成多样化的测试用例,包括基础测试、边界测试、溢出测试、特殊值测试、压力测试和随机测试。

## 核心架构

项目采用模块化设计,各模块职责清晰:

### 1. **models.py** - 数据模型层
- `Problem`: 封装题目完整信息(标题、描述、输入输出格式、数据范围、样例等)
- `DataConstraint`: 数据约束模型,记录变量名、取值范围、数据类型
- `TestCase`: 单个测试点,包含输入、输出、策略、描述
- `GenerationResult`: 生成结果汇总,包含测试点列表、使用的策略、警告信息
- `TestStrategy`: 测试策略枚举(BASIC/BOUNDARY/OVERFLOW/SPECIAL/STRESS/RANDOM)

### 2. **problem_parser.py** - 题目解析器
- `ProblemParser`: 解析题目文本,自动识别各部分(描述、输入格式、输出格式、数据范围、样例)
- 关键功能:
  - 使用多个正则表达式模式提取数据范围约束(支持 `1 <= n <= 10^6`、`n <= 100`、`n的范围[1,100]` 等多种格式)
  - 自动推断 C 语言数据类型(char/short/int/long long)
  - 分析题目特性(是否可能溢出、涉及除法、负数、浮点数)

### 3. **llm_client.py** - LLM 客户端
- `LLMClient`: 封装与 loopcoder 模型的交互
- 使用 OpenAI SDK 兼容的 API
- 支持指数退避重试机制
- 提供全局单例 `get_client()`

### 4. **testcase_generator.py** - 测试点生成器(核心)
- `TestCaseGenerator`: 根据题目自动生成测试点
- **核心流程**:
  1. 根据题目特性自动选择测试策略组合
  2. 为每个策略生成合适数量的测试点
  3. **使用 LLM 生成 Python 脚本**,脚本包含 `solve()` 和 `generate_input()` 函数
  4. 执行生成的脚本,获得测试点数据(JSON 格式)
  5. 如果脚本执行失败,回退到直接文本生成模式
- 支持的测试策略及权重:
  - BASIC(1.5): 基础正确性测试
  - BOUNDARY(1.5): 边界值测试
  - OVERFLOW(1.2): 溢出测试(针对 C 语言 int)
  - SPECIAL(1.0): 特殊值测试(0、负数、除零等)
  - STRESS(0.8): 压力测试(大规模数据)
  - RANDOM(1.0): 随机测试

### 5. **config.py** - 配置中心
- `LLM_CONFIG`: LLM API 配置(api_key、base_url、model、timeout、max_retries)
- `C_DATA_TYPES`: C 语言数据类型范围字典
- `TESTCASE_CONFIG`: 测试点生成配置(默认数量、输出目录、是否包含各类测试)

### 6. **__init__.py** - 统一接口
- `generate_cases(problem_description, count)`: 一行式调用入口
  - 输入: 题目描述文本
  - 输出: `[{"input": "...", "output": "..."}]` 格式的测试点列表

## 常用开发命令

### 安装依赖
```bash
pip install openai
```

### 运行示例
```python
from generator_kit import generate_cases

# 方式1: 使用简化接口
problem_text = """
题目描述: 给定两个整数 a 和 b,计算它们的和。
输入格式: 一行两个整数 a b
输出格式: 输出 a+b 的值
数据范围: -1000 <= a, b <= 1000
样例输入: 1 2
样例输出: 3
"""
testcases = generate_cases(problem_text, count=5)
for tc in testcases:
    print(f"输入: {tc['input']}")
    print(f"输出: {tc['output']}")
    print()

# 方式2: 使用完整 API
from generator_kit import ProblemParser, TestCaseGenerator

parser = ProblemParser()
problem = parser.parse_from_text(problem_text)

generator = TestCaseGenerator()
result = generator.generate(problem, count=10)

# 保存到文件
generator.save_testcases(result, output_dir="./testcases")
# 或保存为 JSON
generator.save_testcases_to_json(result, output_file="./testcases.json")
```

### 测试 LLM 连接
```python
from generator_kit.llm_client import get_client

client = get_client()
is_connected = client.test_connection()
print(f"连接状态: {is_connected}")
```

## 关键实现细节

### 题目解析的核心逻辑
`problem_parser.py:_parse_constraints()` 方法使用多个正则表达式模式匹配各种数据范围格式:
- 支持 `1 <= n <= 10^6` 或 `1≤n≤10^6`
- 支持 `n <= 100` 或 `n ≤ 100`
- 支持 `n的范围是[1, 10^9]`
- 支持科学计数法 `10^6` 自动转换为数值
- 支持多变量约束如 `A, B <= 10^18`

### 测试点生成的核心流程
`testcase_generator.py:_generate_with_script()` 方法:
1. 调用 `_generate_generator_script()` 让 LLM 生成 Python 脚本
2. 将脚本写入临时文件
3. 使用 `subprocess` 执行脚本,超时时间 30 秒
4. 解析脚本输出的 JSON 格式测试点
5. 如果失败,调用 `_generate_text_fallback()` 回退到直接文本生成

### 策略选择的启发式规则
`testcase_generator.py:_determine_strategies()` 根据题目特性自动选择策略:
- 始终包含 BASIC 和 RANDOM
- 如果配置启用边界测试,添加 BOUNDARY
- 如果分析出可能溢出,添加 OVERFLOW
- 如果涉及除法或负数,添加 SPECIAL
- 如果配置启用压力测试,添加 STRESS

## 配置说明

### 修改 LLM API
编辑 `config.py` 中的 `LLM_CONFIG`:
```python
LLM_CONFIG = {
    "api_key": "your-api-key",  # 修改这里
    "base_url": "https://your-api-endpoint",
    "model": "your-model-name",
    "timeout": 120,
    "max_retries": 3,
}
```

### 调整测试点生成行为
编辑 `config.py` 中的 `TESTCASE_CONFIG`:
```python
TESTCASE_CONFIG = {
    "default_count": 10,  # 默认生成的测试点总数
    "output_dir": "./testcases",  # 输出目录
    "include_edge_cases": True,  # 是否包含边界测试
    "include_overflow_test": True,  # 是否包含溢出测试
    "include_stress_test": True,  # 是否包含压力测试
}
```

## 依赖项
- `openai`: OpenAI SDK(用于调用 LLM API)
- Python 3.6+
- 标准库: `json`, `re`, `subprocess`, `tempfile`, `time`, `dataclasses`, `enum`

## 注意事项
1. LLM API 配置中的 `api_key` 默认为 "EMPTY",使用前必须修改
2. 生成的 Python 脚本会以 `subprocess` 方式执行,有 30 秒超时限制
3. 如果脚本执行失败,会自动回退到直接文本生成模式
4. 测试点文件默认保存到 `./testcases/` 目录
5. 支持中英文题目描述(解析器识别中文关键词)
