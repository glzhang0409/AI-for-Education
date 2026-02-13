import sys
import os
# Ensure we can import the package by adding the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    try:
        from generator_kit import generate_cases
        print("开始生成测试点...\n")

        # 方式1: 使用简化接口
        problem_text = """
题目描述: 给定两个整数 a 和 b,计算它们的和。
输入格式: 一行两个整数 a b
输出格式: 输出 a+b 的值
数据范围: -1000 <= a, b <= 1000
样例输入: 1 2
样例输出: 3
"""
        print("正在调用 generate_cases()...")
        testcases = generate_cases(problem_text, count=5)

        print(f"\n成功生成 {len(testcases)} 个测试点:\n")
        for i, tc in enumerate(testcases, 1):
            print(f"测试点 {i}:")
            print(f"  输入: {tc['input'].strip()}")
            print(f"  输出: {tc['output'].strip()}")
            print()

    except ImportError as e:
        print(f"导入错误: {e}")
        print("\n请检查:")
        print("1. 是否安装了 openai 库: pip install openai")
        print("2. config.py 中的 API 配置是否正确")
        import traceback
        traceback.print_exc()

    except Exception as e:
        print(f"执行错误: {e}")
        print("\n可能的原因:")
        print("1. API Key 未配置或配置错误 (请检查 config.py)")
        print("2. 网络连接问题")
        print("3. API 服务不可用")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()