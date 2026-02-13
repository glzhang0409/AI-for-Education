import os
import sys
import json
import uuid
from flask import Blueprint, request, jsonify, Response, stream_with_context, session as flask_session
from typing import Dict, Any, List, Optional

# Add TeachingAgent paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
teaching_agent_dir = os.path.join(project_root, 'TeachingAgent')

if teaching_agent_dir not in sys.path:
    sys.path.insert(0, teaching_agent_dir)
if os.path.join(teaching_agent_dir, 'src') not in sys.path:
    sys.path.insert(0, os.path.join(teaching_agent_dir, 'src'))

# Import agents and client
try:
    from teaching_agents.core_teaching_agent import CoreTeachingAgent
    from teaching_agents.error_analysis_agent import ErrorAnalysisAgent
    from llm_client import LLMClient
except ImportError as e:
    import traceback
    traceback.print_exc()
    print(f"Error importing TeachingAgent modules: {e}")
    # Define dummy classes to avoid crash during import, but routes will fail
    class CoreTeachingAgent: pass
    class ErrorAnalysisAgent: pass
    class LLMClient: pass

# Create Blueprint
teaching_bp = Blueprint('teaching', __name__, url_prefix='/api/teaching')

# Global session store for agents (in-memory)
# Note: In a production multi-worker environment, this should be Redis.
# For this environment, we use a global dict.
TEACHING_SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_llm_client():
    """Create LLM Client using environment variables"""
    # Prefer values from TeachingAgent/.env if loaded, or system env
    # The app.py loads .env, so os.environ should have them.
    # We can also fallback to hardcoded defaults or raise error.
    api_key = os.getenv("SIFLOW_API_KEY") or os.getenv("API_KEY")
    # Use Siflow URL if available, otherwise default
    api_base = "https://console.siflow.cn/siflow/longmen/skyinfer/fjing/qwen-lcb/v1/8020/v1" 
    # Check if app.py defined MODEL_ENDPOINTS, maybe we can reuse?
    # For now, let's use what LLMClient expects or defaults.
    
    # Actually, let's check what app.py uses.
    # app.py uses "https://console.siflow.cn/..."
    
    # We will try to instantiate LLMClient with env vars.
    return LLMClient(api_key=api_key)

def get_or_create_agent_session(session_id: str, agent_type: str):
    """Get or create an agent session"""
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id not in TEACHING_SESSIONS:
        try:
            llm_client = get_llm_client()
            
            if agent_type == 'core_teaching':
                agent = CoreTeachingAgent(llm_client)
            elif agent_type == 'error_analysis':
                agent = ErrorAnalysisAgent(llm_client)
            else:
                # Default to core teaching
                agent = CoreTeachingAgent(llm_client)
                
            TEACHING_SESSIONS[session_id] = {
                "agent": agent,
                "agent_type": agent_type,
                "created_at": str(uuid.uuid4()) # dummy timestamp
            }
        except Exception as e:
            print(f"Failed to create agent: {e}")
            raise e
            
    return session_id, TEACHING_SESSIONS[session_id]

