import os
import json
from openai import OpenAI
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

class ProblemMutator:
    def __init__(self):
        # Using the custom Loopcoder client config
        self.api_key = os.getenv("OPEN_AI_API_KEY", "EMPTY")
        self.base_url = os.getenv("OPEN_AI_BASE_URL", "https://console.siflow.cn/siflow/longmen/skyinfer/wzhang/loopcoder/v1/8000/v1")
        self.model = os.getenv("MODEL_NAME", "loopcoder")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

    def _generate_standard_solution(self, title, content):
        """
        Generate a standard C solution using LLM when it's missing from the DB.
        """
        prompt = f"""
        你是一位高级软件工程师。
        任务：针对以下 LeetCode 题目，生成一个标准且优雅的 C 解决方案代码。
        
        题目名称: {title}
        题目描述: {content}
        
        要求：
        1. 仅输出 C 代码。
        2. 代码应包含在一个常用的类结构中（如 Solution）。
        3. 不要包含任何解释性文字。
        """
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        # Basic cleanup of markdown code blocks
        code = response.choices[0].message.content.strip()
        if code.startswith("```c"):
            code = code.split("```c")[1].split("```")[0].strip()
        elif code.startswith("```"):
            code = code.split("```")[1].split("```")[0].strip()
        return code

    def mutate(self, seed_question, target_type):
        """
        seed_question: dict containing original problem data
        target_type: "fill_in_the_blank", "bug_finding", "story_rewrite"
        """
        # Extract description (handle HTML)
        description = seed_question.get("content", "")
        
        # Extract C code snippet
        original_code = ""
        snippets = seed_question.get("codeSnippets", [])
        if snippets:
            for snippet in snippets:
                if snippet.get("lang") == "C":
                    original_code = snippet["code"]
                    break
        
        if not original_code:
            # Fallback for older or different formats
            original_code = seed_question.get("code", "")
            
        # IF STILL EMPTY, generate using LLM
        if not original_code:
            print("警告: 未在题库中找到代码片段。正在请求大模型生成标准题解...")
            original_code = self._generate_standard_solution(
                seed_question.get("title", ""), 
                seed_question.get("content", "")
            )
            print(f"成功生成 '{seed_question.get('title')}' 的标准题解。")

    def _parse_tags(self, text, tags):
        """
        Custom parser to extract content from XML-like tags.
        """
        import re
        result = {}
        for tag in tags:
            pattern = f"<{tag}>(.*?)</{tag}>"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                result[tag.lower()] = match.group(1).strip()
            else:
                result[tag.lower()] = ""
        return result

    def mutate(self, seed_question, target_type):
        """
        seed_question: dict containing original problem data
        target_type: "fill_in_the_blank", "bug_finding", etc.
        """
        description = seed_question.get("content", "")
        original_code = ""
        snippets = seed_question.get("codeSnippets", [])
        if snippets:
            for snippet in snippets:
                if snippet.get("lang") == "C":
                    original_code = snippet["code"]
                    break
        
        if not original_code:
            original_code = seed_question.get("code", "")
            
        if not original_code:
            print("警告: 未在题库中找到代码片段。正在请求大模型生成标准题解...")
            original_code = self._generate_standard_solution(
                seed_question.get("title", ""), 
                seed_question.get("content", "")
            )
            print(f"成功生成 '{seed_question.get('title')}' 的标准题解。")

        # Use Tag-based prompts for maximum reliability
        prompts = {
            "fill_in_the_blank": f"""
                [任务] 将提供的算法代码改为“代码填空题”。
                [代码库]
                {original_code}
                [题目信息]
                {description}
                [严苛要求]
                1. **严禁输出完整代码**。你必须选择 3-5 处关键逻辑（如循环条件、变量初始化、核心判断）并用 "_________" 替换。
                2. 输出必须包含在以下标签中：
                <DESC>此处写中文题目描述</DESC>
                <CODE>此处写带有 3 个以上空缺的代码(必须含多个 _________)</CODE>
                <ANSWER>按顺序写出这 3 个及以上空缺对应的正确代码，每行一个</ANSWER>
            """,
            "bug_finding": f"""
                [任务] 将提供的算法代码改为“找错题”。
                [代码库]
                {original_code}
                [题目信息]
                {description}
                [严苛要求]
                1. **严禁输出正确的代码**。你必须引入 1-2 处逻辑错误。
                2. 输出必须包含在以下标签中：
                <DESC>此处写中文题目描述</DESC>
                <CODE>此处写带Bug的代码</CODE>
                <EXPLANATION>此处写错误解析</EXPLANATION>
                <FIX>此处写修复建议</FIX>
            """,
            "performance_analysis": f"""
                [任务] 提供算法性能分析。
                代码内容:
                {original_code}
                [要求]
                1. 严禁只重复代码。必须分析时空复杂度并提供优化建议。
                2. 输出必须包含在以下标签中：
                <DESC>此处写中文题目描述</DESC>
                <ANALYSIS>此处写复杂度分析</ANALYSIS>
                <TIME>时间复杂度</TIME>
                <SPACE>空间复杂度</SPACE>
                <HINTS>优化建议</HINTS>
            """,
            "solution_design": f"""
                [任务] 设计应用方案。
                代码核心逻辑:
                {original_code}
                [要求]
                1. 设计现实场景，不输出代码。
                2. 输出必须包含在以下标签中：
                <DESC>此处写中文题目描述</DESC>
                <SCENARIO>此处写应用场景</SCENARIO>
                <REQUIREMENTS>方案需求</REQUIREMENTS>
                <HINTS>核心提示</HINTS>
            """
        }

        prompt = prompts.get(target_type)
        if not prompt:
            return json.dumps({"error": "Invalid target type"})

        for attempt in range(2):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000
            )
            raw_content = response.choices[0].message.content
            
            # Map tags to JSON keys used by app.py/generator_service.py
            if target_type == "fill_in_the_blank":
                parsed = self._parse_tags(raw_content, ["DESC", "CODE", "ANSWER"])
                if parsed["code"]:
                    masked = parsed["code"]
                    # Multi-point masking fallback: iterate through lines in answer
                    if parsed["answer"]:
                        answers = [a.strip() for a in parsed["answer"].split('\n') if a.strip()]
                        for ans_part in answers:
                            if ans_part in masked:
                                masked = masked.replace(ans_part, "_________")
                    
                    # If STILL no blanks (model completely ignored instruction), 
                    # use the original single-point fallback if possible
                    if "_________" not in masked and parsed["answer"]:
                        masked = masked.replace(parsed["answer"].strip(), "_________")
                    
                    return json.dumps({
                        "problem_description": parsed["desc"],
                        "masked_code": masked,
                        "answer": parsed["answer"]
                    })
            elif target_type == "bug_finding":
                parsed = self._parse_tags(raw_content, ["DESC", "CODE", "EXPLANATION", "FIX"])
                if parsed["code"]:
                    return json.dumps({
                        "problem_description": parsed["desc"],
                        "buggy_code": parsed["code"],
                        "explanation_of_bugs": parsed["explanation"],
                        "fix_suggestion": parsed["fix"]
                    })
            elif target_type == "performance_analysis":
                parsed = self._parse_tags(raw_content, ["DESC", "ANALYSIS", "TIME", "SPACE", "HINTS"])
                return json.dumps({
                    "problem_description": parsed["desc"],
                    "analysis": parsed["analysis"],
                    "time_complexity": parsed["time"],
                    "space_complexity": parsed["space"],
                    "optimization_hints": parsed["hints"]
                })
            elif target_type == "solution_design":
                parsed = self._parse_tags(raw_content, ["DESC", "SCENARIO", "REQUIREMENTS", "HINTS"])
                return json.dumps({
                    "problem_description": parsed["desc"],
                    "design_scenario": parsed["scenario"],
                    "requirements": parsed["requirements"],
                    "architectural_hints": parsed["hints"]
                })
                
        return json.dumps({"error": "Failed to parse content from tags"})

if __name__ == "__main__":
    # Placeholder for test
    print("Mutator initialized.")
