"""
集成接口 - 提供简易的测试点生成函数
"""
import os
import sys
from typing import List, Dict, Any

# 将当前目录加入路径，确保内部导入正常
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from .problem_parser import ProblemParser
    from .testcase_generator import TestCaseGenerator
except ImportError:
    # 兼容非 package 模式调用
    from problem_parser import ProblemParser
    from testcase_generator import TestCaseGenerator

def generate_cases(problem_description: str, count: int = 5) -> List[Dict[str, str]]:
    """
    一行式调用生成测试点
    
    Args:
        problem_description: 题目描述文本（包括输入输出格式、数据范围等）
        count: 需要生成的测试点数量
        
    Returns:
        List[Dict]: 格式为 [{"input": "...", "output": "..."}] 的列表
    """
    parser = ProblemParser()
    problem = parser.parse_from_text(problem_description)
    
    generator = TestCaseGenerator()
    result = generator.generate(problem, count=count)
    
    return [{"input": tc.input_data, "output": tc.expected_output} for tc in result.testcases]
