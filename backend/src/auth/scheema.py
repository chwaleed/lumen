from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)
    
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    
    
class LogoutResponse(BaseModel):
    message: str