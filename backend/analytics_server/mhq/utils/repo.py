from typing import Dict, List, Tuple
from urllib.parse import urlparse
from mhq.service.code.integration import get_code_integration_service


def get_tuple_to_repo_url_map(
    org_id: str, repo_urls: List[str]
) -> Dict[Tuple[str, str, str], str]:
    """
    Returns:
        A mapping where the key is a tuple of (provider, org_name, repo_name) and the value is the corresponding repository URL.

    Example:
        {
            ('github', 'middlewarehq', 'middleware'): `https://github.com/middlewarehq/middleware`
        }
    """

    tuple_to_repo_url_map: Dict[Tuple[str, str, str], str] = {}
    domain_url_to_provider_map = (
        get_code_integration_service().get_domain_url_to_provider_map(org_id)
    )

    for repo_url in repo_urls:
        parsed_url = urlparse(repo_url)
        web_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        provider = domain_url_to_provider_map[web_url]

        if not provider:
            raise Exception(f"Integration {provider} is not linked.")

        path_elements = parsed_url.path.strip("/").split("/")

        if len(path_elements) != 2:
            raise Exception(f"Invalid repo URL path (need /org/repo): {repo_url}")

        org_name, repo_name = path_elements[0], path_elements[1]
        tuple_to_repo_url_map[(provider, org_name, repo_name)] = repo_url

    return tuple_to_repo_url_map
