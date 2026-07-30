import httpx
import asyncio

async def get_free_models():
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://openrouter.ai/api/v1/models")
        data = resp.json()
        free_models = [m["id"] for m in data["data"] if m["pricing"]["prompt"] == "0" and m["pricing"]["completion"] == "0"]
        print("Free models:", free_models)

asyncio.run(get_free_models())
