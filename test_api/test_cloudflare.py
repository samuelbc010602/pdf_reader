import os
import sys
import re
import time
import base64
import secrets
import hmac
import threading
from pathlib import Path
from email import policy
from email.parser import BytesParser
from email.header import decode_header, make_header
from email.utils import parseaddr

import requests
from flask import Flask, request, jsonify
from werkzeug.serving import make_server
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SIGNITS_API_KEY = os.getenv("SIGNITS_API_KEY")
SIGNITS_BASE_URL = "https://sign.signits.dk"

SIGNER_NAME = "Samuel Cadell"
# This can be ANY valid email address: Gmail, Outlook, iCloud, a company mailbox, etc.
# It is the address the document is sent to and the expected reply sender.
SIGNER_EMAIL = os.getenv("SIGNER_EMAIL", "samuelcadell1@gmail.com")

SENDER_NAME = "Hans Jensen"
# Must be a sender identity verified in Brevo.
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "samuelcadell1@gmail.com")

SIGNITS_POLL_INTERVAL = 15
SIGNITS_MAX_WAIT_SECONDS = 30 * 60

# Cloudflare Email Routing address receiving replies.
CLOUDFLARE_EMAIL_ADDRESS = os.getenv("CLOUDFLARE_EMAIL_ADDRESS", "")
# Must match the WEBHOOK_SECRET configured on the Cloudflare Worker.
CLOUDFLARE_WEBHOOK_SECRET = os.getenv("CLOUDFLARE_WEBHOOK_SECRET")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "8788"))

BASE_DIR = Path(__file__).resolve().parent
PDF_DIR = BASE_DIR / "test_files"
RECEIVED_DIR = BASE_DIR / "received_emails"
PDF_DIR.mkdir(parents=True, exist_ok=True)
RECEIVED_DIR.mkdir(parents=True, exist_ok=True)

POLL_INTERVAL = 10
MAX_WAIT_SECONDS = 30 * 60


def download_signits_pdf(contract_id, run_id):

    url = f"{SIGNITS_BASE_URL}/api/v1/contracts/{contract_id}/pdf"

    headers = {
        "Authorization": f"Bearer {SIGNITS_API_KEY}"
    }

    print("\nDownloading signed PDF from SIGNITS...")

    response = requests.get(
        url,
        headers=headers,
        timeout=60
    )

    response.raise_for_status()

    pdf_bytes = response.content

    # Validate that the response contains a PDF
    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError(
            "SIGNITS response does not contain a valid PDF."
        )

    # Ensure output directory exists
    RECEIVED_DIR.mkdir(parents=True, exist_ok=True)

    output_path = RECEIVED_DIR / f"mitid_signed_{run_id}.pdf"

    # Save signed PDF
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print("\nSigned PDF successfully downloaded.")
    print("Saved to:", output_path)
    print("File size:", len(pdf_bytes), "bytes")

    return output_path

def send_to_signits(pdf_path, run_id):

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError("The received file is not a valid PDF.")

    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    url = f"{SIGNITS_BASE_URL}/api/v1/contracts"

    headers = {
        "Authorization": f"Bearer {SIGNITS_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "title": f"Dokument til MitID-signering [{run_id}]",
        "pdf_base64": pdf_base64,
        "sign_method": "eid",
        "send_email": True,
        "signers": [
            {
                "name": SIGNER_NAME,
                "email": SIGNER_EMAIL,
                "order": 1
            }
        ]
    }

    print("\nSending PDF to SIGNITS...")

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=60
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("ok"):
        raise RuntimeError(f"SIGNITS contract creation failed: {result}")

    contract_id = result["contract"]["id"]

    print("SIGNITS contract created.")
    print("Contract ID:", contract_id)
    print("Status:", result["contract"].get("status"))

    return contract_id

