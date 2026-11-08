from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import uuid
from typing import Any, List, Optional

class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[List[dict]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        super().__init__(message)

def create_error_response(
    code: str,
    message: str,
    status_code: int,
    details: Optional[List[dict]] = None,
    request_id: Optional[str] = None,
) -> JSONResponse:
    req_id = request_id or str(uuid.uuid4())
    content = {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "request_id": req_id,
        }
    }
    response = JSONResponse(status_code=status_code, content=content)
    response.headers["X-Request-ID"] = req_id
    return response
