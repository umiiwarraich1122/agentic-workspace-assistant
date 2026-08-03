import httpx
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Shared persistent connection pool — reuses TCP connections across ALL requests
# This eliminates the TLS handshake overhead (was creating a new client per call)
_shared_client: httpx.AsyncClient | None = None

def get_shared_client() -> httpx.AsyncClient:
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            http2=True,  # Enable HTTP/2 multiplexing for parallel requests over same connection
        )
    return _shared_client


class GoogleClient:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    async def get(self, url: str, params: dict = None):
        client = get_shared_client()
        response = await client.get(url, headers=self.headers, params=params)
        self._handle_error(response)
        return response.json()

    async def post(self, url: str, json: dict = None):
        client = get_shared_client()
        response = await client.post(url, headers=self.headers, json=json)
        self._handle_error(response)
        return response.json() if response.content else {}

    async def patch(self, url: str, json: dict = None):
        client = get_shared_client()
        response = await client.patch(url, headers=self.headers, json=json)
        self._handle_error(response)
        return response.json() if response.content else {}

    async def delete(self, url: str):
        client = get_shared_client()
        response = await client.delete(url, headers=self.headers)
        self._handle_error(response)
        return True

    def _handle_error(self, response: httpx.Response):
        if not response.is_success:
            logger.error(f"Google API Error ({response.status_code}): {response.text[:200]}")
            try:
                error_body = response.json()
                error_msg = error_body.get("error", {}).get("message", response.text)
            except Exception:
                error_msg = response.text

            if response.status_code == 401:
                detail = "Google session expired. Please log in again."
            elif response.status_code == 403:
                detail = f"Permission denied: {error_msg}"
            elif response.status_code == 404:
                detail = f"Not found: {error_msg}"
            else:
                detail = f"Google API Error ({response.status_code}): {error_msg}"

            raise HTTPException(status_code=response.status_code, detail=detail)
