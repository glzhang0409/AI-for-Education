#!/usr/bin/env python3
"""
Generator Kit 使用示例
这个脚本演示如何使用 generator_kit 生成测试点
"""

import sys
import os

# 确保能导入包
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_dependencies():
    """检查依赖是否安装"""
    try:
        import openai
        print("✓ openai 库已安装")
        return True
    except ImportError:
        print("✗ 缺少依赖: openai")
        print("请运行: pip install openai")
        return False

def check_config():
    """检查配置是否正确"""
    from generator_kit.config import LLM_CONFIG
    print("\n=== 当前配置 ===")
    print(f"API Key: {LLM_CONFIG['api_key'][:20]}... if len(LLM_CONFIG['api_key']) > 20 else LLM_CONFIG['api_key']}")
    print(f"Base URL: {LLM_CONFIG['base_url']}")
    print(f"Model: {LLM_CONFIG['model']}")
    print(f"Timeout: {LLM_CONFIG['timeout']}s")
    print("================\n")

    if LLM_CONFIG['api_key'] == "EMPTY" or not LLM_CONFIG['api_key']:
        print("⚠️  警告: API Key 未配置！")
        print("请在 config.py 中设置正确的 api_key")
        return False
    return True

def test_connection():
    """测试 API 连接"""
    print("正在测试 API 连接...")
    try:
        from generator_kit.llm_client import get_client
        client = get_client()
        result = client.test_connection()
        if result:
            print("✓ API 连接成功\n")
            return True
        else:
            print("✗ API 连接失败\n")
            return False
    except Exception as e:
        print(f"✗ 连接测试出错: {e}\n")
        return False

def example_simple():
    """示例1: 使用简化接口"""
    print("=" * 50)
    print("示例1: 使用简化接口 generate_cases()")
    print("=" * 50)

    problem_text = """
题目描述: 给定两个整数 a 和 b,计算它们的和。

输入格式: 一行两个整数 a b，用空格分隔

输出格式: 输出 a+b 的值

数据范围: -1000 <= a, b <= 1000

样例输入: 1 2
样例输出: 3
"""

    try:
        print(f"\n正在生成 5 个测试点...\n")
        testcases = generate_cases(problem_text, count=5)

        print(f"✓ 成功生成 {len(testcases)} 个测试点:\n")
        for i, tc in enumerate(testcases, 1):
            print(f"测试点 {i}:")
            print(f"  输入: {tc['input'].strip()}")
            print(f"  输出: {tc['output'].strip()}")
            print()
        return True
    except Exception as e:
        print(f"✗ 生成失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def example_advanced():
    """示例2: 使用完整 API"""
    print("=" * 50)
    print("示例2: 使用完整 API (保存到文件)")
    print("=" * 50)

    problem_text = """
题目: 数组求和

题目描述:
给定一个数组，计算数组中所有元素的和。

输入格式:
第一行一个整数 n，表示数组长度
第二行 n 个整数，表示数组元素

输出格式:
输出一个整数，表示数组元素的和

数据范围:
1 <= n <= 100
-1000 <= a_i <= 1000

样例输入:
3
1 2 3

样例输出:
6
"""

    try:
        from problem_parser import ProblemParser
        from testcase_generator import TestCaseGenerator

        print(f"\n正在解析题目...")
        parser = ProblemParser()
        problem = parser.parse_from_text(problem_text)

        print(f"✓ 题目解析成功:")
        print(f"  标题: {problem.title}")
        print(f"  约束数量: {len(problem.constraints)}")
        for c in problem.constraints:
            print(f"    - {c.variable}: [{c.min_value}, {c.max_value}] ({c.data_type})")
        print(f"  特性分析:")
        print(f"    - 可能溢出: {problem.may_have_overflow}")
        print(f"    - 涉及除法: {problem.may_have_division}")
        print(f"    - 涉及负数: {problem.may_have_negative}")

        print(f"\n正在生成测试点...")
        generator = TestCaseGenerator()
        result = generator.generate(problem, count=10)

        print(f"\n✓ 生成结果:")
        print(f"  - 测试点数量: {len(result.testcases)}")
        print(f"  - 使用策略: {', '.join(s.value for s in result.strategies_used)}")
        if result.warnings:
            print(f"  - 警告: {result.warnings}")

        # 保存到文件
        output_dir = "./testcases_output"
        print(f"\n正在保存测试点到 {output_dir}/ ...")
        generator.save_testcases(result, output_dir=output_dir)

        # 保存 JSON 格式
        json_file = "./testcases_output/testcases.json"
        generator.save_testcases_to_json(result, output_file=json_file)
        print(f"✓ 测试点已保存到:")
        print(f"  - {output_dir}/ (独立文件)")
        print(f"  - {json_file} (JSON格式)")

        return True
    except Exception as e:
        print(f"✗ 执行失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print("\n" + "=" * 50)
    print("Generator Kit 使用示例")
    print("=" * 50 + "\n")

    # 1. 检查依赖
    if not check_dependencies():
        return

    # 2. 检查配置
    if not check_config():
        print("\n请先修改 config.py 中的 API 配置，然后重新运行")
        return

    # 3. 测试连接
    if not test_connection():
        print("\nAPI 连接失败，请检查网络和配置")
        return

    # 4. 运行示例
    print("\n开始运行示例...\n")

    # 运行示例1
    if not example_simple():
        print("\n示例1执行失败，跳过后续示例")
        return

    print("\n" + "=" * 50 + "\n")

    # 运行示例2
    if not example_advanced():
        print("\n示例2执行失败")
        return

    print("\n" + "=" * 50)
    print("所有示例执行完成！")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    try:
        from generator_kit import generate_cases
        main()
    except ImportError as e:
        print(f"导入错误: {e}")
        print("请确保在正确的目录下运行此脚本")
        import traceback
        traceback.print_exc()
