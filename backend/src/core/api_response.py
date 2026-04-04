from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any = None


class ApiResponseBuilder:
    @staticmethod
    def success(*, data: Any = None, message: str = "Success") -> dict[str, Any]:
        return ApiResponse(success=True, message=message, data=data).model_dump()

    @staticmethod
    def error(*, message: str = "Error", data: Any = None) -> dict[str, Any]:
        return ApiResponse(success=False, message=message, data=data).model_dump()
