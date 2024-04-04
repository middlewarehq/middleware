from os import getenv

from redis import Redis
from redis_lock import Lock

REDIS_HOST = getenv("DORA_REDIS_HOST", "localhost")
REDIS_PORT = getenv("DORA_REDIS_PORT", 6379)
REDIS_DB = 0
REDIS_PASSWORD = ""
SSL_STATUS = True if REDIS_HOST != "localhost" else False

service = None


class RedisLockService:
    def __init__(self, host, port, db, password, ssl):
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        self.ssl = ssl
        self.redis = Redis(
            host=self.host,
            port=self.port,
            db=self.db,
            password=self.password,
            ssl=self.ssl,
            socket_connect_timeout=5,
        )

    def acquire_lock(self, key: str):
        return Lock(self.redis, name=key, expire=1.5, auto_renewal=True)


def get_redis_lock_service():
    global service
    if not service:
        service = RedisLockService(
            REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD, SSL_STATUS
        )
    return service
