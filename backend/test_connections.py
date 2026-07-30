import asyncio
from app.config import settings
from langchain_openai import ChatOpenAI
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_cerebras():
    logger.info("Testing Cerebras LLM Connection...")
    try:
        cerebras_api_key = settings.CEREBRAS_API_KEY or os.getenv("CEREBRAS_API_KEY")
        
        model = ChatOpenAI(
            model="gpt-oss-120b", 
            temperature=0, 
            api_key=cerebras_api_key,
            base_url="https://api.cerebras.ai/v1",
            max_retries=1
        )
        response = model.invoke("Reply with exactly: 'OK'")
        if "OK" in response.content:
            logger.info("Cerebras Connection: SUCCESS")
            return True
        else:
            logger.warning(f"Cerebras Connection: UNEXPECTED RESPONSE: {response.content}")
            return False
    except Exception as e:
        logger.error(f"Cerebras Connection: FAILED - {e}")
        return False

async def main():
    cerebras_ok = await test_cerebras()
    
    if cerebras_ok:
        print("\n--- ALL TESTS PASSED ---")
    else:
        print("\n--- SOME TESTS FAILED ---")

if __name__ == "__main__":
    asyncio.run(main())
