
import os
import sys
import json
import time
import hmac
import hashlib
import base64
from pathlib import Path

import requests

from flask import Flask, request, jsonify
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
REPLYFLOW_WEBHOOK_SECRET = os.getenv("REPLYFLOW_WEBHOOK_SECRET")

SENDER_EMAIL = "samuelcadell1@gmail.com"
SENDER_NAME = "PDF Editor"

REPLYFLOW_EMAIL = "af3blhuuf0@replyflow.com"

RECIPIENT_EMAIL = "s.b.cadell@gmail.com"

BASE_DIR = Path(__file__).resolve().parent
PDF_DIR = BASE_DIR / "test_files"
RECEIVED_DIR = BASE_DIR / "received_emails"

PDF_DIR.mkdir(exist_ok=True)
RECEIVED_DIR.mkdir(exist_ok=True)

app = Flask(__name__)


# --------------------------------------------------
# CREATE TEST PDF
# --------------------------------------------------

def create_test_pdf(filename="test_document.pdf"):

    pdf_path = PDF_DIR / filename

    pdf = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4
    form = pdf.acroForm

    pdf.setTitle("Testdokument til underskrift")

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, height - 60, "Testdokument")

    pdf.setFont("Helvetica", 11)
    pdf.drawString(
        50, height - 100,
        "Udfyld felterne nedenfor og gem PDF'en."
    )

    # Name
    pdf.drawString(50, height - 150, "Fulde navn:")
    form.textfield(
        name="full_name",
        x=50, y=height - 185,
        width=300, height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Address
    pdf.drawString(50, height - 225, "Adresse:")
    form.textfield(
        name="address",
        x=50, y=height - 260,
        width=300, height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Email
    pdf.drawString(50, height - 300, "E-mail:")
    form.textfield(
        name="email",
        x=50, y=height - 335,
        width=300, height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Checkbox
    pdf.drawString(
        50, height - 375,
        "Jeg accepterer betingelserne:"
    )

    form.checkbox(
        name="accept_terms",
        x=50, y=height - 410,
        size=15,
        checked=False,
        buttonStyle="check",
        borderWidth=1,
        forceBorder=True
    )

    # Signature
    pdf.drawString(50, height - 460, "Underskrift:")
    pdf.line(50, height - 500, 350, height - 500)

    # Date
    pdf.drawString(50, height - 540, "Dato:")
    pdf.line(50, height - 560, 250, height - 560)

    pdf.save()

    print("Test PDF created:", pdf_path)

    return pdf_path


# --------------------------------------------------
# SEND PDF THROUGH BREVO
# --------------------------------------------------

def send_pdf_email(recipient_email, pdf_path):

    if not BREVO_API_KEY:
        raise ValueError("Missing BREVO_API_KEY")

    with open(pdf_path, "rb") as file:
        pdf_base64 = base64.b64encode(
            file.read()
        ).decode("utf-8")

    payload = {
        "sender": {
            "name": SENDER_NAME,
            "email": SENDER_EMAIL
        },

        "to": [
            {"email": recipient_email}
        ],

        # Replies go to ReplyFlow
        "replyTo": {
            "email": REPLYFLOW_EMAIL,
            "name": SENDER_NAME
        },

        "subject": "Testdokument til underskrift",

        "textContent": (
            "Hej,\n\n"
            "Du har modtaget et dokument til underskrift.\n\n"
            "Download den vedhæftede PDF, udfyld felterne "
            "og underskriv dokumentet.\n\n"
            "Svar derefter på denne e-mail med den "
            "underskrevne PDF vedhæftet.\n\n"
            "Venlig hilsen\n"
            "PDF Editor"
        ),

        "attachment": [
            {
                "name": "test_document.pdf",
                "content": pdf_base64
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

    print("\nBrevo status:", response.status_code)
    print("Brevo response:", response.text)

    response.raise_for_status()

    print("\nEmail sent successfully!")



if __name__ == "__main__":

    if len(sys.argv) > 1 and sys.argv[1] == "send":

        pdf_path = create_test_pdf()

        send_pdf_email(
            RECIPIENT_EMAIL,
            pdf_path
        )

    else:

        print("Starting PDF Editor test backend...")
        print("Webhook: /api/email-replies")

        app.run(
            host="127.0.0.1",
            port=5000,
            debug=False
        )
        
        
    # Find nye mails
    messages = service.users().messages().list(
        userId="me",
        q="has:attachment filename:pdf"
    ).execute()

    # Hent en bestemt mail
    message = service.users().messages().get(
        userId="me",
        id=message_id,
        format="full"
    ).execute()

    # Find PDF attachment i message["payload"]["parts"]

    # Hent attachment-data
    attachment = service.users().messages().attachments().get(
        userId="me",
        messageId=message_id,
        id=attachment_id
    ).execute()

    
    
    
    
