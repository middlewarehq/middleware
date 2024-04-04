from sqlalchemy import (
    Column,
    String,
    DateTime,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from dora.store import Base


class Organization(Base):
    __tablename__ = "Organization"

    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String)
    created_at = Column(DateTime(timezone=True))
    domain = Column(String)
    other_domains = Column(ARRAY(String))

    def __eq__(self, other):

        if isinstance(other, Organization):
            return self.id == other.id

        return False

    def __hash__(self):
        return hash(self.id)
