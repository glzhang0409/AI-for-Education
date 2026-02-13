"""
配置文件 - 存放API配置和系统参数
"""

# LLM API 配置
LLM_CONFIG = {
    "api_key": "f93082e1-2cbf-4f81-af8f-9c98d528b6b1",
    "base_url": "https://xhang.buaa.edu.cn/xhang/v1",
    "model": "xhang",
    "timeout": 120,
    "max_retries": 3,
}

# C语言数据类型范围
C_DATA_TYPES = {
    "char": {"min": -128, "max": 127},
    "unsigned char": {"min": 0, "max": 255},
    "short": {"min": -32768, "max": 32767},
    "unsigned short": {"min": 0, "max": 65535},
    "int": {"min": -2147483648, "max": 2147483647},
    "unsigned int": {"min": 0, "max": 4294967295},
    "long long": {"min": -9223372036854775808, "max": 9223372036854775807},
    "unsigned long long": {"min": 0, "max": 18446744073709551615},
}

# 测试点生成配置
TESTCASE_CONFIG = {
    "default_count": 10,  # 默认生成测试点数量
    "output_dir": "./testcases",  # 输出目录
    "include_edge_cases": True,  # 包含边界测试
    "include_overflow_test": True,  # 包含溢出测试
    "include_stress_test": True,  # 包含压力测试
}
