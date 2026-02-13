"""
题目解析器 - 解析题目的各个组成部分
"""
import re
from typing import List, Tuple, Optional, Dict
from .models import Problem, DataConstraint
from .config import C_DATA_TYPES


class ProblemParser:
    """题目解析器"""
    
    # 数值范围正则表达式模式
    RANGE_PATTERNS = [
        # 匹配: 1 <= n <= 10^6 或 1≤n≤10^6
        r'(\d+)\s*[<≤]\s*=?\s*([a-zA-Z_]\w*)\s*[<≤]\s*=?\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)',
        # 匹配: n <= 10^6 或 n ≤ 10^6
        r'([a-zA-Z_]\w*)\s*[<≤]\s*=?\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)',
        # 匹配: 1 <= n <= 1000000
        r'(\d+)\s*[<≤]\s*=?\s*([a-zA-Z_]\w*)\s*[<≤]\s*=?\s*(\d+)',
        # 匹配: n的范围是[1, 10^9]
        r'([a-zA-Z_]\w*)\s*的?范围[是为]?\s*\[?\s*(\d+)\s*[,，]\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)\s*\]?',
        # 匹配：n (1 <= n <= 100)
        r'([a-zA-Z_]\w*)\s*\(\s*(\d+)\s*[<≤]=?\s*[a-zA-Z_]\w*\s*[<≤]=?\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)\s*\)',
        # 匹配: A, B <= 10^18 或 A,B <= 10^18（多变量）
        r'([a-zA-Z_]\w*(?:\s*[,，]\s*[a-zA-Z_]\w*)+)\s*[<≤]\s*=?\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)',
        # 匹配: 1 <= A, B <= 10^18
        r'(\d+)\s*[<≤]\s*=?\s*([a-zA-Z_]\w*(?:\s*[,，]\s*[a-zA-Z_]\w*)+)\s*[<≤]\s*=?\s*(\d+(?:\s*\*\s*)?(?:10\s*\^?\s*\d+)?)',
    ]
    
    # 科学计数法转换
    POWER_PATTERN = r'10\s*[\^]?\s*(\d+)'
    
    def __init__(self):
        pass
    
    def parse(self, 
              title: str = "",
              description: str = "",
              input_format: str = "",
              output_format: str = "",
              data_range: str = "",
              sample_input: str = "",
              sample_output: str = "") -> Problem:
        """
        解析题目信息
        
        Args:
            title: 题目标题
            description: 题目描述
            input_format: 输入格式
            output_format: 输出格式
            data_range: 数据范围
            sample_input: 样例输入
            sample_output: 样例输出
            
        Returns:
            Problem对象
        """
        problem = Problem(
            title=title.strip(),
            description=description.strip(),
            input_format=input_format.strip(),
            output_format=output_format.strip(),
            data_range=data_range.strip(),
            sample_input=sample_input.strip(),
            sample_output=sample_output.strip(),
        )
        
        # 解析数据范围中的约束
        problem.constraints = self._parse_constraints(data_range)
        
        # 分析题目特性
        self._analyze_problem_features(problem)
        
        return problem
    
    def parse_from_text(self, text: str) -> Problem:
        """
        从完整文本解析题目（自动识别各部分）
        
        Args:
            text: 完整的题目文本
            
        Returns:
            Problem对象
        """
        sections = self._split_sections(text)
        return self.parse(**sections)
    
    def _split_sections(self, text: str) -> Dict[str, str]:
        """将文本分割为各个部分"""
        sections = {
            "title": "",
            "description": "",
            "input_format": "",
            "output_format": "",
            "data_range": "",
            "sample_input": "",
            "sample_output": "",
        }
        
        # 定义各部分的关键词
        keywords = {
            "title": ["题目", "标题", "Title", "Problem"],
            "description": ["描述", "题目描述", "Description", "问题描述"],
            "input_format": ["输入格式", "输入", "Input", "输入说明"],
            "output_format": ["输出格式", "输出", "Output", "输出说明"],
            "data_range": ["数据范围", "数据规模", "约束", "Constraints", "范围", "数据", "限制"],
            "sample_input": ["样例输入", "输入样例", "Sample Input", "示例输入"],
            "sample_output": ["样例输出", "输出样例", "Sample Output", "示例输出"],
        }
        
        lines = text.split('\n')
        current_section = "description"
        current_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            matched_section = None
            
            # 检查是否是新的section标记
            for section, kws in keywords.items():
                for kw in kws:
                    if line_lower.startswith(kw.lower()) or kw.lower() in line_lower:
                        # 保存当前section内容
                        if current_content:
                            sections[current_section] = '\n'.join(current_content).strip()
                            current_content = []
                        matched_section = section
                        # 如果标记后有内容，提取出来
                        for delimiter in ['：', ':', '-', '—']:
                            if delimiter in line:
                                rest = line.split(delimiter, 1)[1].strip()
                                if rest:
                                    current_content.append(rest)
                                break
                        break
                if matched_section:
                    break
            
            if matched_section:
                current_section = matched_section
            else:
                current_content.append(line)
        
        # 保存最后一个section
        if current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def _parse_value(self, value_str: str) -> int:
        """解析数值字符串，支持科学计数法"""
        value_str = value_str.strip()
        
        # 检查是否包含10^n形式
        power_match = re.search(self.POWER_PATTERN, value_str)
        if power_match:
            power = int(power_match.group(1))
            # 检查是否有系数
            prefix = value_str[:power_match.start()].strip()
            if prefix and prefix[-1] in '*×':
                prefix = prefix[:-1].strip()
            if prefix:
                try:
                    coefficient = int(prefix)
                    return coefficient * (10 ** power)
                except ValueError:
                    pass
            return 10 ** power
        
        # 普通数字
        try:
            return int(value_str.replace(',', '').replace(' ', ''))
        except ValueError:
            return 0
    
    def _parse_constraints(self, data_range: str) -> List[DataConstraint]:
        """从数据范围文本中解析约束"""
        constraints = []
        seen_vars = set()  # 避免重复添加
        
        if not data_range:
            return constraints
        
        # 尝试各种模式
        for pattern in self.RANGE_PATTERNS:
            matches = re.finditer(pattern, data_range, re.IGNORECASE)
            for match in matches:
                groups = match.groups()
                
                if len(groups) == 3:
                    # 形如: 1 <= n <= 100 或 n的范围是[1, 100] 或 1 <= A, B <= 100
                    if groups[0].isdigit() or groups[0].replace(' ', '').replace('*', '').replace('^', '').replace('10', '').isdigit():
                        # 第一种格式: min <= var <= max
                        min_val = self._parse_value(groups[0])
                        var_names = groups[1]
                        max_val = self._parse_value(groups[2])
                    else:
                        # 第二种格式: var的范围[min, max]
                        var_names = groups[0]
                        min_val = self._parse_value(groups[1])
                        max_val = self._parse_value(groups[2])
                    
                    # 处理多变量情况（如 A, B）
                    for var_name in re.split(r'\s*[,，]\s*', var_names):
                        var_name = var_name.strip()
                        if var_name and var_name not in seen_vars:
                            seen_vars.add(var_name)
                            constraint = DataConstraint(
                                variable=var_name,
                                min_value=min_val,
                                max_value=max_val,
                                description=match.group(0)
                            )
                            constraint.data_type = self._infer_data_type(min_val, max_val)
                            constraints.append(constraint)
                    
                elif len(groups) == 2:
                    # 形如: n <= 100 或 A, B <= 100
                    var_names = groups[0]
                    max_val = self._parse_value(groups[1])
                    
                    for var_name in re.split(r'\s*[,，]\s*', var_names):
                        var_name = var_name.strip()
                        if var_name and var_name not in seen_vars:
                            seen_vars.add(var_name)
                            constraint = DataConstraint(
                                variable=var_name,
                                max_value=max_val,
                                description=match.group(0)
                            )
                            constraint.data_type = self._infer_data_type(0, max_val)
                            constraints.append(constraint)
        
        return constraints
    
    def _infer_data_type(self, min_val: Optional[int], max_val: Optional[int]) -> str:
        """根据数值范围推断合适的C数据类型"""
        if max_val is None:
            return "int"
        
        # 检查是否在各类型范围内
        for dtype, range_info in C_DATA_TYPES.items():
            if min_val is not None:
                if min_val >= range_info["min"] and max_val <= range_info["max"]:
                    return dtype
            else:
                if max_val <= range_info["max"]:
                    return dtype
        
        return "long long"
    
    def _analyze_problem_features(self, problem: Problem):
        """分析题目的特性"""
        full_text = f"{problem.description} {problem.input_format} {problem.output_format} {problem.data_range}".lower()
        
        # 检查是否可能有溢出问题
        for constraint in problem.constraints:
            if constraint.may_overflow_int():
                problem.may_have_overflow = True
                break
        
        # 检查关键词
        if any(kw in full_text for kw in ['除', '商', 'divide', 'quotient', '/']):
            problem.may_have_division = True
        
        if any(kw in full_text for kw in ['负', 'negative', '-']):
            problem.may_have_negative = True
        
        if any(kw in full_text for kw in ['小数', '浮点', 'float', 'double', '精度', '.']):
            problem.may_have_float = True


def parse_problem(title: str = "",
                  description: str = "",
                  input_format: str = "",
                  output_format: str = "",
                  data_range: str = "",
                  sample_input: str = "",
                  sample_output: str = "") -> Problem:
    """便捷函数：解析题目"""
    parser = ProblemParser()
    return parser.parse(title, description, input_format, output_format, 
                       data_range, sample_input, sample_output)
