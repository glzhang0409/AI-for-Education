"""
数据模型定义
"""
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Dict, Optional, Any


class TestStrategy(Enum):
    """测试策略枚举"""
    BASIC = "basic"  # 基础正确性测试
    BOUNDARY = "boundary"  # 边界值测试
    OVERFLOW = "overflow"  # 溢出测试（针对C语言）
    SPECIAL = "special"  # 特殊值测试（0、负数等）
    STRESS = "stress"  # 压力/大规模测试
    RANDOM = "random"  # 随机测试


@dataclass
class DataConstraint:
    """数据约束"""
    variable: str  # 变量名
    min_value: Optional[int] = None  # 最小值
    max_value: Optional[int] = None  # 最大值
    data_type: str = "int"  # 推断的数据类型
    description: str = ""  # 约束描述
    
    def may_overflow_int(self) -> bool:
        """检查是否可能导致int溢出"""
        INT_MAX = 2147483647
        INT_MIN = -2147483648
        if self.max_value is not None and self.max_value > INT_MAX:
            return True
        if self.min_value is not None and self.min_value < INT_MIN:
            return True
        return False


@dataclass
class Problem:
    """题目信息"""
    title: str = ""  # 题目标题
    description: str = ""  # 题目描述
    input_format: str = ""  # 输入格式
    output_format: str = ""  # 输出格式
    data_range: str = ""  # 数据范围原文
    constraints: List[DataConstraint] = field(default_factory=list)  # 解析后的约束
    sample_input: str = ""  # 样例输入
    sample_output: str = ""  # 样例输出
    hints: List[str] = field(default_factory=list)  # 提示信息
    
    # 分析结果
    may_have_overflow: bool = False  # 是否可能有溢出
    may_have_division: bool = False  # 是否涉及除法
    may_have_negative: bool = False  # 是否涉及负数
    may_have_float: bool = False  # 是否涉及浮点数
    
    def to_prompt(self) -> str:
        """转换为LLM prompt格式"""
        parts = []
        if self.title:
            parts.append(f"题目标题：{self.title}")
        if self.description:
            parts.append(f"题目描述：{self.description}")
        if self.input_format:
            parts.append(f"输入格式：{self.input_format}")
        if self.output_format:
            parts.append(f"输出格式：{self.output_format}")
        if self.data_range:
            parts.append(f"数据范围：{self.data_range}")
        if self.sample_input:
            parts.append(f"样例输入：\n{self.sample_input}")
        if self.sample_output:
            parts.append(f"样例输出：\n{self.sample_output}")
        return "\n\n".join(parts)


@dataclass
class TestCase:
    """测试点"""
    id: int  # 测试点编号
    input_data: str  # 输入数据
    expected_output: str = ""  # 期望输出
    strategy: TestStrategy = TestStrategy.BASIC  # 使用的测试策略
    description: str = ""  # 测试点描述（用于说明测试目的）
    
    def save(self, output_dir: str, prefix: str = "test"):
        """保存测试点到文件"""
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        input_file = os.path.join(output_dir, f"{prefix}{self.id}.in")
        output_file = os.path.join(output_dir, f"{prefix}{self.id}.out")
        
        with open(input_file, 'w') as f:
            f.write(self.input_data)
        
        if self.expected_output:
            with open(output_file, 'w') as f:
                f.write(self.expected_output)
        
        return input_file, output_file

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "input": self.input_data,
            "output": self.expected_output,
            "description": self.description,
            "strategy": self.strategy.value
        }


@dataclass
class GenerationResult:
    """生成结果"""
    problem: Problem
    testcases: List[TestCase] = field(default_factory=list)
    strategies_used: List[TestStrategy] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)  # 警告信息
    
    def summary(self) -> str:
        """生成结果摘要"""
        lines = [
            f"题目: {self.problem.title or '未命名'}",
            f"生成测试点数: {len(self.testcases)}",
            f"使用策略: {', '.join(s.value for s in self.strategies_used)}",
        ]
        if self.warnings:
            lines.append(f"警告: {len(self.warnings)} 条")
        return "\n".join(lines)
