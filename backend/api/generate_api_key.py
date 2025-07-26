#!/usr/bin/env python3
"""CLI script for generating API keys for clients.

Usage: python generate_api_key.py <client_name>
"""

import sys

from dotenv import load_dotenv

from app import create_app
from app.extensions import db
from app.models.api_client import ApiClient


def generate_key(client_name: str) -> int:
    """Generate an API key for a client."""
    # Validate client name before attempting to create the client
    if "." in client_name:
        print(f"Error: Client name '{client_name}' cannot contain a dot ('.').")
        print("The dot character is reserved for API key formatting.")
        return 1

    app = create_app()
    with app.app_context():
        # Check if client already exists
        existing_client = ApiClient.query.filter_by(name=client_name).first()
        if existing_client:
            print(f"Error: Client '{client_name}' already exists.")
            return 1

        # Generate new API client and key
        try:
            new_client, api_key = ApiClient.create_with_api_key(name=client_name)
        except ValueError as e:
            print(f"Error: {e}")
            return 1

        db.session.add(new_client)
        db.session.commit()

        # The full API key to be used by the client
        full_api_key = f"{new_client.name}.{api_key}"

        print("\n===== API Key Generated Successfully =====")
        print(f"Client Name: {new_client.name}")
        print(f"API Key: {full_api_key}")
        print("\nImportant: Store this API key securely.")
        print("It won't be shown again.")
        print("===========================================\n")
        return 0


def main() -> int:
    """Generate API key for the specified client."""
    # Load environment variables
    load_dotenv()

    # Check arguments
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <client_name>")
        return 1

    client_name = sys.argv[1]
    if not client_name:
        print("Error: Client name cannot be empty.")
        return 1

    return generate_key(client_name)


if __name__ == "__main__":
    sys.exit(main())
