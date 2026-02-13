import requests
import sseclient
import json
import sys

url = "https://api.xhang.buaa.edu.cn:28119/apps/llm/chat/agent"

payload = json.dumps({
  "stream": True,
  "metadata": {
    "name": "小航",
    "developer": "北京航空航天大学"
  },
  "messages": [
    {
      "role": "user",
      "content": "你是谁"
    }
  ]
})
headers = {
  'x-api-key': 'c7bcd1f5-8cb4-4541-a4e2-510fee59ae70',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload, stream=True)

print("小航: ", end='', flush=True)

# 同时进行流式显示和内容收集
content_parts = []
displayed_content = ""

for line in response.iter_lines():
    if line:
        decoded_line = line.decode('utf-8')
        if decoded_line.startswith('data: '):
            data = decoded_line[6:]
            if data.strip() != '[DONE]':
                try:
                    json_data = json.loads(data)
                    if 'choices' in json_data and len(json_data['choices']) > 0:
                        content = json_data['choices'][0]['message'].get('content', '')
                        if content:
                            content_parts.append(content)
                            
                            # 流式显示：只显示新增的内容
                            current_full = ''.join(content_parts)
                            new_content = current_full[len(displayed_content):]
                            
                            # 简单的重复检测：如果新内容是已显示内容的重复，则跳过
                            if new_content and not displayed_content.endswith(new_content):
                                print(new_content, end='', flush=True)
                                displayed_content = current_full
                                
                except json.JSONDecodeError:
                    continue

print()  # 换行

# 最终去重处理（作为备用保障）
full_content = ''.join(content_parts)
if len(full_content) > 20:
    content_length = len(full_content)
    for i in range(content_length // 4, content_length // 2 + 1):
        first_part = full_content[:i]
        remaining = full_content[i:]
        if remaining.startswith(first_part[:len(remaining)]):
            # 如果检测到重复且与显示的内容不同，重新打印正确的内容
            if first_part != displayed_content:
                print("\n[去重后的完整回答]")
                print("小航: ", end='')
                print(first_part)
            break