from dora.store import rollback_on_exc, session
from dora.store.models import Organization
from dora.utils.string import uuid4_str


@rollback_on_exc
def initialize_database(app):
    with app.app_context():
        default_org = (
            session.query(Organization)
            .filter(Organization.name == "default")
            .one_or_none()
        )
        if not default_org:
            return

        print("🚀default_org.id =", default_org.id)
        default_org = Organization(
            id=uuid4_str(),
            name="default",
            domain="default",
        )
        session.add(default_org)
        session.commit()


if __name__ == "__main__":
    initialize_database()
