"""
Agent记忆系统
实现三级记忆架构：短期记忆、中期记忆、长期记忆
"""
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import hashlib


@dataclass
class Memory:
    """记忆单元"""
    content: str
    timestamp: str
    importance: float  # 0-1之间，表示重要性
    access_count: int = 0
    tags: List[str] = None
    memory_id: str = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.memory_id is None:
            # 生成唯一ID
            content_hash = hashlib.md5(self.content.encode()).hexdigest()[:8]
            self.memory_id = f"{self.timestamp}_{content_hash}"


class ShortTermMemory:
    """
    短期记忆 (Working Memory)
    - 存储容量：10-20条最近对话
    - 保留时间：会话期间
    - 功能：维持对话上下文
    """

    def __init__(self, max_items: int = 20):
        self.max_items = max_items
        self.memories: List[Memory] = []

    def add(self, content: str, importance: float = 0.5, tags: List[str] = None) -> Memory:
        """添加记忆"""
        memory = Memory(
            content=content,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            importance=importance,
            tags=tags or []
        )
        self.memories.append(memory)

        # 超过容量限制，移除最旧的
        if len(self.memories) > self.max_items:
            self.memories.pop(0)

        return memory

    def get_recent(self, n: int = 5) -> List[Memory]:
        """获取最近的n条记忆"""
        return self.memories[-n:]

    def get_all(self) -> List[Memory]:
        """获取所有短期记忆"""
        return self.memories.copy()

    def clear(self):
        """清空短期记忆"""
        self.memories = []

    def __len__(self):
        return len(self.memories)


class MediumTermMemory:
    """
    中期记忆 (Session Memory)
    - 存储容量：100-200条重要对话
    - 保留时间：当前学习会话
    - 功能：记录学习过程中的关键信息
    - 特性：定期整理和总结
    """

    def __init__(self, max_items: int = 200):
        self.max_items = max_items
        self.memories: List[Memory] = []
        self.summary: str = ""  # 会话摘要

    def add(self, content: str, importance: float = 0.6, tags: List[str] = None) -> Memory:
        """添加记忆"""
        memory = Memory(
            content=content,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            importance=importance,
            tags=tags or []
        )
        self.memories.append(memory)

        # 超过容量，移除重要性最低的
        if len(self.memories) > self.max_items:
            self.memories.sort(key=lambda m: m.importance)
            self.memories.pop(0)

        return memory

    def search_by_tags(self, tags: List[str]) -> List[Memory]:
        """根据标签搜索记忆"""
        return [m for m in self.memories if any(tag in m.tags for tag in tags)]

    def search_by_keyword(self, keyword: str) -> List[Memory]:
        """根据关键词搜索记忆"""
        return [m for m in self.memories if keyword in m.content]

    def get_important(self, threshold: float = 0.7) -> List[Memory]:
        """获取重要性高于阈值的记忆"""
        return [m for m in self.memories if m.importance >= threshold]

    def update_summary(self, summary: str):
        """更新会话摘要"""
        self.summary = summary

    def consolidate(self) -> str:
        """整合记忆，生成摘要"""
        if not self.memories:
            return ""

        important_memories = self.get_important(0.6)
        summary_points = [m.content for m in important_memories[:10]]
        return " | ".join(summary_points)

    def clear(self):
        """清空中期记忆"""
        self.memories = []
        self.summary = ""

    def __len__(self):
        return len(self.memories)


class LongTermMemory:
    """
    长期记忆 (Knowledge Base)
    - 存储容量：几乎无限
    - 保留时间：永久
    - 功能：存储已掌握的知识和经验
    - 特性：支持持久化存储和检索
    """

    def __init__(self, storage_path: str = "long_term_memory.json"):
        self.storage_path = storage_path
        self.memories: List[Memory] = []
        self.knowledge_graph: Dict[str, List[str]] = {}  # 知识图谱：主题 -> 相关记忆ID

        # 加载已保存的记忆
        self._load()

    def add(self, content: str, importance: float = 0.8, tags: List[str] = None) -> Memory:
        """添加记忆"""
        memory = Memory(
            content=content,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            importance=importance,
            tags=tags or []
        )
        self.memories.append(memory)

        # 更新知识图谱
        for tag in tags or []:
            if tag not in self.knowledge_graph:
                self.knowledge_graph[tag] = []
            self.knowledge_graph[tag].append(memory.memory_id)

        return memory

    def search(self, query: str, top_k: int = 5) -> List[Memory]:
        """搜索记忆（简单关键词匹配）"""
        query_lower = query.lower()
        scored_memories = []

        for memory in self.memories:
            score = 0
            content_lower = memory.content.lower()

            # 完全匹配
            if query_lower in content_lower:
                score += 10

            # 标签匹配
            if any(query_lower in tag.lower() for tag in memory.tags):
                score += 5

            # 重要性加权
            score *= memory.importance

            # 访问次数加权（越常访问越重要）
            score *= (1 + memory.access_count * 0.1)

            if score > 0:
                scored_memories.append((memory, score))

        # 按分数排序
        scored_memories.sort(key=lambda x: x[1], reverse=True)

        # 更新访问次数
        for memory, _ in scored_memories[:top_k]:
            memory.access_count += 1

        return [m for m, _ in scored_memories[:top_k]]

    def get_by_tags(self, tags: List[str]) -> List[Memory]:
        """根据标签获取记忆"""
        memory_ids = set()
        for tag in tags:
            if tag in self.knowledge_graph:
                memory_ids.update(self.knowledge_graph[tag])

        return [m for m in self.memories if m.memory_id in memory_ids]

    def get_recent(self, n: int = 10) -> List[Memory]:
        """获取最近的记忆"""
        return self.memories[-n:]

    def forget_old(self, days: int = 30, min_importance: float = 0.5):
        """遗忘旧的不重要记忆"""
        cutoff_date = datetime.now() - timedelta(days=days)

        self.memories = [
            m for m in self.memories
            if (datetime.strptime(m.timestamp, "%Y-%m-%d %H:%M:%S") > cutoff_date or
                m.importance >= min_importance)
        ]

    def save(self):
        """保存到磁盘"""
        data = {
            "memories": [asdict(m) for m in self.memories],
            "knowledge_graph": self.knowledge_graph
        }

        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _load(self):
        """从磁盘加载"""
        if not os.path.exists(self.storage_path):
            return

        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            self.memories = [
                Memory(**m) for m in data.get("memories", [])
            ]
            self.knowledge_graph = data.get("knowledge_graph", {})
        except Exception as e:
            print(f"加载长期记忆失败: {e}")
            self.memories = []
            self.knowledge_graph = {}

    def clear(self):
        """清空所有记忆"""
        self.memories = []
        self.knowledge_graph = {}
        if os.path.exists(self.storage_path):
            os.remove(self.storage_path)

    def __len__(self):
        return len(self.memories)


