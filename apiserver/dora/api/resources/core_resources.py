from typing import Dict

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
