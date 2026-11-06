# routes/dashboard.py

from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from psycopg2.extras import RealDictCursor
from contextlib import closing

from database import get_connection

dashboard_bp = Blueprint("dashboard", __name__)


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

                        s.signer_id,
                        s.position,
                        s.name AS signer_name,
                        s.email AS signer_email,
                        s.status AS signer_status

                    FROM contracts c

                    LEFT JOIN contract_signers s
                        ON s.contract_id = c.contract_id

                    WHERE c.user_id = %s

                    ORDER BY
                        c.created_at DESC,
                        c.contract_id DESC,
                        s.position ASC
                """, (user_id,))

                rows = cursor.fetchall()

        # Group signer rows under their corresponding contract.
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
                    "signers": []
                }

            # A LEFT JOIN means a contract can exist without signers.
            if row["signer_id"] is not None:
                contracts_by_id[contract_id]["signers"].append({
                    "signer_id": row["signer_id"],
                    "position": row["position"],
                    "name": row["signer_name"],
                    "email": row["signer_email"],
                    "status": row["signer_status"]
                })

        contracts = list(contracts_by_id.values())

        # Calculate dashboard statistics.
        total_contracts = len(contracts)

        completed_contracts = sum(
            1 for contract in contracts
            if contract["status"] == "completed"
        )

        pending_signers = sum(
            1
            for contract in contracts
            for signer in contract["signers"]
            if signer["status"] not in ("completed", "failed", "declined")
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
        print("Dashboard error:", e)
        return jsonify({"error": "Could not load dashboard data"}), 500