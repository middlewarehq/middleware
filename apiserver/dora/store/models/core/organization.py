from sqlalchemy import (
    String,
    DateTime,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from dora.store import db


class Organization(db.Model):
    __tablename__ = "Organization"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    name = db.Column(String)
    created_at = db.Column(DateTime(timezone=True))
    domain = db.Column(String)
    other_domains = db.Column(ARRAY(String))

    def __eq__(self, other):

        if isinstance(other, Organization):
            return self.id == other.id

        return False

    def __hash__(self):
        return hash(self.id)
