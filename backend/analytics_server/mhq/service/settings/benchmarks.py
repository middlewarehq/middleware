# CLUSTOX: benchmark resolution and validation.
#
# Resolution lives in the backend rather than the browser for three reasons:
# every consumer would otherwise reimplement the fallback and eventually
# disagree; the response can report WHICH benchmark applied, so an admin who
# thinks they set a target can see that they did not; and a fifth metric later
# is one more key here rather than one more reimplementation.
from typing import Dict, List, Optional

from werkzeug.exceptions import BadRequest

from mhq.service.settings.models import BenchmarkSetting

# The global baseline belongs to no team and no workspace, but Settings.
# entity_id is NOT NULL. A fixed sentinel is the documented cost of reusing
# that table instead of adding one.
GLOBAL_BENCHMARK_ENTITY_ID = "00000000-0000-4000-8000-000000000001"

BENCHMARK_METRICS: List[str] = [
    "lead_time",
    "deployment_frequency",
    "change_failure_rate",
    "mean_time_to_recovery",
]

# Percent, so it has an upper bound the others do not.
_BOUNDED_METRICS = {"change_failure_rate": 100}


def resolve_benchmarks(
    team_setting: Optional[BenchmarkSetting],
    global_setting: Optional[BenchmarkSetting],
) -> Dict[str, Dict]:
    resolved = {}

    for metric in BENCHMARK_METRICS:
        team_value = getattr(team_setting, metric, None) if team_setting else None
        global_value = getattr(global_setting, metric, None) if global_setting else None

        # `is not None` rather than truthiness: 0 is a deliberate target.
        if team_value is not None:
            resolved[metric] = {"target": team_value, "source": "team"}
        elif global_value is not None:
            resolved[metric] = {"target": global_value, "source": "global"}
        else:
            resolved[metric] = {"target": None, "source": None}

    return resolved


def validate_benchmark_payload(data: Dict) -> Dict:
    unknown = set(data.keys()) - set(BENCHMARK_METRICS)
    if unknown:
        raise BadRequest(f"Unknown benchmark metrics: {', '.join(sorted(unknown))}")

    cleaned = {}
    for metric, value in data.items():
        if value is None:
            continue

        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise BadRequest(f"{metric} must be a number")

        if value < 0:
            raise BadRequest(f"{metric} must not be negative")

        upper = _BOUNDED_METRICS.get(metric)
        if upper is not None and value > upper:
            raise BadRequest(f"{metric} must be between 0 and {upper}")

        cleaned[metric] = value

    return cleaned
