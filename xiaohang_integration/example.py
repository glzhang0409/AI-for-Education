from generator_service import generate_problem, Difficulty, ProblemType
import json

def run_integration_demo():
    """
    小航助教平台集成示例代码
    示范如何调用题目生成服务并获取结构化结果
    """
    print("=== 小航助教题目生成集成示例 ===")
    
    # 1. 设定题目参数
    # 标签建议: "Array", "String", "Hash Table", "Dynamic Programming" 等
    tag = "Array"
    difficulty = Difficulty.MEDIUM
    # 题型可选: 
    # ProblemType.FILL_IN_THE_BLANK (填空)
    # ProblemType.BUG_FINDING (找错)
    # ProblemType.PERFORMANCE_ANALYSIS (性能分析)
    # ProblemType.SOLUTION_DESIGN (方案设计)
    problem_type = ProblemType.FILL_IN_THE_BLANK
    
    print(f"正在为平台生成题目: 标签={tag}, 难度={difficulty.name}, 类型={problem_type.name}...")

    # 2. 调用核心接口
    result = generate_problem(tag, difficulty, problem_type)

    # 3. 处理输出结果
    if "error" in result:
        print(f"生成失败: {result['error']}")
    else:
        print("\n[生成成功]")
        print(f"题目标题: {result['title']}")
        print(f"题目类型: {result['type']}")
        print("-" * 40)
        print("【给前端展示的 PROBLEM 文本】")
        print(result["problem"])
        print("-" * 40)
        print("【存入后台的 ANSWER 数据/参考答案】")
        # 如果是性能分析，结果可能是字典，如果是填空题则是字符串
        if isinstance(result["answer"], dict):
            print(json.dumps(result["answer"], indent=4, ensure_ascii=False))
        else:
            print(result["answer"])

if __name__ == "__main__":
    run_integration_demo()
