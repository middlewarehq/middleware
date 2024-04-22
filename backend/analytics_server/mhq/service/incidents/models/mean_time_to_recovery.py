from dataclasses import dataclass
from typing import Optional, Set

from mhq.service.deployments.models.models import Deployment


@dataclass
class MeanTimeToRecoveryMetrics:
    mean_time_to_recovery: Optional[float] = None
    incident_count: int = 0


@dataclass
class ChangeFailureRateMetrics:
    failed_deployments: Set[Deployment] = None
    total_deployments: Set[Deployment] = None

    def __post_init__(self):
        self.failed_deployments = self.failed_deployments or set()
        self.total_deployments = self.total_deployments or set()

    @property
    def change_failure_rate(self):
        if not self.total_deployments:
            return 0
        return len(self.failed_deployments) / len(self.total_deployments) * 100

    @property
    def failed_deployments_count(self):
        return len(self.failed_deployments)

    @property
    def total_deployments_count(self):
        return len(self.total_deployments)
