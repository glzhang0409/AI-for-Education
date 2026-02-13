"""
LLM客户端 - 封装与loopcoder模型的交互
"""
import time
from typing import Optional, List, Dict, Any
from openai import OpenAI

from .config import LLM_CONFIG


class LLMClient:
    """LLM客户端，用于与loopcoder模型交互"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """初始化客户端"""
        self.config = config or LLM_CONFIG
        self.client = OpenAI(
            api_key=self.config["api_key"],
            base_url=self.config["base_url"],
            timeout=self.config.get("timeout", 120),
        )
        self.model = self.config["model"]
        self.max_retries = self.config.get("max_retries", 3)
    
    def chat(self, 
             messages: List[Dict[str, str]], 
             temperature: float = 0.7,
             max_tokens: int = 4096) -> str:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表，格式为 [{"role": "user/assistant/system", "content": "..."}]
            temperature: 生成温度
            max_tokens: 最大token数
            
        Returns:
            模型响应内容
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # 指数退避
                    print(f"请求失败，{wait_time}秒后重试... 错误: {e}")
                    time.sleep(wait_time)
        
        raise Exception(f"LLM请求失败，已重试{self.max_retries}次: {last_error}")
    
    def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> str:
        """
        简化的生成接口
        
        Args:
            prompt: 用户提示
            system_prompt: 系统提示
            **kwargs: 其他参数传递给chat方法
            
        Returns:
            模型响应内容
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        return self.chat(messages, **kwargs)
    
    def test_connection(self) -> bool:
        """测试API连接"""
        try:
            response = self.generate("Hello, please respond with 'OK'.", max_tokens=10)
            return True
        except Exception as e:
            print(f"连接测试失败: {e}")
            return False


# 全局客户端实例
_client: Optional[LLMClient] = None


def get_client() -> LLMClient:
    """获取全局LLM客户端实例"""
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
