"""
SIGNITS API v1 – lille interaktiv testklient.

Krav:
    pip3 install requests

Sæt API-nøglen i miljøvariablen SIGNITS_API_KEY.
Brug helst SIGNITS' testkonto/testmiljø før du opretter kontrakter.
"""

import base64
import json
import os
from pathlib import Path

import requests

BASE_URL = "https://sign.signits.dk"
API_KEY = os.getenv("SIGNITS_API_KEY", "").strip()
TIMEOUT = 30


def headers():
    if not API_KEY:
        raise RuntimeError(
            "SIGNITS_API_KEY mangler. Sæt miljøvariablen i terminalen først."
        )
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def print_response(response):
    print(f"\nHTTP-status: {response.status_code}")
    content_type = response.headers.get("Content-Type", "")

    if "application/json" in content_type:
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        except ValueError:
            pass

    print(response.text[:5000])
    return None


def api_request(method, path, *, payload=None, stream=False):
    url = f"{BASE_URL}{path}"
    try:
        response = requests.request(
            method,
            url,
            headers=headers(),
            json=payload,
            timeout=TIMEOUT,
            stream=stream,
        )
    except requests.RequestException as exc:
        print(f"\nNetværksfejl: {exc}")
        return None, None

    if stream and response.ok:
        return response, None

    data = print_response(response)
    return response, data


def check_key():
    """Kontroller nøglen ved at forsøge at hente en kontrakt, brugeren angiver."""
    contract_id = input(
        "Indtast et eksisterende kontrakt-ID til test (ikke et kundenummer): "
    ).strip()
    if not contract_id:
        print("Sprang over. API-dokumentationen beskriver ikke et separat"
              " endpoint til kontrol af nøglen.")
        return

    response, _ = api_request("GET", f"/api/v1/contracts/{contract_id}")
    if response is not None and response.status_code == 200:
        print("\nKaldet lykkedes. Nøglen har adgang til denne kontrakt.")
    elif response is not None and response.status_code == 401:
        print("\nNøglen mangler, er ugyldig eller er tilbagekaldt.")
    elif response is not None and response.status_code == 403:
        print("\nAPI-adgang kræver muligvis en Pro-plan.")
    elif response is not None and response.status_code == 404:
        print("\nKontrakten findes ikke eller tilhører ikke denne konto. "
              "Det beviser ikke i sig selv, at nøglen er ugyldig.")


def create_contract():
    print("\nOpret en simpel testkontrakt med ren tekst.")
    print("ADVARSEL: Brug kun dette i SIGNITS' testmiljø, hvis du vil undgå "
          "at starte en rigtig signeringsproces.")
    print("Scriptet sender ikke selv en e-mail (send_email=false), men det "
          "kan stadig oprette en kontrakt og et signeringslink.")

    confirm = input('Skriv OPRET for at fortsætte: ').strip()
    if confirm != "OPRET":
        print("Annulleret.")
        return

    title = input("Kontraktens titel [API-test]: ").strip() or "API-test"
    name = input("Underskriverens navn [Test Bruger]: ").strip() or "Test Bruger"
    email = input("Underskriverens e-mail: ").strip()
    if not email or "@" not in email:
        print("Indtast en gyldig e-mailadresse. Annulleret.")
        return

    print("Vælg signeringsmetode:")
    print("1. eid (MitID i produktion; testkonto kan bruge testsignering)")
    print("2. email (e-mail-godkendelse)")
    method_choice = input("Valg [1]: ").strip() or "1"
    sign_method = "email" if method_choice == "2" else "eid"

    payload = {
        "title": title,
        "body": (
            "Dette er en testkontrakt oprettet via SIGNITS API. "
            "Brug ikke dokumentet som en rigtig aftale."
        ),
        "signers": [{"name": name, "email": email, "order": 1}],
        "sign_method": sign_method,
        "send_email": True,
    }

    response, data = api_request(
        "POST", "/api/v1/contracts", payload=payload
    )
    if response is not None and response.status_code in (200, 201) and data:
        contract = data.get("contract", {})
        print("\nKontrakt-ID:", contract.get("id", "(ikke returneret)"))
        print("Reference:", contract.get("reference", "(ikke returneret)"))
        print("Status:", contract.get("status", "(ikke returneret)"))
        for signer in contract.get("signers", []):
            print("Signeringslink:", signer.get("sign_url", "(ikke returneret)"))
        print("\nGem kontrakt-ID'et, så du kan teste status og PDF senere.")


def get_status():
    contract_id = input("Kontrakt-ID: ").strip()
    if contract_id:
        api_request("GET", f"/api/v1/contracts/{contract_id}")


def resend_email():
    contract_id = input("Kontrakt-ID: ").strip()
    if not contract_id:
        return
    print("Dette kan sende/gensende en rigtig e-mail til underskrivere, "
          "der mangler at underskrive.")
    if input('Skriv SEND for at bekræfte: ').strip() != "SEND":
        print("Annulleret.")
        return
    api_request("POST", f"/api/v1/contracts/{contract_id}/send", payload={})


def download_signed_pdf():
    contract_id = input("Kontrakt-ID: ").strip()
    if not contract_id:
        return

    response, _ = api_request(
        "GET", f"/api/v1/contracts/{contract_id}/pdf", stream=True
    )
    if response is None:
        return

    if not response.ok:
        print(f"\nPDF kunne ikke hentes (HTTP {response.status_code}).")
        print(response.text[:2000])
        if response.status_code == 409:
            print("Kontrakten er sandsynligvis ikke færdigunderskrevet endnu.")
        return

    filename = f"signits_signed_{contract_id}.pdf"
    output_path = Path(filename)
    output_path.write_bytes(response.content)
    print(f"\nPDF gemt: {output_path.resolve()}")
    print(f"Filstørrelse: {output_path.stat().st_size:,} bytes")


def show_menu():
    print("\n" + "=" * 52)
    print("SIGNITS API – testmenu")
    print("=" * 52)
    print("1. Test API-nøgle/adgang via et eksisterende kontrakt-ID")
    print("2. Opret en testkontrakt")
    print("3. Hent kontraktstatus")
    print("4. Send/gensend signeringsmail")
    print("5. Hent underskrevet PDF")
    print("0. Afslut")


def main():
    if not API_KEY:
        print("FEJL: Miljøvariablen SIGNITS_API_KEY er ikke sat.")
        print('macOS/Linux: export SIGNITS_API_KEY="DIN_API_NOEGLE"')
        return

    print("API-nøgle fundet i miljøvariablen (nøglen vises ikke).")
    while True:
        show_menu()
        choice = input("Vælg funktion: ").strip()
        try:
            if choice == "1":
                check_key()
            elif choice == "2":
                create_contract()
            elif choice == "3":
                get_status()
            elif choice == "4":
                resend_email()
            elif choice == "5":
                download_signed_pdf()
            elif choice == "0":
                print("Afslutter.")
                break
            else:
                print("Ukendt valg.")
        except RuntimeError as exc:
            print(f"\nKonfigurationsfejl: {exc}")
        except KeyboardInterrupt:
            print("\nAfbrudt.")
            break


if __name__ == "__main__":
    main()
