from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.part import Part, PartUsage
from app.models.user import User
from app.models.enums import UserRole, AuditAction
from app.schemas.part import PartCreate, PartUpdate, PartRestock, PartResponse
from app.schemas.work_order import PartUsageResponse
from app.auth.deps import get_current_user, require_role
from app.services.part_service import PartService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/parts", tags=["Spare Parts"])


def enrich_part_response(part: Part) -> PartResponse:
    data = PartResponse.from_orm(part)
    data.is_low_stock = part.quantity <= part.min_quantity
    return data


@router.get("", response_model=List[PartResponse])
def list_parts(
    low_stock_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TECHNICIAN", "SUPERVISOR", "MANAGER"]))
):
    """List spare parts inventory. Accessible to Technicians, Supervisors, and Managers."""
    query = db.query(Part)
    if search:
        s = f"%{search}%"
        query = query.filter((Part.part_number.ilike(s)) | (Part.name.ilike(s)) | (Part.location.ilike(s)))

    parts = query.order_by(Part.name).all()
    results = [enrich_part_response(p) for p in parts]
    if low_stock_only:
        results = [p for p in results if p.is_low_stock]
    return results


@router.get("/{part_id}", response_model=PartResponse)
def get_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TECHNICIAN", "SUPERVISOR", "MANAGER"]))
):
    """Get single spare part details."""
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part #{part_id} not found."
        )
    return enrich_part_response(part)


@router.post("", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(
    part_in: PartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Register a new spare part SKU (Supervisor/Manager)."""
    existing = db.query(Part).filter(Part.part_number == part_in.part_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Part with SKU '{part_in.part_number}' already exists."
        )

    part = Part(
        part_number=part_in.part_number.upper(),
        name=part_in.name,
        description=part_in.description,
        quantity=part_in.quantity,
        min_quantity=part_in.min_quantity,
        unit_cost=part_in.unit_cost,
        location=part_in.location
    )
    db.add(part)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.PART_INVENTORY_CHANGED,
        entity_type="part",
        entity_id=part.id,
        user_id=current_user.id,
        new_value={"part_number": part.part_number, "quantity": part.quantity}
    )

    db.commit()
    db.refresh(part)
    return enrich_part_response(part)


@router.put("/{part_id}", response_model=PartResponse)
def update_part(
    part_id: int,
    part_in: PartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Update spare part metadata or thresholds (Supervisor/Manager)."""
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part #{part_id} not found."
        )

    update_data = part_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(part, field, val)

    db.commit()
    db.refresh(part)
    return enrich_part_response(part)


@router.post("/{part_id}/restock", response_model=PartResponse)
def restock_part(
    part_id: int,
    restock_data: PartRestock,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Restock inventory for a spare part."""
    part = PartService.restock(
        db=db,
        part_id=part_id,
        quantity_to_add=restock_data.quantity_to_add,
        user_id=current_user.id,
        reason=restock_data.reason
    )
    db.commit()
    db.refresh(part)
    return enrich_part_response(part)


@router.get("/{part_id}/usage-history", response_model=List[PartUsageResponse])
def get_part_usage_history(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """View historical usage of a part across work orders (Supervisor/Manager)."""
    usages = (
        db.query(PartUsage)
        .filter(PartUsage.part_id == part_id)
        .order_by(PartUsage.used_at.desc())
        .all()
    )
    return usages
