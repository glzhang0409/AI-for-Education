"""
小航辅导模块 - 独立路由文件
不修改原有代码，通过Blueprint方式集成
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context, session
from config import XiaohangLLM, get_system_base_prompt, get_system_prompts
import json
import uuid
import time

# 创建Blueprint
xiaohang_bp = Blueprint('xiaohang', __name__, url_prefix='/api/xiaohang')

# 知识点列表
KNOWLEDGE_POINTS = [
    '栈', '队列', '数组', '链表', '哈希表', '散列表', '堆', '优先队列',
    '树', '二叉树', '二叉搜索树', 'AVL', '红黑树', 'B树', '字典树', 'Trie',
    '图', 'DFS', 'BFS', '最短路', '最小生成树', '拓扑排序',
    '排序', '查找', '动态规划', '贪心', '回溯', '递归'
]

# 难度级别对应的提示词
DIFFICULTY_PROMPTS = {
    "简单": "设计一道简单难度的编程题，适合初学者，主要考查基础概念和简单操作。",
    "中等": "设计一道中等难度的编程题，需要综合运用知识点，考查算法设计能力。",
    "困难": "设计一道困难难度的编程题，需要深入理解算法原理，考查优化和复杂场景处理能力。"
}

def get_redis_client():
    """获取Redis客户端"""
    from flask import current_app
    return current_app.config['SESSION_REDIS']

@xiaohang_bp.route('/init_session', methods=['POST'])
def init_session():
    """初始化小航辅导会话"""
    data = request.json
    selected_topics = data.get('topics', [])
    
    # 验证选择的知识点数量
    if len(selected_topics) > 3:
        return jsonify({"error": "最多只能选择3个知识点"}), 400
    
    if len(selected_topics) == 0:
        return jsonify({"error": "请至少选择1个知识点"}), 400
    
    # 创建新的会话ID
    session_id = str(uuid.uuid4())
    session['xiaohang_session_id'] = session_id
    session['xiaohang_topics'] = selected_topics
    session['xiaohang_difficulty'] = '简单'  # 初始难度
    session['xiaohang_correct_count'] = 0  # 正确题目计数
    
    return jsonify({
        "session_id": session_id,
        "topics": selected_topics,
        "difficulty": "简单"
    })

@xiaohang_bp.route('/generate_problem', methods=['POST'])
def generate_problem():
    """生成编程题目"""
    session_id = session.get('xiaohang_session_id')
    if not session_id:
        return jsonify({"error": "会话未初始化"}), 400
    
    topics = session.get('xiaohang_topics', [])
    difficulty = session.get('xiaohang_difficulty', '简单')
    
    def generate_response():
        try:
            # 构建题目生成提示词
            topics_str = '、'.join(topics)
            prompt = f"""你是一名专业的C语言数据结构与算法出题专家。请生成一道{difficulty}难度的编程题。

【知识点要求】：
题目必须综合考查以下知识点：{topics_str}

【难度要求】：
{DIFFICULTY_PROMPTS[difficulty]}

【输出格式】：
## 编程题目

**题目描述：** [清晰描述问题]

**输入格式：** [输入说明]

**输出格式：** [输出说明]

**样例输入：**
```
[样例输入数据]
```

**样例输出：**
```
[样例输出数据]
```

**数据范围：** [数据规模约束]

**提示：** [可选的解题提示]

请开始生成题目："""
            
            # 调用AI模型生成题目
            llm = XiaohangLLM()
            full_response = ""
            for content_piece in llm._call(prompt):
                full_response += content_piece
                yield content_piece
            
            # 存储当前题目到Redis
            redis_client = get_redis_client()
            problem_key = f"xiaohang_problem:{session_id}"
            redis_client.setex(
                problem_key,
                3600,  # 1小时过期
                json.dumps({
                    "problem": full_response,
                    "difficulty": difficulty,
                    "topics": topics,
                    "timestamp": time.time()
                })
            )
            
        except Exception as e:
            yield f"错误: {str(e)}"
    
    return Response(stream_with_context(generate_response()), mimetype='text/event-stream')

@xiaohang_bp.route('/submit_code', methods=['POST'])
def submit_code():
    """提交代码并判断正确性"""
    session_id = session.get('xiaohang_session_id')
    if not session_id:
        return jsonify({"error": "会话未初始化"}), 400
    
    data = request.json
    user_code = data.get('code', '')
    
    # 获取当前题目
    redis_client = get_redis_client()
    problem_key = f"xiaohang_problem:{session_id}"
    problem_data = redis_client.get(problem_key)
    
    if not problem_data:
        return jsonify({"error": "未找到当前题目"}), 400
    
    problem_info = json.loads(problem_data.decode('utf-8'))
    current_problem = problem_info['problem']
    
    def generate_response():
        try:
            # 构建代码评判提示词
            prompt = f"""你是一名专业的C语言代码评审专家。请评判学生提交的代码是否正确。

【题目】：
{current_problem}

【学生提交的代码】：
```c
{user_code}
```

【评判要求】：
1. 首先判断代码逻辑是否正确，能否解决题目要求
2. 检查代码是否处理了边界情况
3. 评估代码的时间和空间复杂度是否合理
4. 指出代码中的优点和不足

【输出格式】：
**评判结果：** [正确/部分正确/错误]

**代码分析：**
[详细分析代码的正确性、优缺点]

