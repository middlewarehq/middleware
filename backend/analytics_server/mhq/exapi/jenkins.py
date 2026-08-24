# CLUSTOX: Jenkins REST client. Knows Jenkins' API shape and nothing about our
# models -- adaptation to RepoWorkflowRuns lives in the ETL handler.
import ipaddress
import json
import socket
from datetime import datetime
from time import monotonic
from typing import Dict, List, Optional, Tuple, Union
from urllib.parse import urlsplit

import pytz
import requests

# Connect and read timeouts. The workspace sync loop is sequential, so an
# untimed request against a hung Jenkins stalls every workspace behind it.
DEFAULT_TIMEOUT: Tuple[int, int] = (5, 30)

# Total wall-clock ceiling for a single Jenkins request. requests' read timeout
# is between bytes, not total: a Jenkins dribbling one byte every 29 seconds
# satisfies a 30s read timeout forever and holds the sequential sync loop open
# indefinitely. This is the ceiling the design doc promised.
DEFAULT_MAX_SECONDS: int = 60

# Upper bound on a single read, not a demand for that many bytes -- see _get.
RESPONSE_CHUNK_SIZE = 64 * 1024

# Fetched per build. Explicit rather than a wildcard so a Jenkins with many
# plugins does not return megabytes of action data per build.
BUILD_TREE = (
    "builds[number,result,timestamp,duration,url,building,"
    "actions[causes[userId,userName,shortDescription],"
    "lastBuiltRevision[SHA1,branch[name]]]]"
)

JOB_FIELDS = "name,fullName,url,_class"

# Folders and multibranch projects nest, and a non-recursive tree offers the
# admin the container instead of the job. Mapping a container yields a URL with
# no "builds" key, so the sync reports zero deployments forever without an
# error. Three levels covers folder/multibranch layouts without asking a large
# Jenkins for its whole tree.
JOB_TREE_DEPTH = 3

# Substrings of the _class Jenkins reports for things that hold jobs rather than
# being one. Matched loosely because the plugin class names are long and
# version-dependent, and because a container sitting exactly at JOB_TREE_DEPTH
# has no nested "jobs" key to give it away.
CONTAINER_CLASS_MARKERS = ("Folder", "MultiBranchProject")


def _build_job_tree(depth: int) -> str:
    tree = f"jobs[{JOB_FIELDS}]"
    for _ in range(max(depth - 1, 0)):
        tree = f"jobs[{JOB_FIELDS},{tree}]"
    return tree


JOB_TREE = _build_job_tree(JOB_TREE_DEPTH)


def job_path(job_full_name: str) -> str:
    """Jenkins addresses nested jobs by repeating /job/ for each segment."""
    return "/".join(f"job/{segment}" for segment in job_full_name.split("/"))


# CLUSTOX: base_url arrives from an admin through the setup form and the server
# then fetches it. The browser validated it; the server did not, so an
# authenticated admin could point the workspace at http://169.254.169.254/latest
# or any address inside our network and read the response back out of the jobs
# endpoint -- cloud instance credentials included. Everything below exists to
# stop that.
ALLOWED_SCHEMES = ("http", "https")


class JenkinsAddressNotAllowed(requests.RequestException):
    """
    Raised before any request leaves the process. A RequestException so the
    routes that already handle an unreachable Jenkins keep working, but its own
    type so they can say "this address is not allowed" rather than "Jenkins is
    unreachable" -- an admin who typed an internal hostname needs to be told
    which of the two happened.
    """


def _resolved_addresses(hostname: str, port: Optional[int]) -> List[str]:
    try:
        infos = socket.getaddrinfo(
            hostname, port or 0, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP
        )
    except socket.gaierror as e:
        # A name that does not resolve is an unreachable Jenkins, not an
        # attempt to reach somewhere it should not -- different message, and
        # the existing 502 path is the right home for it.
        raise requests.ConnectionError(
            f"Could not resolve Jenkins host {hostname}: {e}"
        )
    return [info[4][0] for info in infos]


