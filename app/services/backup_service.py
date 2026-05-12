import os
import json
from datetime import datetime

def trigger_backup():
    """
    Trigger a backup of the SQLite/PostgreSQL database to Google Drive.
    Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.
    Returns True on success, False on failure.
    """
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload

        # Credentials must be stored after OAuth2 flow (see README)
        token_path = os.path.join(os.path.dirname(__file__), "../../gdrive_token.json")
        if not os.path.exists(token_path):
            print("[Backup] No Google Drive token found. Run OAuth2 setup first.")
            return False

        creds = Credentials.from_authorized_user_file(token_path)
        service = build("drive", "v3", credentials=creds)

        # Find or create Pistos folder
        folder_id = _get_or_create_folder(service, "Pistos Backups")

        # Export database
        db_url = os.getenv("DATABASE_URL", "sqlite:///pistos.db")
        backup_filename = f"pistos_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = f"/tmp/{backup_filename}"

        _export_db_to_json(backup_path)

        file_metadata = {"name": backup_filename, "parents": [folder_id]}
        media = MediaFileUpload(backup_path, mimetype="application/json")
        service.files().create(body=file_metadata, media_body=media, fields="id").execute()

        os.remove(backup_path)
        print(f"[Backup] Uploaded {backup_filename} to Google Drive")
        return True

    except Exception as e:
        print(f"[Backup] Failed: {e}")
        return False


def _get_or_create_folder(service, folder_name):
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, fields="files(id)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]
    folder = service.files().create(
        body={"name": folder_name, "mimeType": "application/vnd.google-apps.folder"},
        fields="id"
    ).execute()
    return folder["id"]


def _export_db_to_json(path):
    """Export key tables to JSON for backup."""
    from app import db
    from app.models.transaction import Transaction
    from app.models.other import GivingRecord, Goal
    data = {
        "exported_at": str(datetime.utcnow()),
        "transactions": [t.to_dict() for t in Transaction.query.filter_by(is_deleted=False).all()],
        "giving_records": [g.to_dict() for g in GivingRecord.query.all()],
        "goals": [g.to_dict() for g in Goal.query.filter_by(is_active=True).all()],
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)
