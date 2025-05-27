#!/usr/bin/env python3
"""
CLI script for generating API keys for clients.
Usage: python generate_api_key.py <client_name>
"""

import sys

from dotenv import load_dotenv

from app import ApiClient, create_app
from app.extensions import db


def generate_key(client_name):
    """Generate an API key for a client."""
    app = create_app()
    with app.app_context():
        # Check if client already exists
        existing_client = ApiClient.query.filter_by(name=client_name).first()
        if existing_client:
            print(f"Error: Client '{client_name}' already exists.")
            return 1

        # Generate new API client
        new_client = ApiClient(name=client_name, api_key=ApiClient.generate_api_key())

        db.session.add(new_client)
        db.session.commit()

        print("\n===== API Key Generated Successfully =====")
        print(f"Client Name: {new_client.name}")
        print(f"API Key: {new_client.api_key}")
        print("\nImportant: Store this API key securely.")
        print("It won't be shown again.")
        print("===========================================\n")
        return 0


def main():
    """Main entry point for the script."""
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