def _is_disallowed(ip: Union[ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
    # An IPv4 address written as ::ffff:10.0.0.5 is an IPv4 address, and
    # is_private on the IPv6 form does not say so.
    mapped = getattr(ip, "ipv4_mapped", None)
    if mapped is not None:
        ip = mapped
    return (
        ip.is_private  # RFC1918, and loopback and link-local with it
        or ip.is_loopback
        or ip.is_link_local  # 169.254.0.0/16, the cloud metadata range
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def assert_url_is_allowed(url: str) -> None:
    """
    Rejects anything that is not an http(s) URL pointing at a public address.
    Called before the request rather than after, because a request to
    169.254.169.254 has already leaked whatever it was going to leak by the
    time a response comes back.
    """
    parts = urlsplit(url)
    if parts.scheme not in ALLOWED_SCHEMES:
        raise JenkinsAddressNotAllowed(
            f"Jenkins URL must start with http:// or https://, got '{url}'"
        )

    try:
        hostname, port = parts.hostname, parts.port
    except ValueError as e:
        raise JenkinsAddressNotAllowed(f"Jenkins URL '{url}' is not valid: {e}")
    if not hostname:
        raise JenkinsAddressNotAllowed(f"Jenkins URL '{url}' has no host")

    # Every address the name resolves to, not the first: a hostname an admin
    # controls can resolve to a public address and an internal one at once, and
    # which of them is connected to is not ours to predict.
    for address in _resolved_addresses(hostname, port):
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            raise JenkinsAddressNotAllowed(
                f"Jenkins host {hostname} resolved to something that is not an "
                f"IP address: {address}"
            )
        if _is_disallowed(ip):
            raise JenkinsAddressNotAllowed(
                f"Jenkins host {hostname} resolves to {address}, which is a "
                f"private, loopback or link-local address. Middleware will not "
                f"fetch internal addresses."
            )


class JenkinsResponse:
    """
    The slice of requests.Response this client uses, with the body already read
    under a wall-clock deadline. Exists so _get can enforce that deadline while
    reading, which a plain Response cannot do.
    """

    def __init__(self, status_code: int, body: bytes, url: str, location: str = None):
        self.status_code = status_code
        self._body = body
        self._url = url
        self._location = location

    def json(self):
        return json.loads(self._body or b"{}")

    def raise_for_status(self) -> None:
        # CLUSTOX: redirects are no longer followed, so a 3xx arrives here with
        # an empty body. Left to fall through it parses as {} and reports "no
        # jobs" -- a Jenkins behind a login redirect or a moved URL would look
        # like an empty one. Named instead.
        if 300 <= self.status_code < 400:
            raise requests.HTTPError(
                f"Jenkins redirected {self._url} to "
                f"'{self._location or 'an unnamed location'}'. Redirects are "
                f"not followed; check the base URL is the one Jenkins serves."
            )
        if self.status_code >= 400:
            raise requests.HTTPError(
                f"Jenkins returned HTTP {self.status_code} for {self._url}"
            )


class JenkinsApiService:
    def __init__(
        self,
        base_url: str,
        username: str,
        api_token: str,
        timeout: Tuple[int, int] = DEFAULT_TIMEOUT,
        max_seconds: int = DEFAULT_MAX_SECONDS,
    ):
        self._base_url = base_url.rstrip("/")
        self._auth = (username, api_token)
        self._timeout = timeout
        self._max_seconds = max_seconds

    def _get(self, path: str) -> JenkinsResponse:
        url = f"{self._base_url}/{path}"
        # CLUSTOX: checked per request, not once in __init__. A service object
        # outlives a DNS record, and the check is worth nothing if the address
        # it approved is not the one being fetched now.
        assert_url_is_allowed(url)
        deadline = monotonic() + self._max_seconds
        connect_timeout, read_timeout = self._timeout
        # CLUSTOX: a read timeout longer than the total ceiling can never be
        # reached without the ceiling firing first, and it is the only thing
        # standing between us and a server that stops sending entirely. Capping
        # it keeps the worst case at ceiling + one gap instead of
        # ceiling + read_timeout.
        read_timeout = min(read_timeout, self._max_seconds)
        # TLS verification is deliberately not configurable. A skip-verify
        # option is easy to add, hard to remove, and this connection carries an
        # API token.
        response = requests.get(
            url,
            auth=self._auth,
            timeout=(connect_timeout, read_timeout),
            verify=True,
            stream=True,
            # CLUSTOX: the address check above covers the URL we ask for, and a
            # followed redirect is a second URL nobody checked. A public host --
            # the admin's own, or one that answers it -- redirecting to
            # 169.254.169.254 walks straight past the check. Not following
            # means the check and the request are about the same address.
            allow_redirects=False,
        )
        body = bytearray()
        try:
            # CLUSTOX: read1(), not iter_content(). iter_content() asks
            # urllib3.stream() for a whole chunk, and on a Content-Length
            # response urllib3 blocks until it has that many bytes -- so a
            # deadline checked between chunks is not consulted until 64 KiB has
            # accumulated. Measured against a server dribbling 100 bytes every
            # 50ms, the first chunk arrived after 36 seconds with the ceiling
            # set well below that. read1() returns whatever bytes are already
            # available, so the deadline is re-checked at the pace the server
            # actually sends and the ceiling genuinely bounds the call.
            # Chunked-transfer responses happen to yield per HTTP chunk, but
            # nothing guarantees a Jenkins sends chunked.
            raw = response.raw
            while True:
                if monotonic() > deadline:
                    raise requests.exceptions.Timeout(
                        f"Jenkins request to {url} exceeded the "
                        f"{self._max_seconds}s ceiling"
                    )
                # decode_content=True so a gzipped body -- requests advertises
                # gzip on every request -- is still decoded, which reading
                # response.raw directly would otherwise skip.
                chunk = raw.read1(RESPONSE_CHUNK_SIZE, decode_content=True)
                if not chunk:
                    break
                body.extend(chunk)
        finally:
            response.close()
        return JenkinsResponse(
            response.status_code, bytes(body), url, response.headers.get("Location")
        )

    def check_pat(self) -> bool:
        response = self._get("api/json")
        return response.status_code == 200

    def get_jobs(self) -> List[Dict]:
        response = self._get(f"api/json?tree={JOB_TREE}")
        response.raise_for_status()
        return self._collect_jobs(response.json().get("jobs", []))

    @classmethod
    def _collect_jobs(cls, nodes: Optional[List[Dict]]) -> List[Dict]:
        """Flattens the nested tree down to the entries that can actually run."""
        jobs: List[Dict] = []
        for node in nodes or []:
            if not node:
                continue
            children = node.get("jobs")
            if isinstance(children, list):
                jobs.extend(cls._collect_jobs(children))
                continue
            if cls._is_container(node):
                # A container deeper than the tree we asked for. Offering it
                # would let an admin map something that reports zero
                # deployments forever, so leave it out.
                continue
            jobs.append(
                {
                    "name": node.get("name"),
                    "full_name": node.get("fullName") or node.get("name"),
                    "url": node.get("url"),
                }
            )
        return jobs

    @staticmethod
    def _is_container(node: Dict) -> bool:
        job_class = node.get("_class") or ""
        return any(marker in job_class for marker in CONTAINER_CLASS_MARKERS)

    def get_builds(self, job_full_name: str, bookmark: datetime) -> List[Dict]:
        response = self._get(f"{job_path(job_full_name)}/api/json?tree={BUILD_TREE}")
        response.raise_for_status()
        builds = response.json().get("builds", [])
        return [
            build
            for build in builds
            if self._build_time(build) and self._build_time(build) > bookmark
        ]

    @staticmethod
    def _build_time(build: Dict):
        timestamp = build.get("timestamp")
        if not timestamp:
            return None
        return datetime.fromtimestamp(timestamp / 1000, tz=pytz.UTC)