class AgentMemory:
    """
    Agent记忆系统
    整合三级记忆架构，提供统一接口
    """

    def __init__(
        self,
        agent_name: str,
        storage_path: str = None
    ):
        self.agent_name = agent_name

        # 初始化三级记忆
        self.short_term = ShortTermMemory(max_items=20)
        self.medium_term = MediumTermMemory(max_items=200)

        # 长期记忆存储路径
        if storage_path is None:
            storage_path = f"memory_{agent_name.replace(' ', '_')}.json"
        self.long_term = LongTermMemory(storage_path=storage_path)

    def add_memory(
        self,
        content: str,
        importance: float = 0.5,
        tags: List[str] = None,
        level: str = "short"
    ) -> Memory:
        """
        添加记忆到指定层级

        Args:
            content: 记忆内容
            importance: 重要性 (0-1)
            tags: 标签列表
            level: 记忆层级 (short/medium/long)

        Returns:
            创建的记忆对象
        """
        if level == "short":
            return self.short_term.add(content, importance, tags)
        elif level == "medium":
            return self.medium_term.add(content, importance, tags)
        elif level == "long":
            return self.long_term.add(content, importance, tags)
        else:
            raise ValueError(f"无效的记忆层级: {level}")

    def search(self, query: str, levels: List[str] = None) -> List[Memory]:
        """
        搜索记忆

        Args:
            query: 搜索查询
            levels: 搜索的层级列表，默认搜索所有层级

        Returns:
            相关记忆列表
        """
        if levels is None:
            levels = ["short", "medium", "long"]

        results = []

        if "short" in levels:
            short_results = [
                m for m in self.short_term.get_all()
                if query.lower() in m.content.lower()
            ]
            results.extend(short_results)

        if "medium" in levels:
            results.extend(self.medium_term.search_by_keyword(query))

        if "long" in levels:
            results.extend(self.long_term.search(query))

        # 去重
            seen = set()
            unique_results = []
            for m in results:
                if m.memory_id not in seen:
                    seen.add(m.memory_id)
                    unique_results.append(m)

            return unique_results

        return results

    def get_context(self, max_items: int = 10) -> str:
        """
        获取上下文（用于prompt）

        Args:
            max_items: 最大返回条目数

        Returns:
            格式化的上下文字符串
        """
        context_parts = []

        # 从长期记忆获取相关知识
        if self.long_term.memories:
            recent_long = self.long_term.get_recent(min(3, max_items // 3))
            if recent_long:
                context_parts.append("【长期记忆】")
                for m in recent_long:
                    context_parts.append(f"- {m.content}")

        # 从中期记忆获取会话信息
        if self.medium_term.memories:
            important_medium = self.medium_term.get_important(0.6)
            if important_medium:
                context_parts.append("\n【中期记忆】")
                for m in important_medium[:3]:
                    context_parts.append(f"- {m.content}")

        # 从短期记忆获取最近对话
        if self.short_term.memories:
            recent_short = self.short_term.get_recent(min(5, max_items // 2))
            if recent_short:
                context_parts.append("\n【短期记忆】")
                for m in recent_short:
                    context_parts.append(f"- {m.content}")

        return "\n".join(context_parts)

    def consolidate(self):
        """整合记忆：将重要记忆从短期迁移到长期"""
        # 从短期记忆迁移重要内容到中期记忆
        for memory in self.short_term.get_all():
            if memory.importance >= 0.7:
                self.medium_term.add(
                    memory.content,
                    memory.importance,
                    memory.tags
                )

        # 从中期记忆迁移重要内容到长期记忆
        for memory in self.medium_term.get_important(0.8):
            self.long_term.add(
                memory.content,
                memory.importance,
                memory.tags
            )

        # 保存长期记忆到磁盘
        self.long_term.save()

        # 整合中期记忆
        summary = self.medium_term.consolidate()
        if summary:
            self.medium_term.update_summary(summary)

    def clear_session(self):
        """清理会话记忆（短期和中期）"""
        self.short_term.clear()
        self.medium_term.clear()

    def get_stats(self) -> Dict[str, Any]:
        """获取记忆统计信息"""
        return {
            "agent_name": self.agent_name,
            "short_term_count": len(self.short_term),
            "medium_term_count": len(self.medium_term),
            "long_term_count": len(self.long_term),
            "storage_path": self.long_term.storage_path
        }
