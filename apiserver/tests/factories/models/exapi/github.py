

def get_github_commit_dict(
        sha: str = "123456789098765",
        author_login: str = "author_abc",
        url: str = "https://github.com/123456789098765",
        message: str = "[abc 315] avoid mapping edit state",
        created_at: str = "2022-06-29T10:53:15Z",
):
    return {
        "sha": sha,
        "commit": {
            'committer': {'name': 'abc', 'email': 'abc@midd.com', 'date': created_at},
            'message': message,
        },
        'author': {'login': author_login, 'id': 95607047, 'node_id': 'abc', 'avatar_url': ''},
        "html_url": url,
    }
