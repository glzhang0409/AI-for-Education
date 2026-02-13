import json
import random
import os

class LeetCodeRetriever:
    def __init__(self, db_path="leetcode_db.json"):
        self.db_path = db_path
        self.questions = self._load_db()

    def _load_db(self):
        if not os.path.exists(self.db_path):
            print(f"Warning: {self.db_path} not found.")
            return []
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Handle the specific nested structure from the downloaded dataset
                normalized_questions = []
                for item in data:
                    if "data" in item and "question" in item["data"]:
                        normalized_questions.append(item["data"]["question"])
                    else:
                        normalized_questions.append(item)
                return normalized_questions
        except Exception as e:
            print(f"Error loading database: {e}")
            return []

    def retrieve(self, tag=None, difficulty=None):
        candidates = self.questions
        
        if tag:
            tag_lower = tag.lower()
            def match_tag(q):
                # Handle list of strings or list of objects
                topic_tags = q.get("topicTags", [])
                for t in topic_tags:
                    if isinstance(t, dict) and t.get("name", "").lower() == tag_lower:
                        return True
                    if isinstance(t, str) and t.lower() == tag_lower:
                        return True
                return False
            candidates = [q for q in candidates if match_tag(q)]
        
        if difficulty:
            candidates = [q for q in candidates if q.get("difficulty", "").lower() == difficulty.lower()]
            
        if not candidates:
            return None
            
        return random.choice(candidates)

if __name__ == "__main__":
    # Test retrieval
    retriever = LeetCodeRetriever()
    question = retriever.retrieve(tag="Array", difficulty="Easy")
    print(f"Retrieved Question: {question['title'] if question else 'None'}")
