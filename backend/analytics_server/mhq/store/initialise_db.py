from mhq.store import db
from mhq.store.models import Organization
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now


def initialize_database(app):
    with app.app_context():
        default_org = (
            db.session.query(Organization)
            .filter(Organization.name == "default")
            .one_or_none()
        )
        if default_org:
            return
        default_org = Organization(
            id=uuid4_str(),
            name="default",
            domain="default",
            created_at=time_now(),
        )
        db.session.add(default_org)
        db.session.commit()


if __name__ == "__main__":
    initialize_database()
