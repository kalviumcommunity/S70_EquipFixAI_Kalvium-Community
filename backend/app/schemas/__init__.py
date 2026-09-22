from app.schemas.user import (
    UserBase, UserCreate, UserResponse, UserLogin, Token, TokenData, UserRoleUpdate, RoleResponse
)
from app.schemas.machine import (
    MachineBase, MachineCreate, MachineUpdate, MachineResponse
)
from app.schemas.incident import (
    IncidentCreate, IncidentAssign, IncidentPriorityUpdate, IncidentResponse
)
from app.schemas.work_order import (
    WorkLogCreate, WorkLogResponse, PartUsageCreate, PartUsageResponse,
    WorkOrderStatusUpdate, WorkOrderComplete, WorkOrderResponse, WorkOrderDetailResponse
)
from app.schemas.maintenance import (
    MaintenanceRecordApproval, MaintenanceRecordResponse,
    MaintenanceScheduleCreate, MaintenanceScheduleResponse
)
from app.schemas.part import (
    PartBase, PartCreate, PartUpdate, PartRestock, PartResponse
)
from app.schemas.document import (
    DocumentCreate, DocumentResponse, DocumentVersionCreate, DocumentVersionResponse
)
from app.schemas.notification import NotificationResponse
from app.schemas.audit import AuditLogResponse
from app.schemas.analytics import AnalyticsDashboardResponse

__all__ = [
    "UserBase", "UserCreate", "UserResponse", "UserLogin", "Token", "TokenData", "UserRoleUpdate", "RoleResponse",
    "MachineBase", "MachineCreate", "MachineUpdate", "MachineResponse",
    "IncidentCreate", "IncidentAssign", "IncidentPriorityUpdate", "IncidentResponse",
    "WorkLogCreate", "WorkLogResponse", "PartUsageCreate", "PartUsageResponse",
    "WorkOrderStatusUpdate", "WorkOrderComplete", "WorkOrderResponse", "WorkOrderDetailResponse",
    "MaintenanceRecordApproval", "MaintenanceRecordResponse",
    "MaintenanceScheduleCreate", "MaintenanceScheduleResponse",
    "PartBase", "PartCreate", "PartUpdate", "PartRestock", "PartResponse",
    "DocumentCreate", "DocumentResponse", "DocumentVersionCreate", "DocumentVersionResponse",
    "NotificationResponse", "AuditLogResponse", "AnalyticsDashboardResponse",
]
