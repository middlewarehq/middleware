from typing import Dict, List

from mhq.store.models.projects import OrgProject


def adapt_org_project(org_project: OrgProject) -> Dict[str, any]:
    return {
        "id": str(org_project.id),
        "org_id": str(org_project.org_id),
        "key": org_project.key,
        "name": org_project.name,
        "provider": org_project.provider,
        "is_active": org_project.is_active,
        "idempotency_key": org_project.idempotency_key,
        "created_at": org_project.created_at.isoformat(),
        "updated_at": org_project.updated_at.isoformat(),
    }


def adapt_org_projects(org_projects: List[OrgProject]) -> List[Dict[str, any]]:
    return [adapt_org_project(project) for project in org_projects]
