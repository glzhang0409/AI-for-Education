"""
测试点生成器 - 核心生成逻辑
"""
import json
import re
from typing import List, Optional, Dict, Any
from .models import Problem, TestCase, TestStrategy, GenerationResult
from .llm_client import get_client, LLMClient
from .config import C_DATA_TYPES, TESTCASE_CONFIG


class TestCaseGenerator:
    """测试点生成器"""
    
    SYSTEM_PROMPT_SCRIPT = """你是一个Python代码生成器，专门用于为编程题目生成测试数据生成脚本。
你的任务是编写一个Python脚本，该脚本执行时会生成高质量的测试数据（输入和对应的正确输出）。

生成的脚本必须包含：
1. `solve(input_data)` 函数：实现题目的正确解法，接收输入字符串，返回正确输出字符串。
2. `generate_random_input()` 函数：使用 `random` 库生成符合题目约束的随机输入字符串。
3. `main()` 块：
   - 循环调用 `generate_random_input()` 生成指定数量的测试输入。
   - 调用 `solve()` 计算对应的输出。
   - 将输入和输出按照JSON格式打印到标准输出。

脚本输出格式要求：
脚本必须将所有生成的测试点以JSON列表的形式一次性打印到stdout，格式如下：
[
    {"input": "...", "output": "...", "description": "随机测试点"},
    ...
]

注意：
- 确保生成的输入数据严格遵守题目约束。
- 确保 `solve` 函数的逻辑正确实现题目要求。
- 不要输出除JSON以外的任何调试信息。
- 如果需要生成大数，请确保Python脚本能正确处理（Python原生支持大数）。
"""

    def __init__(self, client: Optional[LLMClient] = None):
        """初始化生成器"""
        self.client = client or get_client()
    
    def generate(self, 
                 problem: Problem, 
                 count: int = None,
                 strategies: List[TestStrategy] = None) -> GenerationResult:
        """
        生成测试点
        
        Args:
            problem: 题目信息
            count: 生成数量
            strategies: 使用的测试策略列表
            
        Returns:
            GenerationResult对象
        """
        count = count or TESTCASE_CONFIG["default_count"]
        
        # 确定要使用的策略
        if strategies is None:
            strategies = self._determine_strategies(problem)
        
        result = GenerationResult(
            problem=problem,
            strategies_used=strategies,
        )
        
        testcase_id = 1
        
        # 根据策略生成测试点
        for strategy in strategies:
            # 如果已经生成足够的测试点，提前结束
            if len(result.testcases) >= count:
                break
                
            strategy_count = self._get_strategy_count(strategy, count, len(strategies))
            
            try:
                testcases = self._generate_by_strategy(problem, strategy, strategy_count, testcase_id)
                result.testcases.extend(testcases)
                testcase_id += len(testcases)
            except Exception as e:
                result.warnings.append(f"策略 {strategy.value} 生成失败: {str(e)}")
        
        # 严格截断，确保不超过请求数量
        if len(result.testcases) > count:
            result.testcases = result.testcases[:count]
            
        return result
    
    def _determine_strategies(self, problem: Problem) -> List[TestStrategy]:
        """根据题目特性确定测试策略"""
        strategies = [TestStrategy.BASIC]
        
        if TESTCASE_CONFIG.get("include_edge_cases", True):
            strategies.append(TestStrategy.BOUNDARY)
        
        if problem.may_have_overflow and TESTCASE_CONFIG.get("include_overflow_test", True):
            strategies.append(TestStrategy.OVERFLOW)
        
        if problem.may_have_division or problem.may_have_negative:
            strategies.append(TestStrategy.SPECIAL)
        
        if TESTCASE_CONFIG.get("include_stress_test", True):
            strategies.append(TestStrategy.STRESS)
        
        strategies.append(TestStrategy.RANDOM)
        
        return strategies
    
    def _get_strategy_count(self, strategy: TestStrategy, total: int, num_strategies: int) -> int:
        """确定每个策略的测试点数量"""
        base_count = max(1, total // num_strategies)
        
        # 根据策略重要性调整
        weights = {
            TestStrategy.BASIC: 1.5,
            TestStrategy.BOUNDARY: 1.5,
            TestStrategy.OVERFLOW: 1.2,
            TestStrategy.SPECIAL: 1.0,
            TestStrategy.STRESS: 0.8,
            TestStrategy.RANDOM: 1.0,
        }
        
        return max(1, int(base_count * weights.get(strategy, 1.0)))
    
    def _generate_by_strategy(self, 
                               problem: Problem, 
                               strategy: TestStrategy, 
                               count: int,
                               start_id: int) -> List[TestCase]:
        """根据特定策略生成测试点"""
        if strategy == TestStrategy.RANDOM or strategy == TestStrategy.STRESS or strategy == TestStrategy.OVERFLOW:
            # 对于随机、压力、溢出测试，使用脚本生成更可靠
            return self._generate_with_script(problem, strategy, count, start_id)
        
        # 其他基础/边界测试可以使用LLM直接生成（或者统一都用脚本？）
        # 为了响应用户要求"你应该让大模型生成一个用来生成测试点的python代码"，我们优先使用脚本生成
        # 但对于"Boundary"这种特定的、非随机的用例，直接生成可能更直观？
        # 用户说"测试点生成代码应该涉及到random函数"，隐含是针对随机类测试
        # 我们暂时对所有策略尝试用脚本，除了极少数很难用脚本描述的情况
        # 这里统一转为脚本生成
        return self._generate_with_script(problem, strategy, count, start_id)

    def _generate_with_script(self, 
                              problem: Problem, 
                              strategy: TestStrategy, 
                              count: int, 
                              start_id: int) -> List[TestCase]:
        """使用生成的Python脚本生成测试点"""
        import subprocess
        import tempfile
        import os
        
        # 1. 生成生成器脚本
        script_content = self._generate_generator_script(problem, strategy, count)
        
        # 2. 保存并执行脚本
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            script_path = f.name
            f.write(script_content)
            
        try:
            # 执行脚本，捕获输出
            result = subprocess.run(
                ['python3', script_path], 
                capture_output=True, 
                text=True, 
                timeout=30 # 防止死循环
            )
            
            if result.returncode != 0:
                print(f"脚本执行出错: {result.stderr}")
                # Fallback: 如果脚本失败，回退到文本生成模式
                return self._generate_text_fallback(problem, strategy, count, start_id)
                
            json_output = result.stdout.strip()
            
            # 3. 解析输出
            return self._parse_response(json_output, strategy, start_id)
            
        except Exception as e:
            print(f"脚本生成过程异常: {e}")
            return self._generate_text_fallback(problem, strategy, count, start_id)
        finally:
            if os.path.exists(script_path):
                os.unlink(script_path)

    def _generate_text_fallback(self, problem: Problem, strategy: TestStrategy, count: int, start_id: int) -> List[TestCase]:
        """回退方案：直接使用LLM生成文本"""
        prompt = self._build_strategy_prompt(problem, strategy, count)
        response = self.client.generate(
            prompt=prompt,
            system_prompt="你是一个测试数据生成器", # 使用简单Prompt
            temperature=0.7,
        )
        return self._parse_response(response, strategy, start_id)

    def _generate_generator_script(self, problem: Problem, strategy: TestStrategy, count: int) -> str:
        """让LLM生成生成测试数据的Python脚本"""
        
        strategy_desc = ""
        if strategy == TestStrategy.RANDOM:
            strategy_desc = "在题目约束范围内，生成完全随机的数据。"
        elif strategy == TestStrategy.STRESS:
            strategy_desc = "生成接近题目数据规模上限的大规模数据。"
        elif strategy == TestStrategy.OVERFLOW:
             strategy_desc = "生成的输入数据应当使得计算过程中涉及大整数（接近C语言int上限或超过），用于测试溢出。"
        elif strategy == TestStrategy.BOUNDARY:
             strategy_desc = "生成边界情况的数据，例如最小值、最大值、空输入（如果允许）等。"
        else:
            strategy_desc = "生成典型的基础测试数据。"

        prompt = f"""请编写一个Python脚本来为以下题目生成 {count} 组测试数据。
        
题目信息：
{problem.to_prompt()}

生成策略：{strategy.value}
策略描述：{strategy_desc}

脚本要求：
1. 必须包含 `solve(input_string)` 函数：实现题目逻辑，返回正确输出。
2. 必须包含 `generate_input()` 函数：使用 `random` 库生成一个符合上述策略的随机输入（字符串格式）。
3. 主程序循环 {count} 次，生成输入并调用 solve 得到输出。
4. 最终将结果以JSON列表格式输出到stdout：`[{{"input": "...", "output": "...", "description": "..."}}, ...]`
5. 输出只包含JSON，不要有其他print。
6. 代码需要健壮，能够处理题目描述中的各种情况。

请直接返回Python代码，包裹在 ```python ... ``` 中。
"""
        response = self.client.generate(prompt, system_prompt=self.SYSTEM_PROMPT_SCRIPT, temperature=0.2) # 低温度保证代码质量
        
        # 提取代码块
        match = re.search(r'```python\s*([\s\S]*?)```', response)
        if match:
            return match.group(1)
        return response # 如果没有代码块，尝试直接运行返回内容（虽然风险大）
    
    def _build_strategy_prompt(self, problem: Problem, strategy: TestStrategy, count: int) -> str:
        """构建特定策略的生成提示 (Legacy)"""
        base_prompt = f"""请为以下题目生成 {count} 个测试点：

{problem.to_prompt()}

"""
        
        strategy_hints = {
            TestStrategy.BASIC: """
生成策略：基础正确性测试
- 生成简单的、容易理解的测试用例
- 验证程序的基本功能是否正确
- 可以参考样例输入的风格
""",
            TestStrategy.BOUNDARY: f"""
生成策略：边界值测试
- 测试数据范围的边界值（最小值、最大值）
- 如果有数组，测试大小为1和最大允许大小的情况
- 约束信息：{[f"{c.variable}: [{c.min_value}, {c.max_value}]" for c in problem.constraints]}
""",
            TestStrategy.OVERFLOW: f"""
生成策略：溢出测试（针对C语言int类型）
- C语言int范围: {C_DATA_TYPES['int']['min']} 到 {C_DATA_TYPES['int']['max']}
- 生成可能导致计算过程中int溢出的测试数据
- 例如：两个接近INT_MAX的数相加、相乘
- 测试学生是否正确使用了long long类型
""",
            TestStrategy.SPECIAL: """
生成策略：特殊值测试
- 测试0、负数（如果允许）
- 测试空输入或单元素情况
- 测试可能导致除零错误的情况
- 测试重复元素或极端分布
""",
            TestStrategy.STRESS: """
生成策略：压力测试
- 生成接近数据范围上限的大规模测试数据
- 用于测试程序的时间和空间效率
- 注意：只需要生成输入数据结构描述，具体数值可以用范围表示
""",
            TestStrategy.RANDOM: """
生成策略：随机测试
- 生成随机但合法的测试数据
- 覆盖不同的数据规模和分布
- 增加测试的多样性
""",
        }
        
        prompt = base_prompt + strategy_hints.get(strategy, "")
        prompt += f"""

请生成 {count} 个测试点，每个测试点用JSON格式返回，多个测试点用JSON数组包装：
```json
[
    {{"input": "...", "output": "...", "description": "..."}},
    ...
]
```
"""
        return prompt
    
    def _parse_response(self, response: str, strategy: TestStrategy, start_id: int) -> List[TestCase]:
        """解析LLM响应，提取测试点"""
        testcases = []
        
        # 尝试提取JSON
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            # 尝试直接解析
            json_str = response.strip()
        
        try:
            data = json.loads(json_str)
            
            # 处理单个对象和数组两种情况
            if isinstance(data, dict):
                data = [data]
            
            for i, item in enumerate(data):
                if isinstance(item, dict) and "input" in item:
                    testcase = TestCase(
                        id=start_id + i,
                        input_data=item.get("input", ""),
                        expected_output=item.get("output", ""),
                        strategy=strategy,
                        description=item.get("description", ""),
                    )
                    testcases.append(testcase)
        except json.JSONDecodeError:
            # 如果JSON解析失败，尝试其他方式提取
            testcases = self._fallback_parse(response, strategy, start_id)
        
        return testcases
    
    def _fallback_parse(self, response: str, strategy: TestStrategy, start_id: int) -> List[TestCase]:
        """备用解析方法"""
        testcases = []
        
        # 尝试按"输入"/"输出"关键词分割
        input_pattern = r'(?:输入|Input)[：:]\s*([\s\S]*?)(?:输出|Output)[：:]'
        output_pattern = r'(?:输出|Output)[：:]\s*([\s\S]*?)(?:(?:输入|Input)|$)'
        
        inputs = re.findall(input_pattern, response, re.IGNORECASE)
        outputs = re.findall(output_pattern, response, re.IGNORECASE)
        
        for i, (inp, out) in enumerate(zip(inputs, outputs)):
            testcase = TestCase(
                id=start_id + i,
                input_data=inp.strip(),
                expected_output=out.strip(),
                strategy=strategy,
            )
            testcases.append(testcase)
        
        return testcases
    
    def save_testcases(self, result: GenerationResult, output_dir: str = None) -> List[str]:
        """保存测试点到文件"""
        output_dir = output_dir or TESTCASE_CONFIG["output_dir"]
        saved_files = []
        
        for tc in result.testcases:
            files = tc.save(output_dir)
            saved_files.extend(files)
        
        return saved_files
    
    def save_testcases_to_json(self, result: GenerationResult, output_file: str) -> str:
        """保存测试点到JSON文件"""
        data = {
            "problem": {
                "title": result.problem.title,
                "description": result.problem.description,
                "constraints": [str(c) for c in result.problem.constraints]
            },
            "testcases": [tc.to_dict() for tc in result.testcases],
            "strategies": [s.value for s in result.strategies_used],
            "timestamp": "" 
        }
        
        # 尝试添加时间戳
        try:
            import time
            data["timestamp"] = str(time.time())
        except ImportError:
            pass
        
        # 确保目录存在
        import os
        out_dir = os.path.dirname(os.path.abspath(output_file))
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
            
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        return output_file


def generate_testcases(problem: Problem, 
                       count: int = None,
                       strategies: List[TestStrategy] = None) -> GenerationResult:
    """便捷函数：生成测试点"""
    generator = TestCaseGenerator()
    return generator.generate(problem, count, strategies)
