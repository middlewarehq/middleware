from sqlalchemy import (
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB

from mhq.store import db
from mhq.store.models.integrations import UserIdentityProvider


class Integration(db.Model):
    __tablename__ = "Integration"

    org_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("Organization.id"), primary_key=True
    )
    name = db.Column(db.String, primary_key=True)
    generated_by = db.Column(
        UUID(as_uuid=True), db.ForeignKey("Users.id"), nullable=True
    )
    access_token_enc_chunks = db.Column(ARRAY(db.String))
    refresh_token_enc_chunks = db.Column(ARRAY(db.String))
    provider_meta = db.Column(JSONB)
    scopes = db.Column(ARRAY(db.String))
    access_token_valid_till = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserIdentity(db.Model):
    __tablename__ = "UserIdentity"

    user_id = db.Column(UUID(as_uuid=True), primary_key=True)
    provider = db.Column(db.String, primary_key=True)
    token = db.Column(db.String)
    username = db.Column(db.String)
    refresh_token = db.Column(db.String)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = db.Column(JSONB)

    @property
    def avatar_url(self):
        if self.provider == UserIdentityProvider.GITHUB.value:
            return f"https://github.com/{self.username}.png"
