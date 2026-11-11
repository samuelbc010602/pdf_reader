
from contextlib import closing

from config import SIGNITS_API_KEY, SIGNITS_BASE_URL
from celery_app import celery
import re

def read_pdf(pdf_path):

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF file.")

    return pdf_bytes


def safe_filename(value):

    return re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        str(value)
    )