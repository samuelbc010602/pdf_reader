import os
import re
import base64
from pathlib import Path
from email.utils import parseaddr

import requests

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from tasks.utils import *

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Application secrets
SECRET_KEY = os.environ["SECRET_KEY"]

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SIGNITS_API_KEY = os.getenv("SIGNITS_API_KEY")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

# File storage
PDF_DIR = BASE_DIR / "test_files"
RECEIVED_DIR = BASE_DIR / "received_emails"

PDF_DIR.mkdir(exist_ok=True)
RECEIVED_DIR.mkdir(exist_ok=True)

# Polling configuration
SIGNITS_POLL_INTERVAL = 15
SIGNITS_MAX_WAIT_SECONDS = 30 * 60

POLL_INTERVAL = 10
MAX_WAIT_SECONDS = 30 * 60

# Flask configuration
SQLALCHEMY_DATABASE_URI = "sqlite:///app.db"
SQLALCHEMY_TRACK_MODIFICATIONS = False

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = 60 * 60 * 8

SIGNITS_BASE_URL = "https://sign.signits.dk"

SENDER_NAME = "Samuel Cadell"
SENDER_EMAIL = "samuelcadell1@gmail.com"

GOOGLE_ACCOUNT_EMAIL = "samuelcadell1@gmail.com"

BASE_DIR = Path(__file__).resolve().parent

CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"

RECEIVED_DIR = BASE_DIR / "received_emails"
SIGNED_DIR = BASE_DIR / "signed_emails"

RECEIVED_DIR.mkdir(parents=True, exist_ok=True)
SIGNED_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# GOOGLE OAUTH
# --------------------------------------------------

def get_gmail_service():

    creds = None

    if TOKEN_FILE.exists():

        creds = Credentials.from_authorized_user_file(
            str(TOKEN_FILE),
            SCOPES
        )

    if not creds:
        raise RuntimeError(
            "Gmail OAuth token not found. "
            "Authorize Gmail before starting Celery workers."
        )

    if not creds.valid:

        if creds.expired and creds.refresh_token:

            creds.refresh(Request())

            with open(TOKEN_FILE, "w") as token:
                token.write(creds.to_json())

        else:
            raise RuntimeError(
                "Gmail OAuth credentials are invalid. "
                "Reauthorize Gmail before starting workers."
            )

    service = build(
        "gmail",
        "v1",
        credentials=creds,
        cache_discovery=False
    )

    return service

# --------------------------------------------------
# SEND EMAIL THROUGH BREVO
# --------------------------------------------------

def send_pdf_for_signing(
    pdf_path,
    title,
    username,
    mail,
    sign_method,
    signer_name,
    signer_email,
    reference
):

    if not BREVO_API_KEY:
        raise RuntimeError("BREVO_API_KEY is not set.")

    pdf_bytes = read_pdf(pdf_path)

    subject = f"{title} - need signing [REF:{reference}]"

    payload = {

        "sender": {
            "name": SENDER_NAME,
            "email": SENDER_EMAIL
        },

        "to": [
            {"email": signer_email}
        ],

        "replyTo": {
            "email": SENDER_EMAIL,
            "name": SENDER_NAME
        },

        "subject": subject,

        "textContent": (
            f"Hej {signer_name},\n\n"
            "Du har modtaget et dokument til underskrift.\n\n"
            f"Dokumentreference: {reference}\n\n"
            "Download den vedhæftede PDF, underskriv dokumentet "
            "og svar derefter på denne e-mail med den "
            "underskrevne PDF vedhæftet.\n\n"
            "Venlig hilsen\n"
            "PDF Editor"
        ),

        "attachment": [
            {
                "name": f"{safe_filename(reference)}.pdf",
                "content": base64.b64encode(
                    pdf_bytes
                ).decode("utf-8")
            }
        ]
    }

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",

        headers={
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json"
        },

        json=payload,
        timeout=30
    )

    print("BREVO STATUS:", response.status_code, flush=True)
    print("BREVO RESPONSE:", response.text, flush=True)

    response.raise_for_status()

    result = response.json()

    print("BREVO MESSAGE ID:", result.get("messageId"), flush=True)

    print(
        f"Signing email accepted by Brevo for {signer_email}. "
        f"Reference: {reference}",
        flush=True
    )

    return subject


# --------------------------------------------------
# FIND PDF ATTACHMENTS
# --------------------------------------------------

def find_pdf_parts(parts):

    pdf_parts = []

    for part in parts:

        filename = part.get("filename", "")
        mime_type = part.get("mimeType", "")

        if (
            filename.lower().endswith(".pdf")
            or mime_type == "application/pdf"
        ):
            pdf_parts.append(part)

        nested_parts = part.get("parts", [])

        if nested_parts:
            pdf_parts.extend(
                find_pdf_parts(nested_parts)
            )

    return pdf_parts


# --------------------------------------------------
# DOWNLOAD GMAIL ATTACHMENT
# --------------------------------------------------

def download_pdf_attachment(
    service,
    message_id,
    attachment_part,
    reference
):

    filename = attachment_part.get(
        "filename",
        "returned_document.pdf"
    )

    body = attachment_part.get("body", {})

    attachment_id = body.get("attachmentId")

    if attachment_id:

        attachment = service.users().messages().attachments().get(
            userId="me",
            messageId=message_id,
            id=attachment_id
        ).execute()

        data = attachment.get("data")

    else:
        data = body.get("data")

    if not data:
        return None

    pdf_bytes = base64.urlsafe_b64decode(
        data + "=" * (-len(data) % 4)
    )

    if not pdf_bytes.startswith(b"%PDF-"):
        return None

    safe_reference = safe_filename(reference)
    safe_original_filename = safe_filename(
        Path(filename).name
    )

    output_path = (
        RECEIVED_DIR /
        f"received_{safe_reference}_{safe_original_filename}"
    )

    # Avoid overwriting an existing file.
    with open(output_path, "xb") as f:
        f.write(pdf_bytes)

    return output_path


# --------------------------------------------------
# CHECK GMAIL ONCE
# --------------------------------------------------

def check_for_signed_pdf(
    signer_email,
    reference
):

    service = get_gmail_service()

    query = (
        f"from:{signer_email} "
        f"to:{GOOGLE_ACCOUNT_EMAIL} "
        f"subject:{reference} "
        "has:attachment filename:pdf"
    )

    results = service.users().messages().list(
        userId="me",
        q=query,
        maxResults=20
    ).execute()

    messages = results.get("messages", [])

    for item in messages:

        message_id = item["id"]

        message = service.users().messages().get(
            userId="me",
            id=message_id,
            format="full"
        ).execute()

        # Verify sender using the actual message headers.
        headers = message.get("payload", {}).get("headers", [])

        header_map = {
            h["name"].lower(): h["value"]
            for h in headers
        }

        actual_sender = parseaddr(
            header_map.get("from", "")
        )[1].lower()

        if actual_sender != signer_email.lower():
            continue

        # Also verify that the reference appears in the subject.
        actual_subject = header_map.get("subject", "")

        if reference.lower() not in actual_subject.lower():
            continue

        payload = message.get("payload", {})
        parts = payload.get("parts", []) or [payload]

        pdf_parts = find_pdf_parts(parts)

        for pdf_part in pdf_parts:

            received_path = download_pdf_attachment(
                service,
                message_id,
                pdf_part,
                reference
            )

            if received_path:

                print(
                    f"Signed PDF received for {reference}",
                    flush=True
                )

                return str(received_path), message_id

    # No matching reply yet.
    return None, None
