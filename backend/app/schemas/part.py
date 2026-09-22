from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PartBase(BaseModel):
    part_number: str
    name: str
    description: Optional[str] = None
    quantity: int = Field(ge=0, description="Available stock must be >= 0")
    min_quantity: int = Field(ge=0, description="Minimum stock threshold must be >= 0")
    unit_cost: float = Field(ge=0.0, description="Unit cost must be >= 0.0")
    location: str


class PartCreate(PartBase):
    pass


class PartUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_quantity: Optional[int] = Field(default=None, ge=0)
    unit_cost: Optional[float] = Field(default=None, ge=0.0)
    location: Optional[str] = None


class PartRestock(BaseModel):
    quantity_to_add: int = Field(gt=0, description="Quantity to add must be > 0")
    reason: Optional[str] = None


class PartResponse(PartBase):
    id: int
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
