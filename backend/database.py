from supabase import create_client, Client
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

supabase: Client = None

def init_supabase(url=None, key=None):
    global supabase
    url = url or os.environ.get('SUPABASE_URL')
    key = key or os.environ.get('SUPABASE_KEY')
    if url and key:
        supabase = create_client(url, key)
    return supabase

def get_supabase() -> Client:
    if not supabase:
        raise RuntimeError("Database not configured. Complete the setup wizard at /setup.")
    return supabase

def is_configured():
    return supabase is not None

# Auto-initialize if credentials exist
_url = os.environ.get('SUPABASE_URL')
_key = os.environ.get('SUPABASE_KEY')
if _url and _key:
    try:
        init_supabase(_url, _key)
    except Exception:
        pass
