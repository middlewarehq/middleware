from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB

from dora.store import db
from dora.store.models.integrations import UserIdentityProvider


class Integration(db.Model):
    __tablename__ = "Integration"

    org_id = db.Column(
        UUID(as_uuid=True), ForeignKey("Organization.id"), primary_key=True
    )
    name = db.Column(String, primary_key=True)
    generated_by = db.Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=True)
    access_token_enc_chunks = db.Column(ARRAY(String))
    refresh_token_enc_chunks = db.Column(ARRAY(String))
    provider_meta = db.Column(JSONB)
    scopes = db.Column(ARRAY(String))
    access_token_valid_till = db.Column(DateTime(timezone=True))
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserIdentity(db.Model):
    __tablename__ = "UserIdentity"

    user_id = db.Column(UUID(as_uuid=True), primary_key=True)
    provider = db.Column(String, primary_key=True)
    token = db.Column(String)
    username = db.Column(String)
    refresh_token = db.Column(String)
    org_id = db.Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = db.Column(JSONB)

    @property
    def avatar_url(self):
        if self.provider == UserIdentityProvider.GITHUB.value:
            return f"https://github.com/{self.username}.png"
