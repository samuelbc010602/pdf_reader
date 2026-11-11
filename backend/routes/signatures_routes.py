import json

from flask import Blueprint, jsonify, request
from celery.result import AsyncResult

import os
import uuid

from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from celery_app import celery
from tasks.signing_tasks import send_contract_task

signature_bp = Blueprint("signature", __name__)

@signature_bp.post("/send_contract")
def send_contract():

    pdf = request.files.get("pdf")
    print("this is the requst.form",request.form)
    name = request.form.get("name")
    mail = request.form.get("mail")

    if not pdf:
        return jsonify({
            "status": "error",
            "message": "No PDF file was provided."
        }), 400

    signers_raw = request.form.get("signers")

    if not signers_raw:
        return jsonify({"error": "No signers provided"}), 400

    try:
        signers = json.loads(signers_raw)

        if not isinstance(signers, list) or not signers:
            raise ValueError("Invalid signer list")

        for signer in signers:
            if not signer.get("name") or not signer.get("mail"):
                raise ValueError("Each signer needs a name and email")

    except (json.JSONDecodeError, ValueError, AttributeError) as e:
        return jsonify({"error": str(e)}), 400

    title = request.form.get("title")
    sign_method = request.form.get("sign_method")
    signSamePdf = request.form.get("signSamePdf")
    waitForPdfApproval = request.form.get("waitForPdfApproval")

    ordering_matters = (
        request.form.get("ordering_matters", "").lower()
        in ("true", "1", "yes")
    )

    # Save PDF to persistent storage
    upload_dir = current_app.config.get(
        "SIGNING_UPLOAD_DIR",
        os.path.join(current_app.instance_path, "signing_uploads")
    )

    os.makedirs(upload_dir, exist_ok=True)

    pdf_path = os.path.join(
        upload_dir,
        f"{uuid.uuid4()}.pdf"
    )

    pdf.save(pdf_path)

    # Submit background task
    task = send_contract_task.delay(
        pdf_path,
        title,
        name,
        mail,
        sign_method,
        signers,
        ordering_matters,
        signSamePdf,
        waitForPdfApproval
    )

    return jsonify({
        "status": "accepted",
        "message": "Signing process started.",
        "task_id": task.id
    }), 202

@signature_bp.get("/signing_status/<task_id>")
def signing_status(task_id):

    task = AsyncResult(task_id, app=celery)

    result = task.result if task.ready() else None

    return jsonify({
        "task_id": task_id,
        "celery_status": task.state,
        "result": result
    }), 200