from enum import Enum


class UserIdentityProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"

    @classmethod
    def get_enum(self, provider: str):
        for v in self.__members__.values():
            if provider == v.value:
                return v
        return None
