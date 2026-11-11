import os
import re
import base64
from pathlib import Path
from email.utils import parseaddr

import requests

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config import *
from tasks.utils import *

def send_to_signits(
    sign_method,
    signer_name,
    signer_mail,
    pdf_path,
    title
):    

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")

    pdf_bytes = read_pdf(pdf_path)

    url = f"{SIGNITS_BASE_URL}/api/v1/contracts"

    headers = {
        "Authorization": f"Bearer {SIGNITS_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {

        "title": f"Dokument til MitID-signering [{title}]",

        "pdf_base64": base64.b64encode(
            pdf_bytes
        ).decode("utf-8"),

        "sign_method": sign_method,

        "send_email": True,

        "signers": (
            [
                {"name": name, "email": email, "order": idx + 1}
                for idx, (name, email) in enumerate(zip(signer_name, signer_mail))
            ]
            if isinstance(signer_name, list) and isinstance(signer_mail, list)
            else [
                {
                    "name": signer_name,
                    "email": signer_mail,
                    "order": 1
                }
            ]
        )
    }
    
    print("sending contract to signits with payload")
    print("payload",payload)

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=60
    )

    response.raise_for_status()

    result = response.json()
    print("this is the result from signits contracts call",result)

    if not result.get("ok"):
        raise RuntimeError(
            f"SIGNITS contract creation failed: {result}"
        )

    signits_contract_id = result["contract"]["id"]

    print(
        f"SIGNITS contract created: {signits_contract_id}",
        flush=True
    )

    return str(signits_contract_id)


def check_signits_status(signits_contract_id):

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")

    url = (
        f"{SIGNITS_BASE_URL}/api/v1/contracts/"
        f"{signits_contract_id}"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {SIGNITS_API_KEY}"
        },
        timeout=30
    )

    response.raise_for_status()

    result = response.json()
    return result["contract"]


def download_signits_pdf(contract_id, reference):

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")

    url = (
        f"{SIGNITS_BASE_URL}/api/v1/contracts/"
        f"{contract_id}/pdf"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {SIGNITS_API_KEY}"
        },
        timeout=60
    )

    response.raise_for_status()

    pdf_bytes = response.content

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError(
            "SIGNITS did not return a valid PDF."
        )

    output_path = (
        SIGNED_DIR /
        f"eid_signed_{safe_filename(reference)}.pdf"
    )

    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(
        f"Final eID-signed PDF downloaded: {output_path}",
        flush=True
    )

    return str(output_path)