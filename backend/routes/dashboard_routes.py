# routes/dashboard.py

from flask import Blueprint, jsonify, send_file
from flask_login import login_required, current_user
from psycopg2.extras import RealDictCursor
from contextlib import closing
from io import BytesIO

import json
import requests

from config import SIGNITS_API_KEY, SIGNITS_BASE_URL
from database import get_connection


dashboard_bp = Blueprint("dashboard", __name__)


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def parse_signits_ids(past_contracts, current_signits_id):
    """
    Combine past_contracts and the current Signits contract ID.

    Supports:
        [212, 213]
        "{212,213}"
        "[212, 213]"
        "212,213"

    Removes duplicates while preserving order.
    """

    values = []

    if isinstance(past_contracts, list):
        values = past_contracts

    elif isinstance(past_contracts, str) and past_contracts.strip():

        raw = past_contracts.strip()

        if raw.startswith("{") and raw.endswith("}"):
            contents = raw[1:-1].strip()
            values = contents.split(",") if contents else []

        elif raw.startswith("[") and raw.endswith("]"):
            try:
                parsed = json.loads(raw)
                values = parsed if isinstance(parsed, list) else [parsed]
            except (ValueError, TypeError):
                values = []

        else:
            values = raw.split(",")

    elif past_contracts is not None:
        values = [past_contracts]

    signits_ids = []
    seen = set()

    for value in values:
        if value is None or str(value).strip() == "":
            continue

        try:
            signits_id = int(value)
        except (ValueError, TypeError):
            continue

        if signits_id not in seen:
            signits_ids.append(signits_id)
            seen.add(signits_id)

    if current_signits_id is not None:
        try:
            signits_id = int(current_signits_id)

            if signits_id not in seen:
                signits_ids.append(signits_id)
                seen.add(signits_id)

        except (ValueError, TypeError):
            pass

    return signits_ids


def fetch_signits_pdf(signits_contract_id):
    """
    Fetch a PDF from Signits and return its bytes.
    Does not save the PDF locally.
    """

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not configured.")

    if not signits_contract_id:
        raise ValueError("Missing Signits contract ID.")

    target_url = (
        f"{SIGNITS_BASE_URL}/api/v1/contracts/"
        f"{signits_contract_id}/pdf"
    )

    headers = {
        "Authorization": f"Bearer {SIGNITS_API_KEY}"
    }

    response = requests.get(
        target_url,
        headers=headers,
        timeout=60
    )

    response.raise_for_status()

    pdf_data = response.content

    if not pdf_data.startswith(b"%PDF-"):
        raise ValueError("Signits did not return a valid PDF.")

    return pdf_data


def pdf_response(pdf_data, filename):
    """
    Return PDF bytes as an inline PDF response.
    """

    return send_file(
        BytesIO(pdf_data),
        mimetype="application/pdf",
        as_attachment=False,
        download_name=filename
    )


# --------------------------------------------------
# Dashboard contracts
# --------------------------------------------------

