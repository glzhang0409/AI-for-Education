#!/usr/bin/env python3
"""
测试小航API连接
"""
import os
import requests
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def test_xiaohang_api():
    """测试小航API连接"""
    api_url = os.getenv('XIAOHANG_API_URL', 'https://api.xhang.buaa.edu.cn:28119/apps/llm/chat/agent')
    api_key = os.getenv('XIAOHANG_API_KEY')
    
    print(f"📡 测试小航API连接...")
    print(f"API URL: {api_url}")
    print(f"API Key: {api_key[:10]}..." if api_key else "未设置")
    print()
    
    if not api_key:
        print("❌ 错误：未设置XIAOHANG_API_KEY环境变量")
        return False
    
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    
    payload = {
        "stream": True,
        "metadata": {
            "name": "小航",
            "developer": "北京航空航天大学"
        },
        "messages": [{
            'role': 'user',
            'content': '你好，请简单介绍一下你自己。'
        }]
    }
    
    try:
        print("🔄 发送测试请求...")
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            stream=True,
            timeout=10
        )
        
        print(f"📊 HTTP状态码: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ API Key无效或已过期")
            return False
        elif response.status_code != 200:
            print(f"❌ API调用失败: {response.text}")
            return False
        
        print("✅ 连接成功！")
        print("\n📝 API响应内容：")
        print("-" * 50)
        
        content_received = False
        for line in response.iter_lines():
            if line:
                try:
                    line_text = line.decode('utf-8')
                    if line_text.startswith('data: '):
                        data = json.loads(line_text[6:])
                        if 'choices' in data and len(data['choices']) > 0:
                            if data['choices'][0].get('finish_reason') is None:
                                if 'message' in data['choices'][0]:
                                    content = data['choices'][0]['message'].get('content', '')
                                    if content:
                                        content_received = True
                                        print(content, end='', flush=True)
                except json.JSONDecodeError:
                    continue
        
        print()
        print("-" * 50)
        
        if content_received:
            print("\n✅ API测试成功！")
            return True
        else:
            print("\n⚠️ 未收到API响应内容")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ 连接超时")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ 无法连接到服务器: {str(e)}")
        print("\n可能的原因：")
        print("1. 网络连接问题")
        print("2. API服务器暂时不可用")
        print("3. 防火墙或代理设置")
        return False
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")
        return False

if __name__ == '__main__':
    success = test_xiaohang_api()
    exit(0 if success else 1)
