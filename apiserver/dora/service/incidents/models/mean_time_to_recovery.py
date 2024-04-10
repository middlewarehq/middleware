from dataclasses import dataclass


@dataclass
class MeanTimeToRecoveryMetrics:
    mean_time_to_recovery: float
    incident_count: int
