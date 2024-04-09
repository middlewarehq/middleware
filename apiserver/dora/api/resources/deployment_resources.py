from typing import Dict
from .core_resources import adapt_user_info
from dora.store.models.core.users import Users

from dora.service.deployments.models.models import Deployment


def adapt_deployment(
    deployment: Deployment, username_user_map: Dict[str, Users] = None
) -> Dict:
    return {
        "id": str(deployment.id),
        "deployment_type": deployment.deployment_type.value,
        "repo_id": str(deployment.repo_id),
        "entity_id": str(deployment.entity_id),
        "provider": deployment.provider,
        "event_actor": adapt_user_info(deployment.actor, username_user_map),
        "head_branch": deployment.head_branch,
        "conducted_at": deployment.conducted_at.isoformat(),
        "duration": deployment.duration,
        "status": deployment.status.value,
        "html_url": deployment.html_url,
        "meta": deployment.meta,
    }
