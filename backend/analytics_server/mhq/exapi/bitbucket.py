import requests
from typing import Optional, Dict, Any

from mhq.utils.log import LOG
from mhq.exapi.models.bitbucket import BitbucketRepo

class BitbucketApiService:
    def __init__(self, access_token: str):
        self._token = access_token
        self.base_url = "https://api.bitbucket.org/2.0"
        self.headers = {"Authorization": f"Basic {self._token}"}
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def check_pat(self) -> bool:
        """
        Checks if Personal Access Token is valid.
        
        Returns:
            bool: True if PAT is valid, False otherwise
            
        Raises:
            requests.RequestException: If the request fails
        """
        url = f"{self.base_url}/user"
        try:
            response = self.session.get(url, timeout=30)
            return response.status_code == 200
        except requests.RequestException as e:
            LOG.error(f"PAT validation failed: {e}")
            raise requests.RequestException(f"PAT validation failed: {e}")
        
    def _handle_error(self, response: requests.Response) -> None:
        """
        Handle HTTP error responses from Bitbucket API.
        
        Args:
            response: The HTTP response object
            
        Raises:
            requests.HTTPError: If response status code is not 200
        """
        if response.status_code != 200:
            try:
                error_data = response.json()
                error = error_data.get("error", "Unknown error")
                message = error_data.get("message", "No message provided")
            except ValueError:
                error = "Invalid response format"
                message = response.text or "No error details available"
            
            error_msg = f"Request failed with status {response.status_code}: {error} - {message}"
            LOG.error(error_msg)
            raise requests.HTTPError(error_msg)
    
    def get_workspace_repos(self, workspace: str, repo_slug: str) -> BitbucketRepo:
        """
        Get repository information for a specific workspace and repository.
        
        Args:
            workspace: The workspace name
            repo_slug: The repository slug
            
        Returns:
             BitbucketRepo: Repository information object
            
        Raises:
            requests.HTTPError: If the request fails
            requests.RequestException: If the request encounters an error
        """
        url = f"{self.base_url}/repositories/{workspace}/{repo_slug}"
        try:
            response = self.session.get(url, timeout=30)
            self._handle_error(response)
            repo = response.json()
            return BitbucketRepo(repo)
        except requests.RequestException as e:
            LOG.error(f"Failed to get repository {workspace}/{repo_slug}: {e}")
            raise

    def get_repo_contributors(self, workspace: str, repo_slug: str) -> Dict[str,int]:
        """
        Get all contributors for a repository with their contribution counts.
        
        Args:
            workspace: The workspace name
            repo_slug: The repository slug
            
        Returns:
            dict: Dictionary with contributor names as keys and contribution counts as values
            
        Raises:
            requests.HTTPError: If the request fails
            requests.RequestException: If the request encounters an error
        """
        url = f"{self.base_url}/repositories/{workspace}/{repo_slug}/commits"
        contributors = {}

        try:
            while url:
                response = self.session.get(url, timeout=30)
                self._handle_error(response)
                
                data = response.json()
                commits = data.get('values', [])
                
                for commit in commits:
                    author = commit.get('author', {})
                    user = author.get('user', {})
                    display_name = user.get('display_name', 'Unknown')
                    
                    if display_name in contributors:
                        contributors[display_name] += 1
                    else:
                        contributors[display_name] = 1
                
                url = data.get('next')
                
            return contributors
            
        except requests.RequestException as e:
            LOG.error(f"Failed to get contributors for {workspace}/{repo_slug}: {e}")
            raise

            

