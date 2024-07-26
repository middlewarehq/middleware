import json
import requests
from http import HTTPStatus
from enum import Enum
from typing import Dict, List


class AIProvider(Enum):
    OPEN_AI = "OPEN_AI"
    FIREWORKS_AI = "FIREWORKS_AI"


class LLM(Enum):
    GPT4o = "GPT4o"
    LLAMA3p1450B = "LLAMA3p1450B"
    LLAMA3p170B = "LLAMA3p170B"


class AIAnalyticsService:

    LLM_NAME_TO_MODEL_MAP = {
        LLM.GPT4o: "gpt-4o-mini",
        LLM.LLAMA3p1450B: "accounts/fireworks/models/llama-v3p1-405b-instruct",
        LLM.LLAMA3p170B: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    }

    def __init__(self, llm: LLM, access_token: str):
        self._llm = llm
        self._access_token = access_token

        if llm in [LLM.GPT4o]:
            self._ai_provider = AIProvider.OPEN_AI
        elif llm in [LLM.LLAMA3p1450B, LLM.LLAMA3p170B]:
            self._ai_provider = AIProvider.FIREWORKS_AI
        else:
            raise Exception(f"Invalid LLM :)")

        self._headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
        }

    def _get_message(self, message: str, role: str = "user"):
        return {"role": role, "content": message}

    def _open_ai_fetch_completion_open_ai(self, messages: List[Dict[str, str]]):
        payload = {
            "model": self.LLM_NAME_TO_MODEL_MAP[self._llm],
            "temperature": 0.6,
            "messages": messages,
        }
        api_url = "https://api.openai.com/v1/chat/completions"
        response = requests.post(api_url, headers=self._headers, json=payload)

        print(payload, api_url, response)
        if response.status_code != HTTPStatus.OK:
            raise Exception(response.json())

        return response.json()

    def _fireworks_ai_fetch_completions(self, messages: List[Dict[str, str]]):
        payload = {
            "model": self.LLM_NAME_TO_MODEL_MAP[self._llm],
            "temperature": 0.6,
            "max_tokens": 16384,
            "top_p": 1,
            "top_k": 40,
            "presence_penalty": 0,
            "frequency_penalty": 0,
            "messages": messages,
        }
        api_url = "https://api.fireworks.ai/inference/v1/chat/completions"
        response = requests.post(api_url, headers=self._headers, json=payload)

        if response.status_code != HTTPStatus.OK:
            raise Exception(response.json())

        return response.json()

    def _fetch_completion(self, messages: List[Dict[str, str]]):

        if self._ai_provider == AIProvider.FIREWORKS_AI:
            return self._fireworks_ai_fetch_completions(messages)["choices"][0][
                "message"
            ]["content"]

        if self._ai_provider == AIProvider.OPEN_AI:
            return self._open_ai_fetch_completion_open_ai(messages)["choices"][0][
                "message"
            ]["content"]

        raise Exception(f"Invalid AI provider {self._ai_provider}")

    def get_dora_metrics_score(
        self, four_keys_data: Dict[str, float]
    ) -> Dict[str, str]:
        """
        Calculate the DORA metrics score using input data and an LLM (Language Learning Model).

        Parameters:
        - four_keys_data (Dict[str, str]): A dictionary containing the following key-value pairs:
            - "lead_time" (float): The time taken from code committed to code successfully running in production, in seconds.
            - "mean_time_to_recovery" (float): The average time it takes to recover from a failure, in seconds.
            - "change_failure_rate" (float): The percentage of changes that result in a failure.
            - "deployment_frequency" (float): The frequency of code deployments, per unit time.

        Returns:
        - Dict[str, str]: A dictionary containing the calculated DORA metrics scores.
           - dora_metrics_score (float)
        """

        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. You will be a given a json object of the 4 keys of DORA metrics for a team. You have to assign a score to the team based on the DORA metrics document by google.\nThe input will be in the format {"lead_time": value, "mean_time_to_recovery":value, "deployment_frequency": value,  change_failure_rate: value}.  lead_time value will be time in seconds. change_failure_rate will be a float percentage,  mean_time_to_recovery will be time in seconds, deployment_frequency will be the deployment frequency in integers.\nThe response should be a number, indicating the DORA metrics score the format: Dora Performance Score is [number_between_1_to_10]. There should be no other reasoning or data in the your response.\n\nexample1: \ndata: {"lead_time": 2, "mean_time_to_recovery":3, "avg_daily_deployment_frequency":3,  change_failure_rate:20}.\nresponse: Dora Performance Score is [number_between_1_to_10]\nexample2: \ndata: {"lead_time": 4, "mean_time_to_recovery":5, "avg_monthly_deployment_frequency":89,  change_failure_rate:20}.\nresponse: Dora Performance Score is [number_between_1_to_10]. \nPrompt Start:\ndata:'

        message = self._get_message(base_prompt + json.dumps(four_keys_data))
        data = self._fetch_completion([message])
        return data

    def get_lead_time_trend_summary(self, lead_time_trends: Dict[str, float]) -> str:
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. You will be given a JSON object of weekly lead time trends for a team. You need to derive inferences from the data and analyze the trend.\n\nThe input will be in the format {\week_start_date\: { \first_commit_to_open\: value, \first_response_time\: value, \lead_time\: value, \merge_time\: value, \merge_to_deploy\: value, \pr_count\: value, \rework_time\: value }}. first_commit_to_open is the time from the first commit to when the PR was opened. first_response_time is the time from when the PR was opened to when it was first reviewed. rework_time is the time spent in resolving changes and rework in the PR. merge_time is the time taken from PR approval to PR merge. merge_to_deploy is the time taken for the PR to be deployed after it was merged. lead time is the sum of first_commit_to_open, first_response_time, merge_time, merge_to_deploy and rework_time.\n\nThe response should have two sections: "Trend Summary" and "Suggestions for Improvement". The Trend Summary should go through the changes in the trends of all the lead time and other lead time components as per the DORA Metrics Case Studies. The Suggestions for Improvement section should contain suggestions for the team to improve the lead time and its components based on the input data if any of the components is too high. Suggestions should be pointed towards the first_commit_to_open, first_response_time, lead_time, merge_time, merge_to_deploy, rework_time components from the trends data.\n\nExample:\ndata: {\n  \2024-05-27\: {\n    \first_commit_to_open\: 1,\n    \first_response_time\: 3,\n    \lead_time\: 221,\n    \merge_time\: 100,\n    \merge_to_deploy\: 0,\n    \pr_count\: 6,\n    \rework_time\: 111\n  },\n  \2024-06-03\: {\n    \first_commit_to_open\: 1,\n    \first_response_time\: 3,\n    \lead_time\: 207,\n    \merge_time\: 100,\n    \merge_to_deploy\: 0,\n    \pr_count\: 3,\n    \rework_time\: 100\n  },\n  \2024-06-10\: {\n    \first_commit_to_open\: 90,\n    \first_response_time\: 3020,\n    \lead_time\: 3690,\n    \merge_time\: 100,\n    \merge_to_deploy\: 0,\n    \pr_count\: 3,\n    \rework_time\: 500\n  }\n}\n\nexample response:\n**Trend Summary**\n- There has been an increase in lead time across the weeks.\n- The Week of 2024-06-10 witnessed a very high lead time which was due to a very high first_response_time\n- [Add More points about the trends]\n\n**Suggestions for Improvement**\n- There was an unusually high first response time in week of 2024-06-10, this means PRs are taking longer time to review. Add a tool that enables faster PR reviews or distribute ownerships of PR reviews.\n- There was a high rework time in week of 2024-06-10, this can be improved by improving on the planning process before coding to reduce rework.\n-  [Add More suggestions]\nPrompt Start:\ndata:'

        message = self._get_message(base_prompt + json.dumps(lead_time_trends))

        return self._fetch_completion([message])

    def get_deployment_frequency_trend_summary(
        self, deployment_frequency_trend: Dict[str, float]
    ) -> str:
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. You will be given a JSON object of weekly deployment frequency trends for a team. You need to derive inferences from the data and analyze the trend.\n\nThe input will be in the format {\deployment_frequency_trends\: {\week_start_date\:value}} where value is the number of deployments in that week.\n\nThe response should have two sections: "Trend Summary" and "Suggestions for Improvement". The Trend Summary should go through the changes in the deployment frequency trends. The Suggestions for Improvement section should contain suggestions for the team to improve the deployment frequency based on the input data if the count is too high or too low.\n\nExample:\ndata: {\n\deployment_frequency_trends\: {\n\2024-02-05T00:00:00+00:00\:  32,\n\2024-02-12T00:00:00+00:00\:20,\n \2024-02-19T00:00:00+00:00\:29,\n \2024-02-26T00:00:00+00:00\:13\n}\n}\n\nexample response:\n**Trend Summary**\n- The deployment frequency has varied significantly across the weeks.\n- The week of 2024-02-05 had the highest deployment frequency with 32 deployments, while the week of 2024-02-26 had the lowest with 13 deployments.\n- [Add More points about the trends]\n\n**Suggestions for Improvement**\n- The deployment frequency was low in the week of 2024-02-26. Increasing the frequency of deployments might involve automating more parts of the deployment process or improving the deployment pipeline to handle more frequent releases.\n- [Add More suggestions]\n\nPrompt Start:\ndata: '

        message = self._get_message(
            base_prompt + json.dumps(deployment_frequency_trend)
        )

        return self._fetch_completion([message])

    def get_change_failure_rate_trend_summary(
        self, change_failure_rate_trend: Dict[str, Dict[str, float]]
    ) -> str:
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. The metric we want to focus on is **Change Failure Rate (CFR)** as defined in the DORA Metrics framework. You will be given a JSON object of weekly trends for a team. You need to derive inferences from the data and analyze the trend.\n\nInput structure:\nThe input will be in JSON, in the following format:\n```\n{\n    "2022-04-21": {\n        "change_failure_rate": 25,\n        "failed_deployments": 50,\n        "total_deployments": 200\n    },\n    "2022-04-28": {\n        "change_failure_rate": 50,\n        "failed_deployments": 75,\n        "total_deployments": 150\n    }\n}\n```\n\nDefinitions:\nchange_failure_rate is the % of all changes (deployments) that can be counted as failed.\nfailed_deployments is the absolute number of changes (deployments) that failed.\ntotal_deployments is the total number of deployments that happened.\n\nExpected response structure:\nResponse should be formatted in markdown.\nThe response should have two sections: "Observations" and "Suggestions" (for improvement).\nThe Observations should go through the changes in the trends of all the properties available in the data as per the DORA Metrics Case Studies.\nThe Suggestions for Improvement section should contain suggestions for the team to improve the metric and its components based on the input data.\n\nExample response:\nA markdown formatted table of Observations and Suggestions. Observations and Suggestions content should be around 30 words for each content piece.\n| Week       | CFR | Observations          | Suggestions          |\n|------------|-----|-----------------------|----------------------|\n| 2024-01-01 | 10% | <observation content> | <suggestion content> |\n| 2024-01-08 | 20% | <observation content> | <suggestion content> |\n| 2024-01-15 | 25% | <observation content> | <suggestion content> |\n| 2024-01-22 | 20% | <observation content> | <suggestion content> |\n****General Observation:**\n<summarize the overall observations in 2 lines>\n<explain in 2 lines what it could mean>\n\n**General Suggestions:**\n<summarize the overall suggestions in 2 lines>\n\nPrompt Start:\ndata: '

        message = self._get_message(base_prompt + json.dumps(change_failure_rate_trend))

        return self._fetch_completion([message])

    def get_mean_time_to_recovery_trends_summary(
        self, mean_time_to_recovery_trends: Dict[str, Dict[str, float]]
    ) -> str:
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. The metric we want to focus on is **Mean Time to Recovery (MTTR)** as defined in the DORA Metrics framework. You will be given a JSON object of weekly trends for a team. You need to derive inferences from the data and analyze the trend.\n\nInput structure:\nThe input will be in JSON, in the following format:\n```\n{\n    "2022-04-21": {\n        "incident_count": 25,\n        "mean_time_to_recovery": 86400 // seconds\n    },\n    "2022-04-28": {\n        "incident_count": 40,\n        "mean_time_to_recovery": 129600 // seconds\n    }\n}\n```\n\nDefinitions:\nmean_time_to_recovery is the number of seconds it took to resolve incidents.\nincident_count is the absolute number of incidents that happened that week.\n\nExpected response structure:\nResponse should be formatted in markdown.\nThe response should have two sections: "Observations" and "Suggestions" (for improvement).\nThe Observations should go through the changes in the trends of all the properties available in the data as per the DORA Metrics Case Studies.\nThe Suggestions for Improvement section should contain suggestions for the team to improve the metric and its components based on the input data.\n\nExample response:\nA markdown formatted table of Observations and Suggestions. Observations and Suggestions content should be around 30 words for each content piece.\nMTTR value should be shown in days, hours, and minutes.\n| Week       | MTTR   | Observations          | Suggestions          |\n|------------|--------|-----------------------|----------------------|\n| 2022-04-21 | 1d     | <observation content> | <suggestion content> |\n| 2022-04-28 | 1d 12h | <observation content> | <suggestion content> |\n****General Observation:**\n<summarize the overall observations in 2 lines>\n<explain in 2 lines what it could mean>\n\n**General Suggestions:**\n<summarize the overall suggestions in 2 lines>\n\nPrompt Start:\ndata: '

        message = self._get_message(
            base_prompt + json.dumps(mean_time_to_recovery_trends)
        )

        return self._fetch_completion([message])

    def get_dora_trends_summary(self, dora_trends: Dict[str, Dict[str, float]]) -> str:
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. We want to focus on the correlations between the four key metrics defined in the DORA Metrics framework. You will be given a JSON object of weekly trends for a team. You need to derive inferences from the data and analyze the trend.\n\nInput structure:\nThe input will be in JSON, in the following format:\n```\n{\n    "2022-04-21": {\n        "lead_time": 284400,\n        "deployment_frequency": 15,\n        "change_failure_rate": 25,\n        "mean_time_to_recovery": 86400\n    },\n    "2022-04-28": {\n        "lead_time": 482400,\n        "deployment_frequency": 22,\n        "change_failure_rate": 17,\n        "mean_time_to_recovery": 129600\n    }\n}\n```\n\nDefinitions:\nlead_time is the number of seconds it took to deliver a change from code to deployment.\ndeployment_frequency is the number of deployments that week.\nchange_failure_rate is the percentage of deployments that resulted in incidents.\nmean_time_to_recovery is the time it took to resolve those incidents.\n\nExpected response structure:\nResponse should be formatted in markdown.\nThe response should have two sections: "Observations" and "Suggestions" (for improvement).\nThe Observations should go through the changes in the trends of all the properties available in the data as per the DORA Metrics Case Studies.\nThe Suggestions for Improvement section should contain suggestions for the team to improve the overall DORA Metrics, and its components based on the input data.\n\nExample response:\nA markdown formatted table of Observations and Suggestions. Observations and Suggestions content should be around 30 words for each content piece.\nAny time based value should be shown in days, hours, and minutes.\n| Week       | Observations          | Suggestions          |\n|------------|-----------------------|----------------------|\n| 2022-04-21 | <observation content> | <suggestion content> |\n| 2022-04-28 | <observation content> | <suggestion content> |\n**General Observation:**\n<summarize the overall observations in 2 lines>\n<explain in 2 lines what it could mean>\n\n**General Suggestions:**\n<summarize the overall suggestions in 2 lines>\n\nPrompt Start:\ndata: '
        message = self._get_message(base_prompt + json.dumps(dora_trends))

        return self._fetch_completion([message])
