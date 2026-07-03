"""
台本生成モジュール。

天気とスケジュールのテキストを受け取り、
「有能で親しみやすいAI執事」風の読み上げ台本を生成する。

プロバイダ:
  ・template  … LLM課金なしのテンプレート生成（既定・完全無料）
  ・ollama    … ローカルLLM（無料・要インストール）
  ・anthropic … Claude API（従量課金）
  ・openai    … OpenAI API（従量課金）
"""
from __future__ import annotations

import re
import time
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
    user = USER_PROMPT_TEMPLATE.format(now=now, weather_text=weather_text, schedule_text=schedule_text)
    return system, user


# ============================================================
#  テンプレート生成（LLM不要・完全無料）
# ============================================================
def _naturalize_schedule(schedule_text: str) -> str:
    if ("登録されていません" in schedule_text) or ("取得できませんでした" in schedule_text):
        return "本日は特にご予定は入っておりません。どうぞゆっくりお過ごしください。"
    lines = [l[2:] for l in schedule_text.splitlines() if l.startswith("- ")]
    if not lines:
        return "本日は特にご予定は入っておりません。どうぞゆっくりお過ごしください。"
    parts = []
    for l in lines:
        m = re.match(r"(\d{1,2}):(\d{2})\s+(.*)", l)
        if m:
            h, mi, title = int(m.group(1)), m.group(2), m.group(3)
            ampm = "午前" if h < 12 else "午後"
            hh = h if h <= 12 else h - 12
            mm = "" if mi == "00" else f"{int(mi)}分"
            if h == 12 and mi == "00":
                ampm, hh = "", "正午"
                parts.append(f"{hh}から{title}")
            else:
                parts.append(f"{ampm}{hh}時{mm}から{title}")
        else:
            parts.append(l.replace("終日: ", "終日の"))
    return "本日のご予定ですが、" + "、".join(parts) + "が入っております。"


def _template_script(weather_text: str, schedule_text: str, now: Optional[str] = None) -> str:
    now = now or datetime.now().strftime("%H時%M分")
    nick = config.USER_NICKNAME
    sched = _naturalize_schedule(schedule_text)
    return (
        f"おはようございます、{nick}。現在の時刻は{now}です。"
        f"{weather_text}日中の気温差にお気をつけくださいね。"
        f"{sched}"
        f"水分補給を忘れずに、{nick}にとって素敵な一日になりますように。"
    )


# ============================================================
#  公開関数
# ============================================================
def generate_script(weather_text: str, schedule_text: str,
                    provider: Optional[str] = None, now: Optional[str] = None) -> str:
    provider = (provider or config.LLM_PROVIDER).lower()
    if provider == "template":
        return _template_script(weather_text, schedule_text, now)
    system, user = _build_prompts(weather_text, schedule_text, now)
    if provider == "ollama":
        return _generate_ollama(system, user)
    elif provider == "anthropic":
        return _generate_anthropic(system, user)
    elif provider == "openai":
        return _generate_openai(system, user)
    raise ValueError(f"未知の LLM_PROVIDER: {provider}")


def stream_script(weather_text: str, schedule_text: str,
                  provider: Optional[str] = None, now: Optional[str] = None):
    """台本を chunk（文字列）で逐次 yield（ダッシュボードのSSE表示用）。"""
    provider = (provider or config.LLM_PROVIDER).lower()
    if provider == "template":
        script = _template_script(weather_text, schedule_text, now)
        for ch in script:            # 1文字ずつ「タイプ」して流す
            yield ch
            time.sleep(0.025)
        return
    system, user = _build_prompts(weather_text, schedule_text, now)
    if provider == "ollama":
        yield from _stream_ollama(system, user)
    elif provider == "anthropic":
        yield from _stream_anthropic(system, user)
    elif provider == "openai":
        yield from _stream_openai(system, user)
    else:
        raise ValueError(f"未知の LLM_PROVIDER: {provider}")


# ============================================================
#  ローカルLLM: Ollama（無料）
# ============================================================
def _generate_ollama(system: str, user: str) -> str:
    import requests
    resp = requests.post(
        f"{config.OLLAMA_HOST}/api/chat",
        json={"model": config.OLLAMA_MODEL, "stream": False,
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": user}]},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"].strip()


def _stream_ollama(system: str, user: str):
    import json as _json
    import requests
    with requests.post(
        f"{config.OLLAMA_HOST}/api/chat",
        json={"model": config.OLLAMA_MODEL, "stream": True,
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": user}]},
        stream=True, timeout=120,
    ) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if not line:
                continue
            obj = _json.loads(line)
            piece = obj.get("message", {}).get("content", "")
            if piece:
                yield piece


# ============================================================
#  クラウドLLM（従量課金）
# ============================================================
def _generate_anthropic(system: str, user: str) -> str:
    from anthropic import Anthropic
    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません（.env を確認）。")
    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    resp = client.messages.create(model="claude-sonnet-5", max_tokens=600,
                                  system=system, messages=[{"role": "user", "content": user}])
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def _stream_anthropic(system: str, user: str):
    from anthropic import Anthropic
    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません（.env を確認）。")
    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    with client.messages.stream(model="claude-sonnet-5", max_tokens=600,
                                system=system, messages=[{"role": "user", "content": user}]) as stream:
        for text in stream.text_stream:
            yield text


def _generate_openai(system: str, user: str) -> str:
    from openai import OpenAI
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY が設定されていません（.env を確認）。")
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    resp = client.chat.completions.create(model="gpt-4o-mini", max_tokens=600,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
    return resp.choices[0].message.content.strip()


def _stream_openai(system: str, user: str):
    from openai import OpenAI
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY が設定されていません（.env を確認）。")
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    stream = client.chat.completions.create(model="gpt-4o-mini", max_tokens=600, stream=True,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


if __name__ == "__main__":
    demo = generate_script(
        weather_text="横浜の本日の天気は「晴れ時々くもり」、最高気温は28度、最低気温は21度です。",
        schedule_text="本日の予定:\n- 10:00 デザインレビュー\n- 13:30 打ち合わせ\n- 18:00 ジム",
        now="朝の5時",
    )
    print(demo)
