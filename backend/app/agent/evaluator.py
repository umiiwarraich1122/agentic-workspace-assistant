import logging
from langchain_core.messages import ToolMessage, AIMessage, HumanMessage
from app.agent.state import AgentState

logger = logging.getLogger(__name__)

def evaluate_tool_results(state: AgentState):
    """
    Verification Loop: Evaluates if the tool execution (especially RAG) 
    was successful and sufficient.
    If not, it increments retry_count and sends a feedback message back to the agent.
    """
    messages = state["messages"]
    retry_count = state.get("retry_count", 0)
    
    # We only evaluate if the last messages are ToolMessages
    tool_messages = [m for m in reversed(messages) if isinstance(m, ToolMessage)]
    
    if not tool_messages:
        return {"messages": []}
        
    # Check if this was a tool execution step
    if not isinstance(messages[-1], ToolMessage):
        return {"messages": []}

    needs_retry = False
    feedback = []
    
    for tm in tool_messages:
        # Break if we've hit an AIMessage (end of current tool call batch)
        if isinstance(tm, AIMessage):
            break
            
        if tm.name == "document_search":
            content = tm.content
            if "success\": false" in content.lower() or "no relevant information" in content.lower():
                needs_retry = True
                feedback.append(f"The document_search tool failed or found no relevant info for query. Try rewording your search query or using different keywords.")
                
        elif tm.name in ["get_weather", "get_distance"]:
            content = tm.content
            if "success\": false" in content.lower():
                needs_retry = True
                feedback.append(f"Tool {tm.name} failed. Reason: {content}. Either try again with valid arguments or inform the user you cannot fetch this data.")
                
    if needs_retry and retry_count < 2:
        logger.info(f"Self-correction triggered. Retry count: {retry_count + 1}")
        feedback_msg = HumanMessage(content="[SYSTEM SELF-CORRECTION]: " + " ".join(feedback) + " Please retry with improved parameters.")
        return {"messages": [feedback_msg], "retry_count": retry_count + 1}
        
    # If no retry needed, or max retries hit, return empty list to let agent generate final answer
    return {"messages": []}
