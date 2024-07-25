from flask import Blueprint
from mhq.api.request_utils import dataschema

from voluptuous import Required, Schema, Coerce, All

from mhq.service.ai.ai_analytics_service import AIAnalyticsService, LLM


app = Blueprint("dora_ai", __name__)


@app.route("/ai/dora", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("access_token"): str,
            Required("model"): All(str, Coerce(LLM)),
        }
    ),
)
def get_ai_dora_score(data: dict, access_token: str, model: LLM):

    ai_service = AIAnalyticsService(model, access_token)
    return {"dora_metrics_score": ai_service.get_dora_metrics_score(data)}


@app.route("/ai/available_models", methods={"GET"})
def get_ai_models():

    return {
        LLM.GPT4o.value: LLM.GPT4o.value,
        LLM.LLAMA3p1450B.value: LLM.LLAMA3p1450B.value,
        LLM.LLAMA3p170B.value: LLM.LLAMA3p170B.value,
    }


@app.route("/ai/lead_time_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("access_token"): str,
            Required("model"): All(str, Coerce(LLM)),
        }
    ),
)
def get_ai_dora_lead_time_trends(data: dict, access_token: str, model: LLM):

    ai_service = AIAnalyticsService(model, access_token)
    return {"lead_time_trends_summary": ai_service.get_lead_time_trend_summary(data)}


@app.route("/ai/deployment_frequency_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("access_token"): str,
            Required("model"): All(str, Coerce(LLM)),
        }
    ),
)
def get_ai_dora_deployment_frequency_trends(data: dict, access_token: str, model: LLM):

    ai_service = AIAnalyticsService(model, access_token)
    return {
        "deployment_frequency_trends_summary": ai_service.get_deployment_frequency_trend_summary(
            data
        )
    }


@app.route("/ai/change_failure_rate_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("access_token"): str,
            Required("model"): All(str, Coerce(LLM)),
        }
    ),
)
def get_ai_change_failure_rate_trends(data: dict, access_token: str, model: LLM):

    ai_service = AIAnalyticsService(model, access_token)
    return {
        "change_failure_rate_trends_summary": ai_service.get_change_failure_rate_trend_summary(
            data
        )
    }
