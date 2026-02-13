FROM docker.1ms.run/python:3.10-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 创建简化的 requirements.txt（移除本地路径依赖）
RUN echo "flask==2.3.3" > requirements-docker.txt && \
    echo "flask-cors==4.0.0" >> requirements-docker.txt && \
    echo "flask-session==0.5.0" >> requirements-docker.txt && \
    echo "redis==4.6.0" >> requirements-docker.txt && \
    echo "requests==2.32.3" >> requirements-docker.txt && \
    echo "langchain==0.0.350" >> requirements-docker.txt && \
    echo "numpy==1.26.4" >> requirements-docker.txt && \
    echo "pandas==2.1.4" >> requirements-docker.txt && \
    echo "python-dotenv==1.0.0" >> requirements-docker.txt && \
    echo "openpyxl==3.1.2" >> requirements-docker.txt && \
    echo "openai>=1.0.0" >> requirements-docker.txt && \
    echo "flask-sqlalchemy==3.1.1" >> requirements-docker.txt && \
    echo "pymysql==1.1.0" >> requirements-docker.txt 

# 安装 Python 依赖
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements-docker.txt

# 复制应用代码
COPY app.py config.py config_programming_assistant.py app_xiaohang_enhanced.py models.py ./
COPY static/ ./static/

# 创建非 root 用户
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# 暴露端口
EXPOSE 5011

# 设置启动命令
CMD ["python", "app.py"]