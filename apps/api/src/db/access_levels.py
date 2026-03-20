from enum import Enum


class AccessLevel(str, Enum):
    FREE = "free"
    REGULAR = "regular"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