@dashboard_bp.get("/contracts")
@login_required
def get_dashboard_contracts():

    user_id = current_user.id

    try:
        with closing(get_connection()) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:

                cursor.execute("""
                    SELECT
                        c.contract_id,
                        c.title,
                        c.status,
                        c.created_at,
                        c.sign_method,
                        c.past_contracts,
                        c.signits_contract_id,
                        c.waitForPdfApproval AS wait_for_pdf_approval,
                        c.signSamePdf AS sign_same_pdf,

                        s.signer_id,
                        s.position,
                        s.signer_name,
                        s.signer_mail,
                        s.status AS signer_status

                    FROM contracts c

                    LEFT JOIN contract_signers s
                        ON s.contract_id = c.contract_id
                        AND c.waitForPdfApproval = TRUE

                    WHERE c.user_id = %s

                    ORDER BY
                        c.created_at DESC,
                        c.contract_id DESC,
                        s.position ASC
                """, (user_id,))

                rows = cursor.fetchall()

        contracts_by_id = {}

        for row in rows:

            contract_id = row["contract_id"]

            if contract_id not in contracts_by_id:
                contracts_by_id[contract_id] = {
                    "contract_id": contract_id,
                    "title": row["title"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "sign_method": row["sign_method"],
                    "past_contracts": row["past_contracts"],
                    "signits_contract_id": row["signits_contract_id"],
                    "waitForPdfApproval": row["wait_for_pdf_approval"],
                    "signSamePdf": row["sign_same_pdf"],
                    "signers": []
                }

            # A contract with waitForPdfApproval=False will have
            # no signer rows, but the contract itself is still retained.
            if row["signer_id"] is not None:
                contracts_by_id[contract_id]["signers"].append({
                    "signer_id": row["signer_id"],
                    "position": row["position"],
                    "name": row["signer_name"],
                    "mail": row["signer_mail"],
                    "status": row["signer_status"]
                })

        contracts = list(contracts_by_id.values())

        # --------------------------------------------------
        # Dashboard statistics
        # --------------------------------------------------

        total_contracts = len(contracts)

        completed_contracts = sum(
            1
            for contract in contracts
            if str(contract["status"] or "").lower()
            in ("completed", "signed")
        )

        pending_signers = sum(
            1
            for contract in contracts
            for signer in contract["signers"]
            if str(signer["status"] or "").lower()
            not in ("completed", "failed", "declined", "signed")
        )

        return jsonify({
            "contracts": contracts,
            "stats": {
                "total": total_contracts,
                "pending": pending_signers,
                "completed": completed_contracts
            }
        }), 200

    except Exception as e:
        print(
            f"Dashboard error for user {user_id}: {e}",
            flush=True
        )

        return jsonify({
            "error": "Could not load dashboard data"
        }), 500


# --------------------------------------------------
# Final contract PDF
# --------------------------------------------------

@dashboard_bp.get("/contracts/<int:contract_id>/pdf")
@login_required
def get_contract_pdf(contract_id):
    """
    Fetch the latest/final Signits PDF for a contract.

    Uses contracts.signits_contract_id.
    """

    user_id = current_user.id

    try:
        with closing(get_connection()) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:

                cursor.execute("""
                    SELECT
                        signits_contract_id,
                        title
                    FROM contracts
                    WHERE contract_id = %s
                      AND user_id = %s
                """, (contract_id, user_id))

                contract = cursor.fetchone()

        if not contract:
            return jsonify({
                "error": "Contract not found."
            }), 404

        signits_id = contract["signits_contract_id"]

        if signits_id is None:
            return jsonify({
                "error": "No Signits contract is associated with this contract."
            }), 404

        pdf_data = fetch_signits_pdf(signits_id)

        filename = f"contract_{contract_id}.pdf"

        return pdf_response(pdf_data, filename)

    except requests.exceptions.RequestException as e:
        print(
            f"Signits PDF request failed for contract "
            f"{contract_id}: {e}",
            flush=True
        )

        return jsonify({
            "error": "Could not fetch the PDF from Signits."
        }), 502

    except Exception as e:
        print(
            f"Error retrieving contract PDF {contract_id}: {e}",
            flush=True
        )

        return jsonify({
            "error": "Could not retrieve the contract PDF."
        }), 500


# --------------------------------------------------
# Individual signer PDF
# --------------------------------------------------

@dashboard_bp.get(
    "/contracts/<int:contract_id>/signers/<int:signer_id>/pdf"
)
@login_required
def get_signer_pdf(contract_id, signer_id):
    """
    Fetch the Signits PDF corresponding to an individual signer.

    Prefer contract_signers.signits_contract_id because it directly
    associates the Signits contract ID with the signer.

    If that field is NULL, fall back to the historical mapping:

        past_contracts[0] -> signer with lowest position
        past_contracts[1] -> signer with second-lowest position
        ...
        signits_contract_id -> latest signer/version
    """

    user_id = current_user.id

    try:
        with closing(get_connection()) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:

                # Verify ownership and retrieve the contract's IDs.
                cursor.execute("""
                    SELECT
                        c.contract_id,
                        c.title,
                        c.past_contracts,
                        c.signits_contract_id

                    FROM contracts c

                    WHERE c.contract_id = %s
                      AND c.user_id = %s
                """, (contract_id, user_id))

                contract = cursor.fetchone()

                if not contract:
                    return jsonify({
                        "error": "Contract not found."
                    }), 404

                # Retrieve the requested signer and their direct
                # Signits contract ID, if available.
                cursor.execute("""
                    SELECT
                        signer_id,
                        position,
                        signer_name,
                        signer_mail,
                        signits_contract_id

                    FROM contract_signers

                    WHERE contract_id = %s
                      AND signer_id = %s
                """, (contract_id, signer_id))

                requested_signer = cursor.fetchone()

                if not requested_signer:
                    return jsonify({
                        "error": "Signer not found for this contract."
                    }), 404

                # Prefer the Signits ID stored directly on the signer.
                signits_id = requested_signer["signits_contract_id"]

                if signits_id is not None:
                    try:
                        signits_id = int(signits_id)
                    except (ValueError, TypeError):
                        signits_id = None

                # Fallback to the historical positional mapping.
                if signits_id is None:

                    cursor.execute("""
                        SELECT
                            signer_id,
                            position

                        FROM contract_signers

                        WHERE contract_id = %s

                        ORDER BY position ASC
                    """, (contract_id,))

                    signers = cursor.fetchall()

                    signer_index = next(
                        (
                            index
                            for index, signer in enumerate(signers)
                            if str(signer["signer_id"]) == str(signer_id)
                        ),
                        None
                    )

                    if signer_index is None:
                        return jsonify({
                            "error": "Signer not found for this contract."
                        }), 404

                    signits_ids = parse_signits_ids(
                        contract["past_contracts"],
                        contract["signits_contract_id"]
                    )

                    if signer_index >= len(signits_ids):
                        return jsonify({
                            "error": (
                                "No Signits contract ID was found "
                                "for this signer."
                            )
                        }), 404

                    signits_id = signits_ids[signer_index]

        print(
            f"Fetching signer PDF: "
            f"contract={contract_id}, "
            f"signer={signer_id}, "
            f"position={requested_signer['position']}, "
            f"signits_id={signits_id}",
            flush=True
        )

        pdf_data = fetch_signits_pdf(signits_id)

        filename = (
            f"contract_{contract_id}_"
            f"signer_{signer_id}.pdf"
        )

        return pdf_response(pdf_data, filename)

    except requests.exceptions.RequestException as e:
        print(
            f"Signits signer PDF request failed: "
            f"contract={contract_id}, "
            f"signer={signer_id}: {e}",
            flush=True
        )

        return jsonify({
            "error": "Could not fetch the signer PDF from Signits."
        }), 502

    except Exception as e:
        print(
            f"Error retrieving signer PDF: "
            f"contract={contract_id}, "
            f"signer={signer_id}: {e}",
            flush=True
        )

        return jsonify({
            "error": "Could not retrieve the signer PDF."
        }), 500
