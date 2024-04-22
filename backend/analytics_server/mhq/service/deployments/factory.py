from .models.adapter import DeploymentsAdaptorFactory
from mhq.service.deployments.models.models import DeploymentType
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.workflows import WorkflowRepoService
from .deployment_pr_mapper import DeploymentPRMapperService
from .deployments_factory_service import DeploymentsFactoryService
from .pr_deployments_service import PRDeploymentsService
from .workflow_deployments_service import WorkflowDeploymentsService


def get_deployments_factory(
    deployment_type: DeploymentType,
) -> DeploymentsFactoryService:
    if deployment_type == DeploymentType.PR_MERGE:
        return PRDeploymentsService(
            CodeRepoService(),
            DeploymentsAdaptorFactory(DeploymentType.PR_MERGE).get_adaptor(),
        )
    elif deployment_type == DeploymentType.WORKFLOW:
        return WorkflowDeploymentsService(
            WorkflowRepoService(),
            CodeRepoService(),
            DeploymentsAdaptorFactory(DeploymentType.WORKFLOW).get_adaptor(),
            DeploymentPRMapperService(),
        )
    else:
        raise ValueError(f"Unknown deployment type: {deployment_type}")
