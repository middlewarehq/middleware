from typing import Dict
from dora.store.models.core.teams import Team

from dora.store.models import Users


def adapt_user_info(
    author: str,
    username_user_map: Dict[str, Users] = None,
):
    if not username_user_map or author not in username_user_map:
        return {"username": author, "linked_user": None}

    return {
        "username": author,
        "linked_user": {
            "id": str(username_user_map[author].id),
            "name": username_user_map[author].name,
            "email": username_user_map[author].primary_email,
            "avatar_url": username_user_map[author].avatar_url,
        },
    }


def adapt_team(team: Team):
    return {
        "id": str(team.id),
        "org_id": str(team.org_id),
        "name": team.name,
        "member_ids": [str(member_id) for member_id in team.member_ids],
        "created_at": team.created_at.isoformat(),
        "updated_at": team.updated_at.isoformat(),
    }
