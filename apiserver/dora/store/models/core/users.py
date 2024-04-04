from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID

from dora.store import Base


class Users(Base):
    __tablename__ = "Users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    primary_email = Column(String)
    is_deleted = Column(Boolean, default=False)
    avatar_url = Column(String)
