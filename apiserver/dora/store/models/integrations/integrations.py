from dora.store import Base
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB

from dora.store.models.integrations.enums import UserIdentityProvider


class Integration(Base):
    __tablename__ = "Integration"

    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"), primary_key=True)
    name = Column(String, primary_key=True)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=True)
    access_token_enc_chunks = Column(ARRAY(String))
    refresh_token_enc_chunks = Column(ARRAY(String))
    provider_meta = Column(JSONB)
    scopes = Column(ARRAY(String))
    access_token_valid_till = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserIdentity(Base):
    __tablename__ = "UserIdentity"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    provider = Column(String, primary_key=True)
    token = Column(String)
    username = Column(String)
    refresh_token = Column(String)
    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = Column(JSONB)

    @property
    def avatar_url(self):
        if self.provider == UserIdentityProvider.GITHUB.value:
            return f"https://github.com/{self.username}.png"
