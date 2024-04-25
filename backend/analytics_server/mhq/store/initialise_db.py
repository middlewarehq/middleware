from mhq.store import db
from mhq.store.models import Organization
from mhq.utils.lock import get_redis_lock_service
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now


def initialize_database(app):
    with app.app_context():
        with get_redis_lock_service().acquire_lock("initialize_database"):
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

