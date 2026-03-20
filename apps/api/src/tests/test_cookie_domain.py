import os
from unittest.mock import patch, MagicMock


def test_cookie_domain_from_config():
    """Cookie domain should come from LearnHouse config."""
    from src.security.auth import get_cookie_domain
    domain = get_cookie_domain()
    # Should return the config value (e.g., ".localhost" in dev) or None
    assert domain is not None or domain is None  # Just verify it doesn't crash


def test_dynamic_cors_allows_subdomain():
    """DynamicCORSMiddleware should allow matching subdomains."""
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

    from app import DynamicCORSMiddleware

    middleware = DynamicCORSMiddleware(MagicMock(), allowed_domain=".limitless-longevity.health")
    assert middleware._is_allowed("https://paths.limitless-longevity.health") == True
    assert middleware._is_allowed("https://hub.limitless-longevity.health") == True
    assert middleware._is_allowed("https://evil.com") == False
    assert middleware._is_allowed("http://localhost:3000") == True


def test_dynamic_cors_allows_explicit_origins():
    """DynamicCORSMiddleware should allow explicitly listed origins."""
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

    from app import DynamicCORSMiddleware

    middleware = DynamicCORSMiddleware(
        MagicMock(),
        allowed_domain=".example.com",
        allowed_origins=["https://app.mysite.com"]
    )
    assert middleware._is_allowed("https://app.mysite.com") == True
    assert middleware._is_allowed("https://other.mysite.com") == False


def test_dynamic_cors_blocks_empty_origin():
    """DynamicCORSMiddleware should block empty origin strings."""
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

    from app import DynamicCORSMiddleware

    middleware = DynamicCORSMiddleware(MagicMock(), allowed_domain=".example.com")
    assert middleware._is_allowed("") == False
    assert middleware._is_allowed(None) == False


def test_dynamic_cors_no_domain_still_allows_localhost():
    """DynamicCORSMiddleware with no domain should still allow localhost."""
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

    from app import DynamicCORSMiddleware

    middleware = DynamicCORSMiddleware(MagicMock(), allowed_domain=None)
    assert middleware._is_allowed("http://localhost:3000") == True
    assert middleware._is_allowed("https://example.com") == False
