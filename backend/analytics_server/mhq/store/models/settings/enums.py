from enum import Enum


class EntityType(Enum):
    USER = "USER"
    TEAM = "TEAM"
    ORG = "ORG"
    # CLUSTOX: the superadmin's baseline benchmark belongs to no team and no
    # workspace. entity_type is character varying with no native enum, so this
    # needs no migration.
    GLOBAL = "GLOBAL"
