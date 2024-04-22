from sqlalchemy.dialects.postgresql import UUID, ARRAY

from mhq.store import db


class Organization(db.Model):
    __tablename__ = "Organization"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    name = db.Column(db.String)
    created_at = db.Column(db.DateTime(timezone=True))
    domain = db.Column(db.String)
    other_domains = db.Column(ARRAY(db.String))

    def __eq__(self, other):

        if isinstance(other, Organization):
            return self.id == other.id

        return False

    def __hash__(self):
        return hash(self.id)
