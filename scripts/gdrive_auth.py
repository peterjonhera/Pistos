"""
One-time Google Drive OAuth2 setup.
Run once locally: python scripts/gdrive_auth.py
This creates gdrive_token.json for use by the backup service.
"""
from google_auth_oauthlib.flow import InstalledAppFlow
import json, os

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
creds_path = os.path.join(os.path.dirname(__file__), "../credentials.json")
token_path = os.path.join(os.path.dirname(__file__), "../gdrive_token.json")

flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
creds = flow.run_local_server(port=0)

with open(token_path, "w") as f:
    f.write(creds.to_json())

print(f"Token saved to {token_path}")
print("Upload this file to your server — do NOT commit to GitHub.")
