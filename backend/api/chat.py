"""Chat API endpoint using the multi-LLM router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from models.database import get_db
from models.customer import Customer
from api.dashboard import get_current_customer
from utils.llm_router import LLMRouter

router = APIRouter()

# Initialize router
llm_router = LLMRouter()

class ChatRequest(BaseModel):
    message: str
    provider: Optional[str] = None
    max_tokens: Optional[int] = 1000

class ChatResponse(BaseModel):
    response: str
    provider: str
    usage: dict

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Send a message to the AI assistant"""
    
    # Check if feature is enabled
    if os.getenv("ENABLE_NEW_PRICING", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Feature not enabled")
    
    try:
        # Route the request based on customer plan
        response, metadata = await llm_router.route_request(
            customer=current_customer,
            prompt=request.message,
            db=db,
            provider=request.provider,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=response,
            provider=metadata["provider"],
            usage=metadata["usage"]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add import at top of file
import os