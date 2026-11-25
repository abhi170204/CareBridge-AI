import os
import json
import firebase_admin

from dotenv import load_dotenv
from firebase_admin import credentials, auth

load_dotenv()

def initialize_firebase():

    try:
        firebase_admin.get_app()
        return

    except ValueError:
        pass

    credentials_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        ""
    )

    if not credentials_json:
        raise ValueError(
            "Firebase credentials are missing"
        )

    service_account_info = json.loads(credentials_json)

    credential = credentials.Certificate(
        service_account_info
    )

    firebase_admin.initialize_app(credential)


def assign_authenticated_role():

    initialize_firebase()

    page_token = None
    updated = 0
    failed = 0

    print("Starting Firebase user migration...")

    while True:

        result = auth.list_users(
            max_results=1000,
            page_token=page_token
        )

        for user in result.users:

            try:

                existing_claims = (
                    user.custom_claims or {}
                )

                updated_claims = {
                    **existing_claims,
                    "role": "authenticated"
                }

                auth.set_custom_user_claims(
                    user.uid,
                    updated_claims
                )

                updated += 1

                print("Updated:", user.uid)

            except Exception as error:

                failed += 1

                print(
                    "Failed to update user:",
                    user.uid,
                    str(error)
                )

        page_token = result.next_page_token

        if not page_token:
            break

    print("\nMigration completed.")
    print("Updated users:", updated)
    print("Failed users:", failed)


if __name__ == "__main__":
    assign_authenticated_role()