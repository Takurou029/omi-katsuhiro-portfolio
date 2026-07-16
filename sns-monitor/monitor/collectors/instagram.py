"""Instagram Graph API コレクター。

必要な環境変数:
  IG_ACCESS_TOKEN : Instagramビジネスアカウントに紐づく長期アクセストークン
  IG_USER_ID      : InstagramビジネスアカウントのユーザーID（数字）

任意の環境変数:
  IG_COMPETITORS : 競合として監視するInstagramユーザー名（カンマ区切り）
                   例: "mon_guchi,mosseri"
                   business_discovery APIで自分のトークンのまま取得できる
                   （相手はビジネス/クリエイターアカウントである必要あり）

取得内容:
  - アカウント: フォロワー数 / フォロー数 / 投稿数
  - 直近の投稿: いいね数 / コメント数
"""

import os
from datetime import datetime

import requests

from . import AccountData, PostData

GRAPH_URL = "https://graph.facebook.com/v21.0"
MEDIA_FIELDS = "id,caption,timestamp,permalink,media_type,like_count,comments_count"
BD_MEDIA_FIELDS = "id,caption,timestamp,permalink,media_type,like_count,comments_count"


def _parse_media(items: list[dict]) -> list[PostData]:
    posts = []
    for m in items:
        posts.append(
            PostData(
                post_key=m["id"],
                posted_at=datetime.fromisoformat(
                    m["timestamp"].replace("+0000", "+00:00")
                ),
                caption=(m.get("caption") or "")[:200],
                permalink=m.get("permalink", ""),
                media_type=m.get("media_type", ""),
                likes=m.get("like_count"),
                comments=m.get("comments_count"),
            )
        )
    return posts


class InstagramCollector:
    platform = "instagram"

    def __init__(self, media_limit: int = 50, timeout: int = 30):
        self.token = os.environ["IG_ACCESS_TOKEN"]
        self.user_id = os.environ["IG_USER_ID"]
        self.media_limit = media_limit
        self.timeout = timeout

    def _get(self, path: str, **params) -> dict:
        params["access_token"] = self.token
        res = requests.get(f"{GRAPH_URL}/{path}", params=params, timeout=self.timeout)
        res.raise_for_status()
        return res.json()

    def collect(self) -> AccountData:
        info = self._get(
            self.user_id,
            fields="username,followers_count,follows_count,media_count",
        )
        media = self._get(
            f"{self.user_id}/media", fields=MEDIA_FIELDS, limit=self.media_limit
        )
        posts = _parse_media(media.get("data", []))

        return AccountData(
            platform=self.platform,
            account_key=self.user_id,
            username=info.get("username", ""),
            followers=info.get("followers_count"),
            following=info.get("follows_count"),
            media_count=info.get("media_count"),
            posts=posts,
        )

    def collect_competitor(self, username: str) -> AccountData:
        """business_discovery APIで競合アカウントの公開データを取得する。"""
        fields = (
            f"business_discovery.username({username})"
            f"{{username,followers_count,media_count,"
            f"media.limit(25){{{BD_MEDIA_FIELDS}}}}}"
        )
        res = self._get(self.user_id, fields=fields)
        bd = res["business_discovery"]

        return AccountData(
            platform="instagram_rival",
            account_key=username.lower(),
            username=bd.get("username", username),
            followers=bd.get("followers_count"),
            media_count=bd.get("media_count"),
            posts=_parse_media(bd.get("media", {}).get("data", [])),
        )