**改进建议：**
[如果有问题，给出改进建议；如果正确，给出优化建议]

**复杂度分析：**
- 时间复杂度：[分析]
- 空间复杂度：[分析]

请开始评判："""
            
            # 调用AI模型评判
            llm = XiaohangLLM()
            full_response = ""
            for content_piece in llm._call(prompt):
                full_response += content_piece
                yield content_piece
            
            # 判断是否正确（简单检测关键词）
            is_correct = "评判结果：** 正确" in full_response or "评判结果：**正确" in full_response
            
            if is_correct:
                # 更新难度和计数
                correct_count = session.get('xiaohang_correct_count', 0) + 1
                session['xiaohang_correct_count'] = correct_count
                
                if correct_count == 1 and session.get('xiaohang_difficulty') == '简单':
                    session['xiaohang_difficulty'] = '中等'
                    yield "\n\n---\n\n🎉 **恭喜！你已掌握简单难度，现在进入中等难度挑战！**"
                elif correct_count == 2 and session.get('xiaohang_difficulty') == '中等':
                    session['xiaohang_difficulty'] = '困难'
                    yield "\n\n---\n\n🎉 **太棒了！你已掌握中等难度，现在挑战困难难度！**"
                elif correct_count >= 3 and session.get('xiaohang_difficulty') == '困难':
                    yield "\n\n---\n\n🏆 **完美！你已完全掌握所选知识点！**"
            
        except Exception as e:
            yield f"错误: {str(e)}"
    
    return Response(stream_with_context(generate_response()), mimetype='text/event-stream')

@xiaohang_bp.route('/get_guidance', methods=['POST'])
def get_guidance():
    """获取启发式指导"""
    session_id = session.get('xiaohang_session_id')
    if not session_id:
        return jsonify({"error": "会话未初始化"}), 400
    
    data = request.json
    guidance_type = data.get('type', '思路')  # 思路/框架/伪代码/核心语句
    user_code = data.get('code', '')
    
    # 获取当前题目
    redis_client = get_redis_client()
    problem_key = f"xiaohang_problem:{session_id}"
    problem_data = redis_client.get(problem_key)
    
    if not problem_data:
        return jsonify({"error": "未找到当前题目"}), 400
    
    problem_info = json.loads(problem_data.decode('utf-8'))
    current_problem = problem_info['problem']
    
    def generate_response():
        try:
            # 根据类型获取对应的提示词
            system_prompts = get_system_prompts("C")
            
            # 针对小航辅导模块的特殊要求
            if guidance_type == '思路':
                base_prompt = system_prompts['思路']
                extra_requirement = """
【特别要求 - 简洁凝练】：
1. 回答必须简洁，每个要点用1-2句话说明
2. 只讲核心思路，不展开细节
3. 使用要点列表形式，清晰明了
4. 必须包含启发式追问，引导学生思考

【启发式追问示例】：
- "你觉得这个问题的核心是什么？"
- "你想到了哪些可能的数据结构？"
- "这种情况下时间复杂度会是怎样的？"
"""
            elif guidance_type == '框架':
                base_prompt = system_prompts['框架']
                extra_requirement = """
【特别要求 - 核心函数】：
1. 只列出核心函数名称和功能说明
2. 格式：函数名() - 功能描述
3. 不展开函数内部实现
4. 必须包含启发式追问

示例格式：
- init_stack() - 初始化栈结构
- push() - 入栈操作
- pop() - 出栈操作
"""
            elif guidance_type == '伪代码':
                base_prompt = system_prompts['伪代码']
                extra_requirement = """
【特别要求 - 补充框架】：
1. 在框架基础上补充算法逻辑
2. 使用伪代码描述关键步骤
3. 标注重要的判断条件和循环
4. 必须包含启发式追问
"""
            elif guidance_type == '核心语句':
                base_prompt = system_prompts['核心语句']
                extra_requirement = """
【特别要求 - 补齐函数】：
1. 提供完整的C语言代码框架
2. 移除2-3处关键代码，用注释标注：/* 请补全：实现xxx功能 */
3. 其余代码完整可运行
4. 必须包含启发式追问
"""
            else:
                base_prompt = system_prompts['思路']
                extra_requirement = ""
            
            prompt = f"""{base_prompt}

{extra_requirement}

【当前题目】：
{current_problem}

【学生当前代码】（如果有）：
{user_code if user_code else '学生尚未编写代码'}

请根据上述要求提供{guidance_type}指导："""
            
            # 调用AI模型
            llm = XiaohangLLM()
            for content_piece in llm._call(prompt):
                yield content_piece
            
        except Exception as e:
            yield f"错误: {str(e)}"
    
    return Response(stream_with_context(generate_response()), mimetype='text/event-stream')

@xiaohang_bp.route('/reset_session', methods=['POST'])
def reset_session():
    """重置会话"""
    session_id = session.get('xiaohang_session_id')
    if session_id:
        # 清理Redis数据
        redis_client = get_redis_client()
        problem_key = f"xiaohang_problem:{session_id}"
        redis_client.delete(problem_key)
    
    # 清理session
    session.pop('xiaohang_session_id', None)
    session.pop('xiaohang_topics', None)
    session.pop('xiaohang_difficulty', None)
    session.pop('xiaohang_correct_count', None)
    
    return jsonify({"message": "会话已重置"})
