"""TikTok Display API (v2) コレクター。

必要な環境変数:
  TIKTOK_ACCESS_TOKEN : user.info.stats / video.list スコープ付きアクセストークン

任意（アクセストークン失効時の自動リフレッシュ用）:
  TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN

TikTokのアクセストークンは24時間で失効するため、リフレッシュ用の3変数を
設定しておくことを推奨。ローテーションされた新しいrefresh_tokenは
token_file（デフォルト: data/tiktok_token.json、gitignore済み）に保存され、
次回以降はそちらが優先される。

取得内容:
  - アカウント: フォロワー数 / フォロー数 / 動画数
  - 直近の動画: 再生数 / いいね数 / コメント数 / シェア数
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests

from . import AccountData, PostData

API_URL = "https://open.tiktokapis.com/v2"
USER_FIELDS = "open_id,display_name,follower_count,following_count,video_count"
VIDEO_FIELDS = "id,title,create_time,share_url,like_count,comment_count,view_count,share_count"


class TikTokCollector:
    platform = "tiktok"

    def __init__(self, token_file: Path | None = None, video_limit: int = 20, timeout: int = 30):
        self.token = os.environ.get("TIKTOK_ACCESS_TOKEN", "")
        self.token_file = token_file
        self.video_limit = min(video_limit, 20)  # APIの上限は20
        self.timeout = timeout

    # --- トークン管理 -----------------------------------------------------

    def _saved_refresh_token(self) -> str:
        if self.token_file and self.token_file.exists():
            try:
                return json.loads(self.token_file.read_text()).get("refresh_token", "")
            except (json.JSONDecodeError, OSError):
                pass
        return os.environ.get("TIKTOK_REFRESH_TOKEN", "")

    def _refresh_access_token(self) -> bool:
        """refresh_tokenでアクセストークンを再取得する。成功したらTrue。"""
        client_key = os.environ.get("TIKTOK_CLIENT_KEY", "")
        client_secret = os.environ.get("TIKTOK_CLIENT_SECRET", "")
        refresh_token = self._saved_refresh_token()
        if not (client_key and client_secret and refresh_token):
            return False

        res = requests.post(
            f"{API_URL}/oauth/token/",
            data={
                "client_key": client_key,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            timeout=self.timeout,
        )
        body = res.json()
        if "access_token" not in body:
            return False

        self.token = body["access_token"]
        if self.token_file and body.get("refresh_token"):
            self.token_file.parent.mkdir(parents=True, exist_ok=True)
            self.token_file.write_text(
                json.dumps({"refresh_token": body["refresh_token"]})
            )
        return True

    # --- API呼び出し -------------------------------------------------------

    def _request(self, method: str, path: str, *, retry: bool = True, **kwargs) -> dict:
        res = requests.request(
            method,
            f"{API_URL}/{path}",
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=self.timeout,
            **kwargs,
        )
        if res.status_code == 401 and retry and self._refresh_access_token():
            return self._request(method, path, retry=False, **kwargs)
        res.raise_for_status()
        return res.json()

    def collect(self) -> AccountData:
        if not self.token and not self._refresh_access_token():
            raise RuntimeError(
                "TIKTOK_ACCESS_TOKEN が未設定で、リフレッシュ用の認証情報もありません"
            )

        info = self._request("GET", "user/info/", params={"fields": USER_FIELDS})
        user = info.get("data", {}).get("user", {})

        videos = self._request(
            "POST",
            "video/list/",
            params={"fields": VIDEO_FIELDS},
            json={"max_count": self.video_limit},
        )

        posts = []
        for v in videos.get("data", {}).get("videos", []):
            posts.append(
                PostData(
                    post_key=str(v["id"]),
                    posted_at=datetime.fromtimestamp(v["create_time"], tz=timezone.utc),
                    caption=(v.get("title") or "")[:200],
                    permalink=v.get("share_url", ""),
                    media_type="VIDEO",
                    likes=v.get("like_count"),
                    comments=v.get("comment_count"),
                    views=v.get("view_count"),
                    shares=v.get("share_count"),
                )
            )

        return AccountData(
            platform=self.platform,
            account_key=user.get("open_id", "tiktok"),
            username=user.get("display_name", ""),
            followers=user.get("follower_count"),
            following=user.get("following_count"),
            media_count=user.get("video_count"),
            posts=posts,
        )
