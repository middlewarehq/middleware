from functools import wraps
from typing import Any, Dict, List
from uuid import UUID

from flask import request
from stringcase import snakecase
from voluptuous import Invalid
from werkzeug.exceptions import BadRequest
from mhq.service.code.models.org_repo import RawOrgRepo
from mhq.store.models.code import WorkflowFilter, CodeProvider

from mhq.service.workflows.workflow_filter import get_workflow_filter_processor


def queryschema(schema):
    def decorator(f):
        @wraps(f)
        def new_func(*args, **kwargs):
            try:
                query_params = request.args.to_dict()
                valid_dict = schema(dict(query_params))
                snaked_kwargs = {snakecase(k): v for k, v in valid_dict.items()}
                kwargs.update(snaked_kwargs)
            except Invalid as e:
                message = "Invalid data: %s (path %s)" % (
                    str(e.msg),
                    ".".join([str(k) for k in e.path]),
                )
                raise BadRequest(message)

            return f(*args, **kwargs)

        return new_func

    return decorator


def uuid_validator(s: str):
    UUID(s)
    return s


def boolean_validator(s: str):
    if s.lower() == "true" or s == "1":
        return True
    elif s.lower() == "false" or s == "0":
        return False
    else:
        raise ValueError("Not a boolean")


def dataschema(schema):
    def decorator(f):
        @wraps(f)
        def new_func(*args, **kwargs):
            try:
                body = request.json or {}
                valid_dict = schema(body)
                snaked_kwargs = {snakecase(k): v for k, v in valid_dict.items()}
                kwargs.update(snaked_kwargs)
            except Invalid as e:
                message = "Invalid data: %s (path %s)" % (
                    str(e.msg),
                    ".".join([str(k) for k in e.path]),
                )
                raise BadRequest(message)

            return f(*args, **kwargs)

        return new_func

    return decorator


def coerce_workflow_filter(filter_data: str) -> WorkflowFilter:
    workflow_filter_processor = get_workflow_filter_processor()
    return workflow_filter_processor.create_workflow_filter_from_json_string(
        filter_data
    )


def coerce_org_repo(repo: Dict[str, str]) -> RawOrgRepo:
    return RawOrgRepo(
        provider=CodeProvider(repo.get("provider")),
        name=repo.get("name"),
        org_name=repo.get("org"),
        slug=repo.get("slug"),
        idempotency_key=repo.get("idempotency_key"),
        default_branch=repo.get("default_branch"),
    )


def coerce_org_repos(repos: List[Dict[str, str]]) -> List[RawOrgRepo]:
    return [coerce_org_repo(repo) for repo in repos]
