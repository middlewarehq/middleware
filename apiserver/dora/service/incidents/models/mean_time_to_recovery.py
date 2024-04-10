from dataclasses import dataclass
from typing import Optional


@dataclass
class MeanTimeToRecoveryMetrics:
    mean_time_to_recovery: Optional[float] = None
    incident_count: int = 0
