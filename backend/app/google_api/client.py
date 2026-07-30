import httpx
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class GoogleClient:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    async def get(self, url: str, params: dict = None):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=self.headers, params=params)
            self._handle_error(response)
            return response.json()

    async def post(self, url: str, json: dict = None):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=self.headers, json=json)
            self._handle_error(response)
            return response.json() if response.content else {}

    async def patch(self, url: str, json: dict = None):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.patch(url, headers=self.headers, json=json)
            self._handle_error(response)
            return response.json() if response.content else {}

    async def delete(self, url: str):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.delete(url, headers=self.headers)
            self._handle_error(response)
            return True

    def _handle_error(self, response: httpx.Response):
        if not response.is_success:
            logger.error(f"Google API Error ({response.status_code}): {response.text}")
            try:
                error_body = response.json()
                error_msg = error_body.get("error", {}).get("message", response.text)
            except Exception:
                error_msg = response.text

            if response.status_code == 401:
                detail = "Google Session expired or token invalid. Please log in again with Google."
            elif response.status_code == 403:
                detail = f"Permission denied by Google API: {error_msg}"
            elif response.status_code == 404:
                detail = f"Resource not found in Google API: {error_msg}"
            else:
                detail = f"Google API Error ({response.status_code}): {error_msg}"

            raise HTTPException(status_code=response.status_code, detail=detail)