@teaching_bp.route('/select-topics', methods=['POST'])
def select_topics():
    data = request.json
    session_id = data.get('session_id')
    agent_type = data.get('agent_type', 'core_teaching')
    topic_ids = data.get('topic_ids', [])
    difficulty = data.get('difficulty', 'medium')

    try:
        session_id, session_data = get_or_create_agent_session(session_id, agent_type)
        agent = session_data['agent']
        
        # Ensure agent matches type (if session existed)
        if session_data['agent_type'] != agent_type:
            # Re-create if type mismatch
            del TEACHING_SESSIONS[session_id]
            session_id, session_data = get_or_create_agent_session(session_id, agent_type)
            agent = session_data['agent']

        if hasattr(agent, 'set_difficulty'):
            agent.set_difficulty(difficulty)
            
        initial_response = agent.set_selected_topics(topic_ids)
        
        return jsonify({
            "message": "Topics selected",
            "initial_response": initial_response,
            "session_id": session_id
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@teaching_bp.route('/chat', methods=['POST'])
def chat():
    # Check if it's a JSON request or standard form
    data = request.json or {}
    message = data.get('message', '')
    session_id = data.get('session_id')
    agent_type = data.get('agent_type', 'core_teaching')

    if not session_id or session_id not in TEACHING_SESSIONS:
        return jsonify({"error": "Session not found"}), 404

    session_data = TEACHING_SESSIONS[session_id]
    agent = session_data['agent']

    def generate():
        try:
            # Use agent's logic to generate response
            # Since LLMClient.chat_stream is available, we should use it if the agent exposes it.
            # But CoreTeachingAgent.chat() is synchronous and returns full string.
            # However, backend.py implemented `generate_response_stream` which replicates agent logic.
            # We should try to use that if possible, or just wrap the sync chat in a stream (pseudo-stream).
            
            # Let's see backend.py's generate_response_stream again.
            # It accesses agent.llm_client.chat_stream directly and manages memory manually!
            # This is BAD design in backend.py (logic leak), but we must copy it to support streaming.
            
            # Replicating backend.py logic:
            
            # 1. Send session_id
            # yield f"data: {json.dumps({'session_id': session_id, 'done': False})}\n\n"
            
            # 2. Add user memory
            if hasattr(agent, 'memory'):
                agent.memory.add_memory(
                    f"学生: {message}",
                    importance=0.6,
                    tags=["student_input"],
                    level="short"
                )

            # 3. Build messages
            messages = []
            if hasattr(agent, '_build_system_prompt'):
                messages.append({"role": "system", "content": agent._build_system_prompt()})
            if hasattr(agent, '_get_stage_prompt'):
                stage_prompt = agent._get_stage_prompt()
                if stage_prompt:
                    messages.append({"role": "system", "content": stage_prompt})
            
            # Add history
            if hasattr(agent, 'memory') and hasattr(agent.memory, 'short_term'):
                for mem in agent.memory.short_term.get_all():
                    messages.append({"role": "user", "content": mem.content})

            # 4. Stream from LLM
            full_response = ""
            # We need to use agent.llm_client.chat_stream
            # But wait, does LLMClient have chat_stream? Yes, I saw it.
            
            for chunk in agent.llm_client.chat_stream(messages=messages):
                if chunk:
                    full_response += chunk
                    # Send chunk to frontend
                    # Frontend expects lines like: data: {"content": "...", "done": false}
                    yield f"data: {json.dumps({'content': chunk, 'done': False}, ensure_ascii=False)}\n\n"
            
            # 5. Post-processing (BUG_FOUND, memory update)
            if "[BUG_FOUND]" in full_response:
                if hasattr(agent, 'found_bugs_count') and hasattr(agent, 'total_bugs_count'):
                    agent.found_bugs_count = min(agent.found_bugs_count + 1, agent.total_bugs_count)
                full_response = full_response.replace("[BUG_FOUND]", "").strip()
            
            if hasattr(agent, 'memory'):
                agent.memory.add_memory(
                    f"{agent.__class__.__name__}: {full_response}",
                    importance=0.7,
                    tags=["tutor_response"],
                    level="short"
                )
            
            if hasattr(agent, '_update_stage'):
                # Handle signature difference
                import inspect
                sig = inspect.signature(agent._update_stage)
                if len(sig.parameters) >= 2:
                    agent._update_stage(message, full_response)
                else:
                    agent._update_stage(message)
            
            # 6. Send done signal with progress
            progress = agent.get_progress() if hasattr(agent, 'get_progress') else None
            yield f"data: {json.dumps({'content': '', 'done': True, 'progress': progress}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'content': f'Error: {str(e)}', 'done': True, 'error': True}, ensure_ascii=False)}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@teaching_bp.route('/info', methods=['GET'])
def get_info():
    session_id = request.args.get('session_id')
    agent_type = request.args.get('agent_type', 'core_teaching')
    
    if not session_id or session_id not in TEACHING_SESSIONS:
        return jsonify({"error": "Session not found"}), 404
        
    session_data = TEACHING_SESSIONS[session_id]
    agent = session_data['agent']
    
    info = {
        "session_id": session_id,
        "agent_type": session_data['agent_type'],
    }
    
    if hasattr(agent, "get_progress"):
        progress = agent.get_progress()
        info["progress"] = progress
        
    if hasattr(agent, "get_comprehensive_scores"):
        info["scores"] = agent.get_comprehensive_scores()
    elif hasattr(agent, "get_current_scores"):
        info["scores"] = agent.get_current_scores()
        
    return jsonify(info)

@teaching_bp.route('/next-question', methods=['POST'])
def next_question():
    data = request.json or {}
    session_id = data.get('session_id')
    
    if not session_id or session_id not in TEACHING_SESSIONS:
        return jsonify({"error": "Session not found"}), 404
        
    session_data = TEACHING_SESSIONS[session_id]
    agent = session_data['agent']
    
    if hasattr(agent, "next_question"):
        response = agent.next_question()
        return jsonify({"message": "Switched to next question", "response": response})
    
    return jsonify({"message": "Current agent does not support next_question"})