def wait_for_signits_signature(contract_id, run_id):

    url = f"{SIGNITS_BASE_URL}/api/v1/contracts/{contract_id}"

    headers = {
        "Authorization": f"Bearer {SIGNITS_API_KEY}"
    }

    start_time = time.time()

    print("\nWaiting for MitID signature...")

    while time.time() - start_time < SIGNITS_MAX_WAIT_SECONDS:

        response = requests.get(
            url,
            headers=headers,
            timeout=30
        )

        response.raise_for_status()

        result = response.json()
        contract = result["contract"]

        status = contract.get("status")

        print("Current SIGNITS status:", status)

        if status == "signed" and contract.get("signed_pdf_ready"):

            print("\nDocument successfully signed.")

            return download_signits_pdf(
                contract_id,
                run_id
            )

        if status in ("declined", "cancelled"):

            print("Signing was declined or cancelled.")

            return None

        time.sleep(SIGNITS_POLL_INTERVAL)

    print("Timed out waiting for MitID signature.")

    return None

def create_test_pdf(run_id):

    filename = f"test_document_{run_id}.pdf"
    pdf_path = PDF_DIR / filename

    pdf = canvas.Canvas(
        str(pdf_path),
        pagesize=A4
    )

    width, height = A4
    form = pdf.acroForm

    pdf.setTitle("Testdokument til underskrift")

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, height - 60, "Testdokument")

    pdf.setFont("Helvetica", 11)

    pdf.drawString(
        50,
        height - 100,
        f"Reference: {run_id}"
    )

    pdf.drawString(
        50,
        height - 125,
        "Udfyld felterne nedenfor og gem PDF'en."
    )

    # Name
    pdf.drawString(50, height - 170, "Fulde navn:")

    form.textfield(
        name="full_name",
        x=50,
        y=height - 205,
        width=300,
        height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Address
    pdf.drawString(50, height - 245, "Adresse:")

    form.textfield(
        name="address",
        x=50,
        y=height - 280,
        width=300,
        height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Email
    pdf.drawString(50, height - 320, "E-mail:")

    form.textfield(
        name="email",
        x=50,
        y=height - 355,
        width=300,
        height=25,
        borderStyle="inset",
        forceBorder=True
    )

    # Checkbox
    pdf.drawString(
        50,
        height - 395,
        "Jeg accepterer betingelserne:"
    )

    form.checkbox(
        name="accept_terms",
        x=50,
        y=height - 430,
        size=15,
        checked=False,
        buttonStyle="check",
        borderWidth=1,
        forceBorder=True
    )

    # Signature
    pdf.drawString(50, height - 480, "Underskrift:")
    pdf.line(50, height - 520, 350, height - 520)

    # Date
    pdf.drawString(50, height - 560, "Dato:")
    pdf.line(50, height - 580, 250, height - 580)

    pdf.save()

    print("\nTest PDF created:", pdf_path)

    return pdf_path


# --------------------------------------------------
# SEND PDF THROUGH BREVO
# --------------------------------------------------

def send_pdf_email(recipient_email, pdf_path, run_id):

    if not BREVO_API_KEY:
        raise ValueError("Missing BREVO_API_KEY")

    with open(pdf_path, "rb") as file:
        pdf_base64 = base64.b64encode(
            file.read()
        ).decode("utf-8")

    subject = f"Testdokument til underskrift [{run_id}]"

    payload = {

        "sender": {
            "name": SENDER_NAME,
            "email": SENDER_EMAIL
        },

        "to": [
            {"email": recipient_email}
        ],

        # Replies go to the Cloudflare-managed inbound address.
        "replyTo": {
            "email": CLOUDFLARE_EMAIL_ADDRESS,
            "name": SENDER_NAME
        },

        "subject": subject,

        "textContent": (
            "Hej,\n\n"
            "Du har modtaget et dokument til underskrift.\n\n"
            f"Dokumentreference: {run_id}\n\n"
            "Download den vedhæftede PDF, udfyld felterne "
            "og underskriv dokumentet.\n\n"
            "Svar derefter på denne e-mail med den "
            "underskrevne PDF vedhæftet.\n\n"
            "Venlig hilsen\n"
            "PDF Editor"
        ),

        "attachment": [
            {
                "name": pdf_path.name,
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
    print("Reference:", run_id)

    return subject


# --------------------------------------------------
# CLOUDFLARE INBOUND EMAIL WEBHOOK
# --------------------------------------------------

webhook_app = Flask(__name__)


def decode_mime_header(value):
    if not value:
        return ""
    try:
        return str(make_header(decode_header(str(value))))
    except Exception:
        return str(value)


def extract_run_id(subject):
    """Extract the unique reference even from subjects prefixed with Re:/Fwd:."""
    match = re.search(r"\[(PDFTEST-[A-F0-9]+)\]", subject or "", re.IGNORECASE)
    return match.group(1).upper() if match else None


@webhook_app.post("/email-inbound")
def receive_cloudflare_email():
    """Receive the complete raw RFC 5322/MIME email from the Cloudflare Worker."""
    if not CLOUDFLARE_WEBHOOK_SECRET:
        return jsonify({"error": "Webhook secret is not configured."}), 500

    supplied_secret = request.headers.get("X-Webhook-Secret", "")
    if not hmac.compare_digest(supplied_secret, CLOUDFLARE_WEBHOOK_SECRET):
        return jsonify({"error": "Unauthorized."}), 401

    raw_email = request.get_data(cache=False)
    if not raw_email:
        return jsonify({"error": "Empty email payload."}), 400

    if len(raw_email) > 25 * 1024 * 1024:
        return jsonify({"error": "Email exceeds the 25 MiB inbound limit."}), 413

    try:
        message = BytesParser(policy=policy.default).parsebytes(raw_email)
    except Exception as exc:
        print("Could not parse inbound MIME email:", exc)
        return jsonify({"error": "Invalid MIME email."}), 400

    # Use the actual message From header. This check is independent of the
    # sender's email provider; SIGNER_EMAIL may be Gmail, Outlook, iCloud, etc.
    sender = parseaddr(str(message.get("From", "")))[1].strip().lower()
    subject = decode_mime_header(message.get("Subject", ""))
    run_id = extract_run_id(subject)

    if sender != SIGNER_EMAIL.strip().lower():
        print(f"Ignoring reply from unexpected address: {sender}")
        return jsonify({"status": "ignored", "reason": "unexpected sender"}), 202

    if not run_id:
        print(f"Ignoring email without a document reference. Subject: {subject}")
        return jsonify({"status": "ignored", "reason": "missing reference"}), 202

    saved_files = []
    for part in message.walk():
        if part.is_multipart():
            continue

        filename = part.get_filename() or "returned_document.pdf"
        content_type = part.get_content_type().lower()
        if not (filename.lower().endswith(".pdf") or content_type == "application/pdf"):
            continue

        pdf_bytes = part.get_payload(decode=True)
        if not pdf_bytes or not pdf_bytes.startswith(b"%PDF-"):
            print("Skipping non-PDF attachment:", filename)
            continue

        # Do not allow untrusted attachment filenames to become filesystem paths.
        safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(filename).name)
        if not safe_filename.lower().endswith(".pdf"):
            safe_filename += ".pdf"
        output_path = RECEIVED_DIR / f"returned_{run_id}_{safe_filename}"
        output_path.write_bytes(pdf_bytes)
        saved_files.append(str(output_path))

        print("\nPDF RECEIVED SUCCESSFULLY!")
        print("From:", sender)
        print("Subject:", subject)
        print("Original filename:", filename)
        print("Saved to:", output_path)
        print("Size:", len(pdf_bytes), "bytes")

    if not saved_files:
        print(f"Email for {run_id} received, but no valid PDF attachment was found.")
        return jsonify({"status": "received", "pdf_attachments": 0}), 202

    return jsonify({"status": "ok", "saved": saved_files}), 200


class WebhookServer:
    """Threaded local HTTP server for the Cloudflare Worker webhook."""

    def __init__(self, host="127.0.0.1", port=WEBHOOK_PORT):
        self.server = make_server(host, port, webhook_app, threaded=True)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def start(self):
        self.thread.start()
        print(f"\nWebhook listening on http://127.0.0.1:{WEBHOOK_PORT}/email-inbound")

    def stop(self):
        self.server.shutdown()
        self.thread.join(timeout=5)


# --------------------------------------------------
# WAIT FOR EMAIL REPLY
# --------------------------------------------------

def wait_for_signed_pdf(run_id):
    print("\nWaiting for the recipient's reply through Cloudflare...")
    print("Document reference:", run_id)
    start_time = time.time()

    while time.time() - start_time < MAX_WAIT_SECONDS:
        matching_files = sorted(RECEIVED_DIR.glob(f"returned_{run_id}_*.pdf"))
        for output_path in matching_files:
            try:
                pdf_bytes = output_path.read_bytes()
            except OSError:
                continue
            if pdf_bytes.startswith(b"%PDF-"):
                print("\nPDF reply found:", output_path)
                return output_path

        elapsed = int(time.time() - start_time)
        print(f"No PDF reply yet. Waiting... ({elapsed}s elapsed)")
        time.sleep(POLL_INTERVAL)

    print("\nTimed out waiting for PDF reply.")
    return None


def run_pipeline_test():

    print("\n====================================")
    print(" PDF EDITOR - FULL PIPELINE TEST")
    print("====================================")

    if not BREVO_API_KEY:
        raise RuntimeError("BREVO_API_KEY is not set.")
    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")
    if not CLOUDFLARE_WEBHOOK_SECRET:
        raise RuntimeError("CLOUDFLARE_WEBHOOK_SECRET is not set.")
    if not CLOUDFLARE_EMAIL_ADDRESS or "@" not in CLOUDFLARE_EMAIL_ADDRESS:
        raise RuntimeError("Set CLOUDFLARE_EMAIL_ADDRESS to your real Cloudflare receiving address.")

    # 128-bit random reference makes guessing another active document reference
    # substantially harder than the old 32-bit reference.
    run_id = "PDFTEST-" + secrets.token_hex(16).upper()

    webhook_server = WebhookServer()
    webhook_server.start()

    try:
        # 1. Generate PDF
        pdf_path = create_test_pdf(run_id)

        # 2. Send the PDF with Brevo. Replies go to Cloudflare Email Routing.
        send_pdf_email(SIGNER_EMAIL, pdf_path, run_id)

        # 3. Wait for Cloudflare to deliver the raw reply email to this script.
        received_pdf = wait_for_signed_pdf(run_id)

        if not received_pdf:
            print("\nPipeline did not receive a PDF reply.")
            return

        print("\n====================================")
        print(" EMAIL PIPELINE COMPLETED")
        print("====================================")
        print("Original PDF:", pdf_path)
        print("Returned PDF:", received_pdf)

        # 4. Send the returned PDF to SIGNITS
        contract_id = send_to_signits(received_pdf, run_id)

        # 5. Wait for the MitID signature
        signed_pdf = wait_for_signits_signature(contract_id, run_id)

        if signed_pdf:
            print("\n====================================")
            print(" COMPLETE PIPELINE SUCCESSFUL")
            print("====================================")
            print("Original PDF:", pdf_path)
            print("Returned PDF:", received_pdf)
            print("MitID signed PDF:", signed_pdf)
        else:
            print("\nSIGNITS contract created, but final signature was not received yet.")
    finally:
        webhook_server.stop()


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":

    if len(sys.argv) > 1 and sys.argv[1] == "test":

        run_pipeline_test()

    else:

        print("PDF Editor pipeline test")
        print()
        print("Run the complete test with:")
        print("python3 app_cloudflare.py test")
