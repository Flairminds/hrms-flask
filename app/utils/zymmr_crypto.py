"""
RSA-OAEP helpers so the frontend can send Zymmr username/password as ciphertext.

The private key lives only on the server (env or a local PEM file). Credentials
are decrypted in-memory for the duration of one request and never stored.
"""
import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

from .logger import Logger

_PRIVATE_KEY = None
_PUBLIC_PEM = None


def _key_file_path():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    return os.path.join(root, '.zymmr_rsa.pem')


def _serialize_private(key):
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def _serialize_public(key):
    return key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode('utf-8')


def _load_private_pem(pem):
    if isinstance(pem, str):
        pem = pem.replace('\\n', '\n').encode('utf-8')
    return serialization.load_pem_private_key(pem, password=None)


def init_zymmr_rsa(app=None):
    """Load or create the RSA key used to decrypt Zymmr credentials."""
    global _PRIVATE_KEY, _PUBLIC_PEM

    env_pem = os.environ.get('ZYMMR_RSA_PRIVATE_KEY', '').strip()
    path = _key_file_path()

    if env_pem:
        _PRIVATE_KEY = _load_private_pem(env_pem)
    elif os.path.exists(path):
        with open(path, 'rb') as f:
            _PRIVATE_KEY = _load_private_pem(f.read())
    else:
        _PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        try:
            with open(path, 'wb') as f:
                f.write(_serialize_private(_PRIVATE_KEY))
        except OSError as e:
            Logger.warning('Could not persist Zymmr RSA key to disk', error=str(e))

    _PUBLIC_PEM = _serialize_public(_PRIVATE_KEY)
    if app is not None:
        app.config['ZYMMR_RSA_PUBLIC_PEM'] = _PUBLIC_PEM


def public_key_pem():
    if _PUBLIC_PEM is None:
        init_zymmr_rsa()
    return _PUBLIC_PEM


def decrypt_zymmr_credentials(ciphertext_b64):
    """
    Decrypt a base64 RSA-OAEP (SHA-256) blob to `{ usr, pwd }`.
    Raises ValueError if the payload is missing or malformed.
    """
    import base64
    import json

    if not ciphertext_b64 or not isinstance(ciphertext_b64, str):
        raise ValueError('Encrypted Zymmr credentials are required')
    if _PRIVATE_KEY is None:
        init_zymmr_rsa()
    try:
        raw = base64.b64decode(ciphertext_b64)
        plaintext = _PRIVATE_KEY.decrypt(
            raw,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        data = json.loads(plaintext.decode('utf-8'))
    except Exception:
        raise ValueError('Could not decrypt Zymmr credentials. Refresh and try again.')

    usr = (data.get('usr') or data.get('username') or '').strip()
    pwd = data.get('pwd') or data.get('password') or ''
    if not usr or not pwd:
        raise ValueError('Zymmr username and password are required')
    return usr, pwd
