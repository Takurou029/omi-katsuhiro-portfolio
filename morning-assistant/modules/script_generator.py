"""
台本生成モジュール（LLM: Anthropic Claude または OpenAI）。

天気とスケジュールのテキストを受け取り、
「有能で親しみやすいAI執事」風の読み上げ台本を生成する。
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import config

SYSTEM_PROMPT = """あなたは有能で気配りのできるAI執事です。
主人のために、朝の目覚めに寄り添う短い音声メッセージの台本を作成します。
- 親しみやすさと丁寧さを兼ね備えたトーンで話してください。
- 冒頭は必ず「おはようございます、{nickname}。」で始めてください。
- 現在の時刻に触れ、続けて本日の天気（天気・最高気温・最低気温）を自然に伝えてください。
- そのあと本日の予定を、聞いて分かりやすいように読み上げてください。予定が無い日は、ゆったり過ごせる旨を添えてください。
- 最後に、その日を前向きに始められる一言を添えてください。
- 音声で読み上げるため、箇条書きや記号は使わず、話し言葉の自然な文章にしてください。
- 全体で30秒〜1分程度（およそ200〜350文字）に収めてください。"""

USER_PROMPT_TEMPLATE = """以下の情報をもとに、本日の朝のメッセージ台本を作成してください。

現在時刻: {now}

【天気情報】
{weather_text}

【スケジュール】
{schedule_text}
"""


def _build_prompts(weather_text: str, schedule_text: str, now: Optional[str] = None):
    now = now or datetime.now().strftime("%H時%M分")
    system = SYSTEM_PROMPT.format(nickname=config.USER_NICKNAME)
    user = USER_PROMPT_TEMPLATE.format(
        now=now, weather_text=weather_text, schedule_text=schedule_text
    )
    return system, user


def generate_script(
    weather_text: str,
    schedule_text: str,
    provider: Optional[str] = None,
    now: Optional[str] = None,
) -> str:
    """天気・予定テキストから読み上げ台本を生成して返す。"""
    provider = (provider or config.LLM_PROVIDER).lower()
    system, user = _build_prompts(weather_text, schedule_text, now)

    if provider == "anthropic":
        return _generate_anthropic(system, user)
    elif provider == "openai":
        return _generate_openai(system, user)
    else:
        raise ValueError(f"未知の LLM_PROVIDER: {provider}（'anthropic' か 'openai'）")


def _generate_anthropic(system: str, user: str) -> str:
    from anthropic import Anthropic

    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません（.env を確認）。")
    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in resp.content if block.type == "text").strip()


def _generate_openai(system: str, user: str) -> str:
    from openai import OpenAI

    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY が設定されていません（.env を確認）。")
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=600,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content.strip()


if __name__ == "__main__":
    # 単体動作確認（LLM API を実際に呼びます）
    demo = generate_script(
        weather_text="横浜の本日の天気は「晴れ」、最高気温は28度、最低気温は20度です。",
        schedule_text="本日の予定:\n- 10:00 デザインレビュー\n- 15:00 打ち合わせ",
        now="朝の5時",
    )
    print(demo)
