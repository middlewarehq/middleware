# CLUSTOX: Jenkins needs a base URL and username alongside its API token.
# The token is a secret and lives encrypted in access_token_enc_chunks; these
# two are not, and follow the existing provider_meta precedent used for
# GitHub's custom domain.
from typing import List, Optional, Tuple

from mhq.store.models import Integration, UserIdentityProvider
from mhq.store.repos.core import CoreRepoService


def get_jenkins_config(org_id: str) -> Tuple[Optional[str], Optional[str]]:
    core_repo_service = CoreRepoService()
    integrations: List[Integration] = core_repo_service.get_org_integrations_for_names(
        org_id, [UserIdentityProvider.JENKINS.value]
    )
    if not integrations or not integrations[0].provider_meta:
        return None, None

    meta = integrations[0].provider_meta
    return meta.get("base_url"), meta.get("username")
