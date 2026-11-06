
import os
from celery import Celery

celery = Celery(
    "pdf_reader",
    broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    include=["tasks.signing_tasks"]
)

celery.conf.update(
    task_track_started=True,
    result_expires=86400,  # Keep task results for 24 hours
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Copenhagen",
    enable_utc=True,
)
