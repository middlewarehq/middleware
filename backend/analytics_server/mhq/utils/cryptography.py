import configparser
import os
from base64 import b64encode, b64decode

from Crypto.Cipher import PKCS1_OAEP
from Crypto.PublicKey import RSA

service = None
CONFIG_PATH = "mhq/config/config.ini"


class CryptoService:
    def __init__(self):
        self._public_key, self._public_cipher = (None, None)
        self._private_key, self._private_cipher = (None, None)

    def _init_keys(self):
        # Skip if already setup
        if self._public_key:
            return

        config = configparser.ConfigParser()
        config_path = os.path.join(os.getcwd(), CONFIG_PATH)
        config.read(config_path)
        public_key = self._decode_key(config.get("KEYS", "SECRET_PUBLIC_KEY"))
        private_key = self._decode_key(config.get("KEYS", "SECRET_PRIVATE_KEY"))

        self._public_key = RSA.importKey(public_key) if public_key else None
        self._private_key = RSA.importKey(private_key) if private_key else None

        self._public_cipher = (
            PKCS1_OAEP.new(self._public_key) if self._public_key else None
        )
        self._private_cipher = (
            PKCS1_OAEP.new(self._private_key) if self._private_key else None
        )

    def encrypt(self, message: str, chunk_size: int) -> [str]:
        self._init_keys()

        if not message:
            return message

        if not self._public_key:
            raise Exception("No public key found to encrypt")

        chunks = [
            message[i : i + chunk_size] for i in range(0, len(message), chunk_size)
        ]

        return [
            b64encode(self._public_cipher.encrypt(chunk.encode("utf8"))).decode("utf8")
            for chunk in chunks
        ]

    def decrypt(self, secret: str):
        self._init_keys()

        if not secret:
            return secret

        if not self._private_key:
            raise Exception("No private key found to decrypt")

        secret = secret.encode("utf8")
        return self._private_cipher.decrypt(b64decode(secret)).decode("utf8")

    def decrypt_chunks(self, secret_chunks: [str]):
        self._init_keys()

        if not secret_chunks:
            return secret_chunks

        if not self._private_key:
            raise Exception("No private key found to decrypt")

        return "".join(
            self._private_cipher.decrypt(b64decode(secret.encode("utf8"))).decode(
                "utf8"
            )
            for secret in secret_chunks
        )

    def _decode_key(self, key: str) -> str:
        key = key.replace("%", "/")
        key = key.encode("utf8")
        return b64decode(key).decode("utf8")


def get_crypto_service():
    global service
    if not service:
        service = CryptoService()

    return service
