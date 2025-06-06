from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from mhq.utils.time import dt_from_iso_time_string


@dataclass
class BitbucketRepo:
    name: str
    org_name: str
    default_branch: str
    idempotency_key: str
    slug: str
    description: str
    web_url: str
    languages: Optional[Dict] = None
    contributors: Optional[List] = None

    def __init__(self, repo: Dict):
        self.name = repo.get("name", "")
        self.org_name = repo.get("workspace", {}).get("name", "")
        self.default_branch = repo.get("mainbranch", {}).get("name", "")
        self.idempotency_key = str(repo.get("uuid", ""))
        self.slug = repo.get("slug", "")
        self.description = repo.get("description", "")
        self.web_url = repo.get("links", {}).get("html", {}).get("href", "")
        self.languages = repo.get("language")

    def __hash__(self):
        return hash(self.idempotency_key)