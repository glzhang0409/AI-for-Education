import json
from enum import Enum
from typing import Dict, Any, Optional

from retriever import LeetCodeRetriever
from mutator import ProblemMutator

class Difficulty(Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class ProblemType(Enum):
    FILL_IN_THE_BLANK = "fill_in_the_blank"
    BUG_FINDING = "bug_finding"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    SOLUTION_DESIGN = "solution_design"

def generate_problem(tag: str, difficulty: Difficulty, problem_type: ProblemType) -> Dict[str, Any]:
    """
    题目生成核心函数
    :param tag: 题目标签 (如 "Array", "Dynamic Programming")
    :param difficulty: 题目难度 (Difficulty 枚举)
    :param problem_type: 题目类型 (ProblemType 枚举)
    :return: 包含 "problem" 和 "answer" 的字典
    """
    # 初始化组件
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "leetcode_db.json")
    retriever = LeetCodeRetriever(db_path)
    mutator = ProblemMutator()
    
    # 1. 检索种子题目
    seed = retriever.retrieve(tag=tag, difficulty=difficulty.value)
    if not seed:
        return {
            "error": f"未能在题库中找到符合条件 ({tag}, {difficulty.value}) 的题目。"
        }
    
    # 2. 调用大模型变异生成
    try:
        result_json = mutator.mutate(seed, problem_type.value)
        result = json.loads(result_json)
        
        # 3. 构造统一的返回值格式
        output = {
            "title": seed.get("title", "未知题目"),
            "type": problem_type.value,
            "problem": "",
            "answer": ""
        }
        
        # 根据不同题型填充字段
        final_desc = result.get('problem_description') or seed.get('content', '（无题目描述）')
        
        if problem_type == ProblemType.FILL_IN_THE_BLANK:
            output["problem"] = f"【题目描述】\n{final_desc}\n\n【待补全代码】\n```c\n{result.get('masked_code')}\n```"
            output["answer"] = result.get('answer')
            
        elif problem_type == ProblemType.BUG_FINDING:
            output["problem"] = f"【题目描述】\n{final_desc}\n\n【含Bug的代码】\n```c\n{result.get('buggy_code')}\n```"
            output["answer"] = f"错误解析：\n{result.get('explanation_of_bugs')}\n\n修复建议：\n{result.get('fix_suggestion')}"
            
        elif problem_type == ProblemType.PERFORMANCE_ANALYSIS:
            output["problem"] = f"【题目描述】\n{final_desc}\n\n请针对以上算法进行性能分析。"
            output["answer"] = {
                "分析": result.get('analysis'),
                "时间复杂度": result.get('time_complexity'),
                "空间复杂度": result.get('space_complexity'),
                "优化建议": result.get('optimization_hints')
            }
            
        elif problem_type == ProblemType.SOLUTION_DESIGN:
            output["problem"] = f"【题目描述】\n{final_desc}\n\n【设计场景】\n{result.get('design_scenario')}\n\n【设计需求】\n{result.get('requirements')}"
            output["answer"] = result.get('architectural_hints')
            
        return output

    except Exception as e:
        return {"error": f"生成过程中发生错误: {str(e)}"}

def main_bug_finding():
    """
    调用示例函数
    """
    print("--- 题目生成接口调用示例 ---")
    
    # 示例参数
    tag = "Array"
    diff = Difficulty.EASY
    p_type = ProblemType.BUG_FINDING
    
    print(f"正在生成: 标签={tag}, 难度={diff.name}, 类型={p_type.name}...")
    
    # 调用生成函数
    result = generate_problem(tag, diff, p_type)
    
    if "error" in result:
        print(f"失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"原题标题: {result['title']}")
        print("-"*30)
        print("【PROBLEM 字段内容】")
        print(result["problem"])
        print("-"*30)
        print("【ANSWER 字段内容】")
        print(result["answer"])

    """
    调用示例函数
    """
    print("--- 题目生成接口调用示例 ---")
    
    # 示例参数
    tag = "Array"
    diff = Difficulty.EASY
    p_type = ProblemType.PERFORMANCE_ANALYSIS
    
    print(f"正在生成: 标签={tag}, 难度={diff.name}, 类型={p_type.name}...")
    
    # 调用生成函数
    result = generate_problem(tag, diff, p_type)
    
    if "error" in result:
        print(f"失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"原题标题: {result['title']}")
        print("-"*30)
        print("【PROBLEM 字段内容】")
        print(result["problem"])
        print("-"*30)
        print("【ANSWER 字段内容】")
        print(result["answer"])

def main_fill_in_the_blank():
    """
    调用示例函数
    """
    print("--- 题目生成接口调用示例 ---")
    
    # 示例参数
    tag = "Array"
    diff = Difficulty.MEDIUM
    p_type = ProblemType.FILL_IN_THE_BLANK
    
    print(f"正在生成: 标签={tag}, 难度={diff.name}, 类型={p_type.name}...")
    
    # 调用生成函数
    result = generate_problem(tag, diff, p_type)
    
    if "error" in result:
        print(f"失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"原题标题: {result['title']}")
        print("-"*30)
        print("【PROBLEM 字段内容】")
        print(result["problem"])
        print("-"*30)
        print("【ANSWER 字段内容】")
        print(result["answer"])

def main_performance_analysis():
    """
    调用示例函数
    """
    print("--- 题目生成接口调用示例 ---")
    
    # 示例参数
    tag = "Dynamic Programming"
    diff = Difficulty.HARD
    p_type = ProblemType.PERFORMANCE_ANALYSIS
    
    print(f"正在生成: 标签={tag}, 难度={diff.name}, 类型={p_type.name}...")
    
    # 调用生成函数
    result = generate_problem(tag, diff, p_type)
    
    if "error" in result:
        print(f"失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"原题标题: {result['title']}")
        print("-"*30)
        print("【PROBLEM 字段内容】")
        print(result["problem"])
        print("-"*30)
        print("【ANSWER 字段内容】")
        print(result["answer"])

def main_solution_design():
    """
    调用示例函数
    """
    print("--- 题目生成接口调用示例 ---")
    
    # 示例参数
    tag = "Dynamic Programming"
    diff = Difficulty.HARD  
    p_type = ProblemType.SOLUTION_DESIGN
    
    print(f"正在生成: 标签={tag}, 难度={diff.name}, 类型={p_type.name}...")
    
    # 调用生成函数
    result = generate_problem(tag, diff, p_type)
    
    if "error" in result:
        print(f"失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"原题标题: {result['title']}")
        print("-"*30)
        print("【PROBLEM 字段内容】")
        print(result["problem"])
        print("-"*30)
        print("【ANSWER 字段内容】")
        print(result["answer"])

if __name__ == "__main__":
    main_bug_finding()
    print("\n")
    main_fill_in_the_blank()
    print("\n")
    main_performance_analysis()
    print("\n")
    main_solution_design()
    print("\n")
    
