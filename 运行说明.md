# 项目运行说明

## 方式一：使用 Docker 运行（推荐）

### 前置要求
1. 安装并启动 **Docker Desktop**
2. 确保 Docker 正在运行（托盘图标不再转动）

### 运行步骤

1. **配置环境变量**
   - 复制 `.env.example` 文件为 `.env`
   - 编辑 `.env` 文件，填入你的 API 密钥：
     ```env
     XIAOHANG_API_KEY=你的小航API密钥
     OLLAMA_BEARER_TOKEN=你的Ollama令牌（可选）
     JDOODLE_CLIENT_ID=你的JDoodle客户端ID（可选）
     JDOODLE_CLIENT_SECRET=你的JDoodle客户端密钥（可选）
     ```

2. **启动服务**
   - 在 PowerShell 中运行：
     ```powershell
     .\start.ps1
     ```
   - 脚本会自动：
     - 检查 Docker 状态
     - 创建数据目录
     - 构建并启动容器
     - 启动 Flask 应用和 Redis

3. **访问应用**
   - 启动成功后，访问：http://localhost:5000
   - 脚本会自动在浏览器中打开

### 常用命令

- **查看日志**：
  ```powershell
  docker-compose logs -f
  ```

- **停止服务**：
  ```powershell
  .\stop.ps1
  # 或
  docker-compose stop
  ```

- **重启服务**：
  ```powershell
  docker-compose restart
  ```

- **完全清理（删除容器和数据）**：
  ```powershell
  docker-compose down -v
  ```

---

## 方式二：直接运行 Python（开发模式）

### 前置要求
1. Python 3.10 或更高版本
2. Redis 服务器（需要单独安装并运行）

### 运行步骤

1. **安装 Redis**
   - Windows: 下载并安装 Redis for Windows，或使用 WSL
   - 启动 Redis 服务（默认端口 6379）

2. **安装 Python 依赖**
   ```powershell
   pip install -r requirements.txt
   ```
   
   注意：如果 `requirements.txt` 中包含本地路径依赖，可能需要手动安装核心依赖：
   ```powershell
   pip install flask flask-cors flask-session redis requests langchain python-dotenv
   ```

3. **配置环境变量**
   - 创建 `.env` 文件（参考 `.env.example`）
   - 填入必要的 API 密钥

4. **运行应用**
   ```powershell
   python app.py
   ```

5. **访问应用**
   - 打开浏览器访问：http://localhost:5000

---

## 环境变量说明

### 必需的环境变量
- `XIAOHANG_API_KEY`: 小航API密钥（必需）

### 可选的环境变量
- `XIAOHANG_API_URL`: 小航API地址（默认已配置）
- `OLLAMA_API_URL`: Ollama API地址（用于智能助教功能）
- `OLLAMA_BEARER_TOKEN`: Ollama认证令牌
- `JDOODLE_CLIENT_ID`: JDoodle客户端ID（用于代码执行）
- `JDOODLE_CLIENT_SECRET`: JDoodle客户端密钥
- `REDIS_HOST`: Redis主机地址（默认：localhost）
- `REDIS_PORT`: Redis端口（默认：6379）
- `REDIS_DB`: Redis数据库编号（默认：0）

---

## 故障排查

### Docker 相关问题
1. **Docker 未运行**
   - 启动 Docker Desktop
   - 等待完全启动后再运行脚本

2. **端口被占用**
   - 检查 5000 端口是否被占用
   - 修改 `docker-compose.yml` 中的端口映射

3. **构建失败**
   - 检查网络连接
   - 查看详细错误：`docker-compose logs`

### API 相关问题
1. **API 密钥错误**
   - 检查 `.env` 文件中的密钥是否正确
   - 确认 API 密钥是否有效

2. **API 连接超时**
   - 检查网络连接
   - 确认 API 服务是否可用

### Redis 相关问题
1. **Redis 连接失败**
   - Docker 方式：检查 Redis 容器是否正常运行
   - 直接运行：确认 Redis 服务已启动

---

## 项目结构

- `app.py`: Flask 主应用文件
- `config.py`: 配置文件（LLM 配置、提示词等）
- `app_xiaohang_enhanced.py`: 小航增强版模块
- `static/`: 前端静态文件
- `docker-compose.yml`: Docker Compose 配置
- `Dockerfile`: Docker 镜像构建文件
- `start.ps1`: Windows PowerShell 启动脚本
- `stop.ps1`: Windows PowerShell 停止脚本

---

## 技术支持

如遇到问题，请检查：
1. Docker 日志：`docker-compose logs`
2. 应用日志：查看控制台输出
3. 环境变量配置：确认 `.env` 文件正确

