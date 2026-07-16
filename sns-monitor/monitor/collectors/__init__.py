"""SNSプラットフォームごとのデータ取得（コレクター）。

各コレクターは collect() で AccountData を返す。
新しいプラットフォームを足すときは、このインターフェースに合わせて
collectors/ にファイルを1つ追加するだけでよい。
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class PostData:
    """1投稿分の現在値。"""

    post_key: str                 # プラットフォーム側の投稿ID
    posted_at: datetime           # 投稿日時（timezone付き）
    caption: str = ""
    permalink: str = ""
    media_type: str = ""
    likes: int | None = None
    comments: int | None = None
    views: int | None = None
    shares: int | None = None
    saves: int | None = None

    @property
    def engagement(self) -> int:
        """いいね・コメント・シェア・保存の合計（Noneは0扱い）。"""
        return sum(v or 0 for v in (self.likes, self.comments, self.shares, self.saves))


@dataclass
class AccountData:
    """1アカウント分の現在値。"""

    platform: str                 # "instagram" | "tiktok"
    account_key: str              # プラットフォーム側のアカウントID
    username: str = ""
    followers: int | None = None
    following: int | None = None
    media_count: int | None = None
    posts: list[PostData] = field(default_factory=list)
