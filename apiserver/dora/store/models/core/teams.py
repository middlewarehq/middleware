import uuid

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from dora.store import Base


class Team(Base):
    __tablename__ = "Team"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = Column(String)
    member_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("Users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_deleted = Column(Boolean)

    def __hash__(self):
        return hash(self.id)
