# -*- coding: utf-8 -*-
"""Загрузка готового ролика на YouTube — СКРЫТО, с отложенной публикацией.

Почему не сразу «для всех». За один день работы в готовых роликах нашлись
пустые плашки, нечитаемый маркер, розовый налив по всему кадру и вовсе
отсутствующие обложки — и половину этого заметил человек, глядя на
готовое. Если бы ролики уходили в публикацию автоматически, они вышли бы
с этими дефектами и уже с просмотрами и следом в выдаче.

Поэтому ролик кладётся ЧЕРНОВИКОМ (privacyStatus=private) с датой выхода
(publishAt). Человек успевает посмотреть; если всё хорошо — не делает
ничего, ролик выйдет сам в назначенный час.

Доступ — те же токены, что у yt_stats, но с правом на запись. Добавление
права требует ПОВТОРНОГО входа: старый токен на чтение для загрузки не
годится.
"""
import json
import mimetypes
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
ANALYTICS = BASE / "analytics"

# Право на загрузку добавлено к прежним. Порядок не важен, но список должен
# СОВПАДАТЬ с тем, по которому выдавался токен, иначе google-auth считает
# токен негодным и молча просит войти заново.
SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
]

# YouTube: 22 = «Люди и блоги», 27 = «Образование», 24 = «Развлечения».
# Категория влияет на то, кому ролик показывают, поэтому берётся под канал.
CATEGORY = {"documentary": "27", "howto": "26", "biography": "27"}


def token_path(channel: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in channel)
    return ANALYTICS / f"upload_{safe}.json"


def _secret_file() -> Path | None:
    got = sorted(ANALYTICS.glob("client_secret*.json"))
    return got[0] if got else None


def _creds(channel: str, log=print):
    """Учётные данные С ПРАВОМ ЗАПИСИ. Отдельный файл токена: у чтения и
    записи разный набор прав, и подменять один другим нельзя."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    tok = token_path(channel)
    creds = None
    if tok.exists():
        creds = Credentials.from_authorized_user_file(str(tok), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        tok.write_text(creds.to_json(), encoding="utf-8")
        return creds
    if creds and creds.valid:
        return creds
    secret = _secret_file()
    if secret is None:
        raise RuntimeError(f"Нет client_secret*.json в {ANALYTICS}")
    log(f"[Загрузка] Вход для «{channel}» — нужно право на загрузку. "
        "Выбери аккаунт ЭТОГО канала и разреши. Это один раз.")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
    creds = flow.run_local_server(port=0)
    ANALYTICS.mkdir(parents=True, exist_ok=True)
    tok.write_text(creds.to_json(), encoding="utf-8")
    log(f"[Загрузка] Право на загрузку для «{channel}» получено.")
    return creds


def parse_seo(path: Path) -> dict:
    """Заголовок, описание, теги и главы из seo.txt.

    Формат файла человеческий, а не машинный: TITLES / DESCRIPTION / TAGS /
    CHAPTERS с текстом между. Берём ПЕРВЫЙ заголовок из списка — остальные
    заготовлены для A/B, и выбирать за человека мы не будем.
    """
    txt = path.read_text(encoding="utf-8")
    out = {"title": "", "description": "", "tags": [], "chapters": ""}
    блок, куски = None, {"TITLES": [], "DESCRIPTION": [], "TAGS": [],
                         "CHAPTERS": []}
    for line in txt.splitlines():
        s = line.strip()
        ключ = s.rstrip(":").upper()
        if ключ in куски:
            блок = ключ
            continue
        if блок:
            куски[блок].append(line)
    титры = [l.strip() for l in куски["TITLES"] if l.strip()]
    if титры:
        # «1. Заголовок» -> «Заголовок»
        out["title"] = титры[0].split(". ", 1)[-1].strip()[:100]
    out["description"] = "\n".join(куски["DESCRIPTION"]).strip()
    out["chapters"] = "\n".join(l for l in куски["CHAPTERS"] if l.strip())
    теги = " ".join(куски["TAGS"]).strip()
    out["tags"] = [t.strip() for t in теги.split(",") if t.strip()][:30]
    return out


def upload(video: Path, channel: str, seo: dict, publish_at: str = "",
           thumbnail: Path | None = None, log=print) -> str:
    """Залить ролик СКРЫТЫМ. publish_at — ISO 8601 UTC («2026-08-09T14:00:00Z»),
    пусто — останется черновиком без даты. Возвращает id ролика.
    """
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    video = Path(video)
    if not video.exists():
        raise FileNotFoundError(f"Нет файла: {video}")
    yt = build("youtube", "v3", credentials=_creds(channel, log),
               cache_discovery=False)

    # Главы уходят в ОПИСАНИЕ: отдельного поля для них у YouTube нет, он
    # разбирает тайм-коды из текста. Первая метка обязана быть 0:00, иначе
    # главы не появятся вовсе.
    описание = seo.get("description", "")
    if seo.get("chapters"):
        описание = (описание + "\n\n" + seo["chapters"]).strip()

    body = {
        "snippet": {
            "title": seo.get("title") or video.stem,
            "description": описание[:5000],
            "tags": seo.get("tags", [])[:30],
            "categoryId": seo.get("category", "27"),
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False,
            # Синтезированная озвучка и часть кадров созданы ИИ. Отметку
            # «изменённый контент» YouTube просит ставить самому автору в
            # Studio — через API это поле не выставляется, поэтому о нём
            # напоминаем в журнале, а не делаем вид, что закрыли вопрос.
        },
    }
    if publish_at:
        body["status"]["publishAt"] = publish_at

    media = MediaFileUpload(str(video), chunksize=8 * 1024 * 1024,
                            resumable=True, mimetype="video/mp4")
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    ответ, было = None, -1
    while ответ is None:
        статус, ответ = req.next_chunk()
        if статус:
            процент = int(статус.progress() * 100)
            if процент >= было + 10:      # не засоряем журнал каждым куском
                было = процент
                log(f"[Загрузка] {video.name}: {процент}%")
    vid = ответ["id"]
    log(f"[Загрузка] Готово: youtube.com/watch?v={vid} — СКРЫТО"
        + (f", выйдет {publish_at}" if publish_at else ", без даты выхода"))

    if thumbnail and Path(thumbnail).exists():
        try:
            yt.thumbnails().set(
                videoId=vid,
                media_body=MediaFileUpload(str(thumbnail))).execute()
            log(f"[Загрузка] Обложка поставлена: {Path(thumbnail).name}")
        except Exception as e:
            log(f"[Загрузка] Обложку поставить не вышло ({e}) — "
                "поставь вручную в Studio", "warn")

    log("[Загрузка] НЕ ЗАБУДЬ в Studio отметить «Altered or synthetic "
        "content»: озвучка синтезирована, часть кадров создана ИИ. "
        "Через API это поле не выставляется.")
    return vid
