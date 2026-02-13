"""
编程教学Agent示例程序
演示三个专门针对编程教学的AI Agent
"""
import os
import sys

# 将 teaching_agents 的父目录添加到 Python 路径中
# 这样可以将 teaching_agents 作为一个包导入
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# 同时将 src 目录添加到 Python 路径中
src_dir = os.path.join(parent_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from llm_client import LLMClient
# 从 teaching_agents 包导入
from teaching_agents.feynman_agent import FeynmanAgent
from teaching_agents.reverse_turing_agent import ReverseTuringAgent
from teaching_agents.socratic_agent import SocraticAgent
import json


def print_section(title):
    """打印分节标题"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def demo_feynman():
    """演示费曼学习法Agent - 编程概念解释专家"""
    print_section("费曼学习法 Agent - 编程概念解释专家")

    # 创建Agent
    llm_client = LLMClient()
    agent = FeynmanAgent(llm_client)

    print("我是费曼学习法导师，专门帮助你深入理解编程概念！")
    print("核心原则：用最简单的语言解释复杂概念")
    print("\n常见编程概念示例：")
    print("  - 递归、闭包、异步编程")
    print("  - 设计模式、算法复杂度")
    print("  - 指针、内存管理、并发")
    print("  - 装饰器、生成器、迭代器")

    # 开始学习
    topic = input("\n请输入你想理解的编程概念: ").strip()
    if not topic:
        topic = "递归"  # 默认概念

    print(f"\n{agent.learn_concept(topic)}\n")

    # 对话循环
    while True:
        user_input = input("你的解释: ").strip()

        if user_input.lower() in ['退出', 'exit', 'quit']:
            break

        if user_input.lower() in ['进度', 'progress']:
            print("\n" + agent.get_learning_summary())
            continue

        if user_input.lower() in ['跳过', 'skip']:
            # 直接进入下一阶段
            agent.advance_stage()
            print(f"\n当前阶段: {agent.current_stage.value}")
            continue

        response = agent.chat(user_input)
        print(f"\n费曼导师: {response}\n")

    # 显示最终进度
    print_section("学习进度总结")
    print(agent.get_learning_summary())
    print(f"\n{agent.get_progress()}")


def demo_reverse_turing():
    """演示反向图灵测试Agent - 编程思维能力评估"""
    print_section("反向图灵测试 Agent - 编程思维能力评估")

    # 创建Agent
    llm_client = LLMClient()
    agent = ReverseTuringAgent(llm_client)

    print("欢迎来到编程思维能力评估！")
    print("我会通过对话评估你的编程思维特征。")
    print("\n评估维度：")
    print("  🎯 问题分解能力")
    print("  🔍 调试思维")
    print("  💡 代码抽象能力")
    print("  🏗️ 架构设计思维")
    print("  🎨 代码创造力")
    print("  🧼 代码洁癖（可读性）")
    print("  ⚡ 性能优化意识")

    input("\n按回车开始评估...")

    # 对话循环
    while True:
        response = agent.chat("")
        print(f"\n{response}\n")

        if "评估完成" in response or "最终报告" in response:
            break

        user_input = input("你的回答: ").strip()

        if user_input.lower() in ['退出', 'exit', 'quit']:
            break

    # 显示分数
    print_section("评估结果")
    scores = agent.get_current_scores()
    for dim, score in scores.items():
        level = "🟢 优秀" if score >= 0.7 else ("🟡 良好" if score >= 0.5 else "🔴 需提升")
        print(f"{dim}: {score:.2f} {level}")


def demo_socratic():
    """演示苏格拉底教学法Agent - 代码调试导师"""
    print_section("苏格拉底教学法 Agent - 代码调试导师")

    # 创建Agent
    llm_client = LLMClient()
    agent = SocraticAgent(llm_client)

    print("我是苏格拉底式代码调试导师。")
    print("我不会直接告诉你答案，而是通过提问引导你自己找到问题。")
    print("\n使用场景：")
    print("  - 调试代码bug")
    print("  - 理解算法逻辑")
    print("  - 分析代码问题")
    print("  - 优化代码性能")

    # 开始对话
    problem = input("\n请描述你遇到的编程问题或贴出你的代码: ").strip()
    if not problem:
        problem = "我的递归函数运行很慢，不知道为什么"  # 默认问题

    print(f"\n{agent.discuss_problem(problem)}\n")

    # 对话循环
    while True:
        user_input = input("你的回答/思考: ").strip()

        if user_input.lower() in ['退出', 'exit', 'quit']:
            break

        if user_input.lower() in ['摘要', 'summary']:
            print("\n" + agent.get_dialogue_summary())
            continue

        if user_input.lower() in ['提示', 'hint']:
            print("\n💡 " + agent.get_hint())
            continue

        if user_input.lower() in ['导出', 'export']:
            print("\n" + agent.export_dialogue())
            continue

        response = agent.chat(user_input)
        print(f"\n苏格拉底导师: {response}\n")

    # 显示对话摘要
    print_section("对话摘要")
    print(agent.get_dialogue_summary())
    print(f"\n{agent.get_learning_progress()}")


def demo_memory():
    """演示记忆系统"""
    print_section("编程学习记忆系统")

    from memory import AgentMemory

    # 创建记忆系统
    memory = AgentMemory(agent_name="ProgrammingStudent")

    print("演示三级记忆系统在编程学习中的应用：\n")

    # 添加短期记忆（当前代码上下文）
    print("1. 短期记忆 - 当前代码上下文")
    memory.add_memory(
        "学生正在写一个快速排序算法，使用Python实现",
        importance=0.5,
        tags=["current_task", "sorting", "quicksort"],
        level="short"
    )
    print("   已记录: 正在实现快速排序")

    # 添加中期记忆（学习过程中的理解）
    print("\n2. 中期记忆 - 学习过程中的理解")
    memory.add_memory(
        "学生对递归的理解：函数调用自身，但需要终止条件",
        importance=0.7,
        tags=["understanding", "recursion", "concept"],
        level="medium"
    )
    print("   已记录: 对递归的初步理解")

    # 添加长期记忆（已掌握的技能）
    print("\n3. 长期记忆 - 已掌握的编程技能")
    memory.add_memory(
        "已掌握：Python列表推导式、lambda表达式、装饰器基础用法",
        importance=0.9,
        tags=["mastered", "python", "intermediate"],
        level="long"
    )
    print("   已记录: 掌握Python中级特性")

    # 搜索记忆
    print("\n4. 搜索记忆（个性化学习路径）")
    results = memory.search("递归")
    print(f"   找到 {len(results)} 条相关记忆:")
    for i, mem in enumerate(results[:3], 1):
        print(f"   {i}. {mem.content[:60]}...")

    # 获取上下文（用于辅导）
    print("\n5. 获取学习上下文（用于生成个性化辅导）")
    context = memory.get_context()
    print(context)

    # 整合记忆
    print("\n6. 整合记忆（将重要理解从短期迁移到长期）")
    memory.consolidate()
    print("   记忆整合完成")

    # 显示统计信息
    print("\n7. 学习档案统计")
    stats = memory.get_stats()
    print(json.dumps(stats, indent=2, ensure_ascii=False))


def main():
    """主函数"""
    print("\n" + "=" * 70)
    print("  编程教学AI Agent - 演示程序")
    print("=" * 70)
    print("\n请选择体验类型：")
    print("  1. 费曼学习法 - 编程概念解释专家")
    print("     帮助你深入理解复杂的编程概念")
    print("")
    print("  2. 反向图灵测试 - 编程思维能力评估")
    print("     评估你的编程思维特征和能力维度")
    print("")
    print("  3. 苏格拉底教学法 - 代码调试导师")
    print("     通过提问引导你自己找到代码问题")
    print("")
    print("  4. 记忆系统演示")
    print("     展示三级记忆如何支持个性化学习")
    print("")
    print("  0. 退出")

    while True:
        choice = input("\n请输入选项 (0-4): ").strip()

        if choice == '0':
            print("再见！祝你编程进步！")
            break
        elif choice == '1':
            demo_feynman()
        elif choice == '2':
            demo_reverse_turing()
        elif choice == '3':
            demo_socratic()
        elif choice == '4':
            demo_memory()
        else:
            print("无效选项，请重试")

        # 询问是否继续
        continue_choice = input("\n是否继续体验其他Agent？(y/n): ").strip().lower()
        if continue_choice != 'y':
            print("再见！祝你编程进步！")
            break

        # 重新显示菜单
        print("\n请选择体验类型：")
        print("  1. 费曼学习法 - 编程概念解释专家")
        print("  2. 反向图灵测试 - 编程思维能力评估")
        print("  3. 苏格拉底教学法 - 代码调试导师")
        print("  4. 记忆系统演示")
        print("  0. 退出")


if __name__ == "__main__":
    main()
