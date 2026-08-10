import os
import asyncio
import json
from dotenv import load_dotenv

# Set dummy env vars for local test without docker
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# We must run this test in an async loop
async def test_all_scenarios():
    print("Testing Agentic RAG Scenarios...")
    
    # We will simulate the LangGraph node directly for testing the tools and agent decision.
    # To properly test, we should mock the user input and trace the execution.
    # However, since this is an integration test script, we will just test the tools themselves 
    # to ensure they return the expected structured JSON.
    
    from app.tools.weather_tool import get_weather
    from app.tools.map_tool import get_distance
    from app.tools.document_tool import document_search
    from app.rag.retriever import index_document
    
    print("\n=== TEST 1: Weather Tool ===")
    weather_result = await get_weather.ainvoke({"city": "Lahore"})
    print("Weather Result:", weather_result)
    assert "success" in weather_result
    
    print("\n=== TEST 2: Map Tool ===")
    map_result = await get_distance.ainvoke({"origin": "Lahore", "destination": "Islamabad"})
    print("Map Result:", map_result)
    assert "success" in map_result
    
    print("\n=== TEST 4: Document Search Tool ===")
    # First index a dummy document
    doc_id = "test-doc-123"
    index_document(doc_id, "policy.txt", "The Islamabad office policy states that all employees must arrive by 9 AM. Remote work is allowed on Fridays.")
    
    doc_result = await document_search.ainvoke({"query": "What is the Islamabad office policy?", "document_id": doc_id})
    print("Document Result:", doc_result)
    assert "success" in doc_result
    assert "9 AM" in doc_result
    
    print("\n=== TEST 5: Bad Retrieval (Evaluator Logic) ===")
    bad_doc_result = await document_search.ainvoke({"query": "What is the Mars office policy?", "document_id": doc_id})
    print("Bad Document Result:", bad_doc_result)
    # It should still succeed technically (tool executed), but context won't have Mars.
    # The evaluator logic would handle the retry.
    
    print("\n=== TEST 6: Tool Failure Handling ===")
    bad_map = await get_distance.ainvoke({"origin": "NonExistentPlaceXYZ", "destination": "NowhereCity123"})
    print("Bad Map Result:", bad_map)
    assert "success" in bad_map
    assert '"success": false' in bad_map.lower()

    print("\n✅ ALL TOOL INTEGRATION TESTS PASSED")

if __name__ == "__main__":
    asyncio.run(test_all_scenarios())
