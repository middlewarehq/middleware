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

    def get_dora_metrics_score(self, four_keys_data: Dict[str, float]) -> Dict[str, str]:
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
        
        base_prompt = 'SYSTEM PROMPT: You are a DORA Metrics expert. You will be a given a json object of the 4 keys of DORA metrics for a team. You have to assign a score to the team based on the DORA metrics document by google.\nThe input will be in the format {"lead_time": value, "mean_time_to_recovery":value, "deployment_frequency": value,  change_failure_rate: value}.  lead_time value will be time in seconds. change_failure_rate will be a float percentage,  mean_time_to_recovery will be time in seconds, deployment_frequency will be the deployment frequency in integers.\nThe response should be a number, indicating the DORA metrics score the format {"dora_metrics_score":  value}. There should be no other reasoning or data in the your response.\n\nexample1: \ndata: {"lead_time": 2, "mean_time_to_recovery":3, "deployment_frequency":3,  change_failure_rate:20}.\nresponse{"dora_metrics_score":  number_between_1_to_10}\nexample1: \ndata: {"lead_time": 4, "mean_time_to_recovery":5, "deployment_frequency":89,  change_failure_rate:20}.\nresponse{"dora_metrics_score":  number_between_1_to_10}\nprompt start:\n'

        message = self._get_message(base_prompt + json.dumps(four_keys_data))

        return json.loads(self._fetch_completion([message]))
