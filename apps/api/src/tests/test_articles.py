import pytest
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

from src.db.articles import (
    Article,
    ArticleCreate,
    ArticleRead,
    ArticleStatusEnum,
)
from src.db.article_versions import ArticleVersion
from src.db.organizations import Organization  # noqa: F401 — ensures 'organization' table is in metadata
from src.db.users import User  # noqa: F401 — ensures 'user' table is in metadata
from src.db.content_pillars import ContentPillar  # noqa: F401 — ensures 'content_pillars' table is in metadata


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_article(org_id: int, author_id: int, slug: str = "longevity-101") -> Article:
    """Return an unsaved Article with sensible defaults."""
    return Article(
        article_uuid=f"article_{slug}",
        title="Longevity 101",
        slug=slug,
        summary="An introduction to longevity medicine.",
        content={"blocks": [{"type": "paragraph", "text": "Hello world"}]},
        featured_image="https://example.com/img.jpg",
        status=ArticleStatusEnum.DRAFT.value,
        org_id=org_id,
        author_id=author_id,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(name="test_org")
def test_org_fixture(db_session: Session):
    """Create a minimal Organization record for tests."""
    org = Organization(
        name="Test Org",
        slug="test-org",
        email="org@example.com",
        org_uuid="org_test-uuid-1234",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture(name="second_org")
def second_org_fixture(db_session: Session):
    """Create a second Organization for cross-org slug tests."""
    org = Organization(
        name="Second Org",
        slug="second-org",
        email="second@example.com",
        org_uuid="org_test-uuid-5678",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_create_article_all_fields(db_session: Session, test_user, test_org):
    """Create an article with all fields and verify they are stored correctly."""
    article = Article(
        article_uuid="article_abc123-full",
        title="The Science of Longevity",
        slug="science-of-longevity",
        summary="A deep-dive into the biology of ageing.",
        content={"blocks": [{"type": "heading", "text": "Introduction"}]},
        featured_image="https://cdn.example.com/hero.jpg",
        status=ArticleStatusEnum.DRAFT.value,
        pillar_id=None,
        org_id=test_org.id,
        author_id=test_user.id,
        reviewer_id=None,
        review_date=None,
        review_notes=None,
        published_at=None,
        related_courses=[],
    )
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    assert article.id is not None
    assert article.article_uuid == "article_abc123-full"
    assert article.article_uuid.startswith("article_")
    assert article.title == "The Science of Longevity"
    assert article.slug == "science-of-longevity"
    assert article.summary == "A deep-dive into the biology of ageing."
    assert article.content == {"blocks": [{"type": "heading", "text": "Introduction"}]}
    assert article.featured_image == "https://cdn.example.com/hero.jpg"
    assert article.status == "DRAFT"
    assert article.org_id == test_org.id
    assert article.author_id == test_user.id
    assert article.creation_date is not None
    assert article.update_date is not None


def test_article_uuid_format_starts_with_article_prefix(db_session: Session, test_user, test_org):
    """article_uuid must start with the 'article_' prefix (LearnHouse convention)."""
    from uuid import uuid4

    article_uuid = f"article_{uuid4()}"
    assert article_uuid.startswith("article_"), "UUID must have 'article_' prefix"

    article = Article(
        article_uuid=article_uuid,
        title="UUID Format Test",
        slug="uuid-format-test",
        status=ArticleStatusEnum.DRAFT.value,
        org_id=test_org.id,
        author_id=test_user.id,
    )
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    assert article.article_uuid.startswith("article_")


def test_slug_uniqueness_per_org_conflict(db_session: Session, test_user, test_org):
    """Same slug + same org_id must raise an IntegrityError."""
    article1 = _make_article(org_id=test_org.id, author_id=test_user.id, slug="duplicate-slug")
    article1.article_uuid = "article_dup-1"
    db_session.add(article1)
    db_session.commit()

    article2 = _make_article(org_id=test_org.id, author_id=test_user.id, slug="duplicate-slug")
    article2.article_uuid = "article_dup-2"
    db_session.add(article2)
    with pytest.raises(Exception):  # IntegrityError — UniqueConstraint violation
        db_session.commit()


def test_slug_same_across_different_orgs_allowed(
    db_session: Session, test_user, test_org, second_org
):
    """The same slug is allowed in two different orgs."""
    article1 = _make_article(org_id=test_org.id, author_id=test_user.id, slug="shared-slug")
    article1.article_uuid = "article_shared-1"
    db_session.add(article1)
    db_session.commit()

    article2 = _make_article(org_id=second_org.id, author_id=test_user.id, slug="shared-slug")
    article2.article_uuid = "article_shared-2"
    db_session.add(article2)
    db_session.commit()  # Must NOT raise

    results = db_session.exec(
        select(Article).where(Article.slug == "shared-slug")
    ).all()
    assert len(results) == 2
    org_ids = {r.org_id for r in results}
    assert org_ids == {test_org.id, second_org.id}


def test_article_status_enum_values():
    """ArticleStatusEnum covers all expected workflow states."""
    assert ArticleStatusEnum.DRAFT.value == "DRAFT"
    assert ArticleStatusEnum.IN_REVIEW.value == "IN_REVIEW"
    assert ArticleStatusEnum.APPROVED.value == "APPROVED"
    assert ArticleStatusEnum.PUBLISHED.value == "PUBLISHED"
    assert ArticleStatusEnum.ARCHIVED.value == "ARCHIVED"
    # Ensure the enum has exactly these 5 values
    assert len(ArticleStatusEnum) == 5


def test_article_create_schema_title_required():
    """ArticleCreate requires title; omitting it should raise a ValidationError."""
    import pydantic

    with pytest.raises((pydantic.ValidationError, TypeError)):
        ArticleCreate()  # missing required `title`


def test_article_create_schema_slug_optional():
    """ArticleCreate accepts title alone; slug defaults to None."""
    schema = ArticleCreate(title="My Article")
    assert schema.title == "My Article"
    assert schema.slug is None
    assert schema.summary is None
    assert schema.content is None
    assert schema.featured_image is None
    assert schema.pillar_id is None
    assert schema.related_courses is None


def test_article_create_schema_all_fields():
    """ArticleCreate accepts all optional fields when provided."""
    schema = ArticleCreate(
        title="Full Article",
        slug="full-article",
        summary="Summary text",
        content={"blocks": []},
        featured_image="https://example.com/img.jpg",
        pillar_id=3,
        related_courses=[1, 2, 3],
    )
    assert schema.slug == "full-article"
    assert schema.pillar_id == 3
    assert schema.related_courses == [1, 2, 3]


def test_article_version_creation(db_session: Session, test_user, test_org):
    """Create an ArticleVersion linked to an Article."""
    article = _make_article(org_id=test_org.id, author_id=test_user.id)
    article.article_uuid = "article_version-test-1"
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    version = ArticleVersion(
        article_id=article.id,
        version_number=1,
        content={"blocks": [{"type": "paragraph", "text": "v1 content"}]},
        created_by_id=test_user.id,
        notes="Initial draft snapshot",
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    assert version.id is not None
    assert version.article_id == article.id
    assert version.version_number == 1
    assert version.content == {"blocks": [{"type": "paragraph", "text": "v1 content"}]}
    assert version.created_by_id == test_user.id
    assert version.notes == "Initial draft snapshot"
    assert version.created_at is not None


def test_article_version_cascade_delete(db_session: Session, test_user, test_org):
    """Deleting an Article should cascade-delete its ArticleVersions.

    SQLite does not enforce FK cascade by default; we enable it via PRAGMA for
    this test to mirror PostgreSQL ON DELETE CASCADE behaviour.
    """
    from sqlalchemy import text

    # Enable FK enforcement for SQLite (no-op on PostgreSQL)
    db_session.exec(text("PRAGMA foreign_keys = ON"))

    article = _make_article(org_id=test_org.id, author_id=test_user.id, slug="cascade-test")
    article.article_uuid = "article_cascade-1"
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    for i in range(1, 4):
        v = ArticleVersion(
            article_id=article.id,
            version_number=i,
            content={"version": i},
            created_by_id=test_user.id,
        )
        db_session.add(v)
    db_session.commit()

    # Verify versions exist
    versions_before = db_session.exec(
        select(ArticleVersion).where(ArticleVersion.article_id == article.id)
    ).all()
    assert len(versions_before) == 3

    article_id = article.id

    # Delete the article — versions should cascade
    db_session.delete(article)
    db_session.commit()

    versions_after = db_session.exec(
        select(ArticleVersion).where(ArticleVersion.article_id == article_id)
    ).all()
    assert len(versions_after) == 0, "ArticleVersions should be deleted via CASCADE"


def test_article_version_multiple_versions(db_session: Session, test_user, test_org):
    """An article can have multiple versions with incrementing version numbers."""
    article = _make_article(org_id=test_org.id, author_id=test_user.id, slug="multi-version")
    article.article_uuid = "article_multi-v"
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    for i in range(1, 6):
        v = ArticleVersion(
            article_id=article.id,
            version_number=i,
            content={"revision": i},
            created_by_id=test_user.id,
        )
        db_session.add(v)
    db_session.commit()

    versions = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article.id)
        .order_by(ArticleVersion.version_number)
    ).all()
    assert len(versions) == 5
    assert [v.version_number for v in versions] == [1, 2, 3, 4, 5]
