"""
Tests for the editorial workflow state machine (Task 6).

Coverage:
  1. Valid transition: DRAFT → IN_REVIEW via submit (with action_submit_review)
  2. Invalid transition: DRAFT → PUBLISHED (no direct path — should 400)
  3. Reject requires review_notes (400 without it)
  4. Submit enforces author-or-update-permission rule
  5. Permission enforcement: user without action_review cannot approve
  6. Version created on every transition
  7. Full happy path: DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED → DRAFT
  8. get_article_versions — paginates newest-first
  9. restore_article_version — creates new snapshot, updates article content
"""

import pytest
from sqlmodel import Session, select

from src.db.articles import Article, ArticleStatusEnum
from src.db.article_versions import ArticleVersion
from src.db.organizations import Organization  # noqa: F401 — ensures table in metadata
from src.db.users import User              # noqa: F401 — ensures table in metadata
from src.db.content_pillars import ContentPillar  # noqa: F401 — ensures table in metadata
from src.services.articles.workflow import (
    transition_article,
    get_article_versions,
    restore_article_version,
    TRANSITIONS,
)


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

@pytest.fixture(name="test_org")
def test_org_fixture(db_session: Session):
    org = Organization(
        name="Workflow Test Org",
        slug="workflow-test-org",
        email="workflow@example.com",
        org_uuid="org_workflow-test-1234",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture(name="author")
def author_fixture(db_session: Session):
    user = User(
        username="author",
        first_name="Article",
        last_name="Author",
        email="author@example.com",
        password="hashed",
        user_uuid="test-author-uuid",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="reviewer")
def reviewer_fixture(db_session: Session):
    user = User(
        username="reviewer",
        first_name="Content",
        last_name="Reviewer",
        email="reviewer@example.com",
        password="hashed",
        user_uuid="test-reviewer-uuid",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_article(db_session: Session, org_id: int, author_id: int,
                  status: str = "DRAFT", slug: str = "test-article") -> Article:
    """Create and persist a test article in the given status."""
    article = Article(
        article_uuid=f"article_{slug}-{status.lower()}",
        title="Test Article",
        slug=slug,
        status=status,
        org_id=org_id,
        author_id=author_id,
        content={"blocks": [{"type": "paragraph", "text": "Hello"}]},
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)
    return article


def _all_perms() -> dict:
    """Return a rights dict with every article permission granted."""
    return {
        "action_create": True,
        "action_read": True,
        "action_update": True,
        "action_delete": True,
        "action_submit_review": True,
        "action_review": True,
        "action_publish": True,
    }


def _no_perms() -> dict:
    """Return a rights dict with no article permissions granted."""
    return {
        "action_create": False,
        "action_read": False,
        "action_update": False,
        "action_delete": False,
        "action_submit_review": False,
        "action_review": False,
        "action_publish": False,
    }


def _perms(**overrides) -> dict:
    """Start from no-perms and selectively grant the listed permissions."""
    p = _no_perms()
    p.update(overrides)
    return p


def _version_count(db_session: Session, article_id: int) -> int:
    return len(
        db_session.exec(
            select(ArticleVersion).where(ArticleVersion.article_id == article_id)
        ).all()
    )


# ---------------------------------------------------------------------------
# 1. Valid transition: DRAFT → IN_REVIEW
# ---------------------------------------------------------------------------

def test_submit_draft_to_in_review(db_session: Session, author, test_org):
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="submit-test")

    result = transition_article(
        article_uuid=article.article_uuid,
        action="submit",
        user=author,
        user_rights=_perms(action_submit_review=True),
        db_session=db_session,
    )

    assert result.status == ArticleStatusEnum.IN_REVIEW.value


# ---------------------------------------------------------------------------
# 2. Invalid transition: DRAFT → PUBLISHED (no direct action)
# ---------------------------------------------------------------------------

def test_invalid_transition_draft_to_published(db_session: Session, author, test_org):
    """There is no 'publish' action from DRAFT — must raise 400."""
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="invalid-transition")

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid=article.article_uuid,
            action="publish",
            user=author,
            user_rights=_all_perms(),
            db_session=db_session,
        )

    assert exc_info.value.status_code == 400
    assert "DRAFT" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 3. Reject requires review_notes
# ---------------------------------------------------------------------------

def test_reject_without_review_notes_raises_400(db_session: Session, reviewer, test_org):
    """Rejecting without review_notes must raise HTTP 400."""
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, reviewer.id, status="IN_REVIEW", slug="reject-no-notes")

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid=article.article_uuid,
            action="reject",
            user=reviewer,
            user_rights=_perms(action_review=True),
            db_session=db_session,
            review_notes=None,  # deliberately missing
        )

    assert exc_info.value.status_code == 400
    assert "review_notes" in exc_info.value.detail


def test_reject_with_review_notes_succeeds(db_session: Session, reviewer, test_org):
    """Rejecting with review_notes stores notes and transitions back to DRAFT."""
    article = _make_article(db_session, test_org.id, reviewer.id, status="IN_REVIEW", slug="reject-with-notes")

    result = transition_article(
        article_uuid=article.article_uuid,
        action="reject",
        user=reviewer,
        user_rights=_perms(action_review=True),
        db_session=db_session,
        review_notes="Needs more detail in section 2.",
    )

    assert result.status == ArticleStatusEnum.DRAFT.value
    assert result.review_notes == "Needs more detail in section 2."


# ---------------------------------------------------------------------------
# 4. Submit enforces author-or-update-permission
# ---------------------------------------------------------------------------

def test_submit_by_non_author_without_update_perm_raises_403(
    db_session: Session, author, reviewer, test_org
):
    """A non-author without action_update cannot submit another user's draft."""
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="submit-non-author")

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid=article.article_uuid,
            action="submit",
            user=reviewer,  # reviewer is NOT the author
            user_rights=_perms(action_submit_review=True),  # has submit but not update
            db_session=db_session,
        )

    assert exc_info.value.status_code == 403


def test_submit_by_non_author_with_update_perm_succeeds(
    db_session: Session, author, reviewer, test_org
):
    """A non-author WITH action_update can submit on behalf of the author."""
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="submit-non-author-update")

    result = transition_article(
        article_uuid=article.article_uuid,
        action="submit",
        user=reviewer,  # not the author
        user_rights=_perms(action_submit_review=True, action_update=True),
        db_session=db_session,
    )

    assert result.status == ArticleStatusEnum.IN_REVIEW.value


# ---------------------------------------------------------------------------
# 5. Permission enforcement
# ---------------------------------------------------------------------------

def test_user_without_review_permission_cannot_approve(
    db_session: Session, author, test_org
):
    """Missing action_review → 403 on approve."""
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, author.id, status="IN_REVIEW", slug="approve-no-perm")

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid=article.article_uuid,
            action="approve",
            user=author,
            user_rights=_perms(),  # no action_review
            db_session=db_session,
        )

    assert exc_info.value.status_code == 403
    assert "action_review" in exc_info.value.detail


def test_user_without_submit_review_permission_cannot_submit(
    db_session: Session, author, test_org
):
    """Missing action_submit_review → 403 on submit."""
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="submit-no-perm")

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid=article.article_uuid,
            action="submit",
            user=author,
            user_rights=_perms(),  # no action_submit_review
            db_session=db_session,
        )

    assert exc_info.value.status_code == 403
    assert "action_submit_review" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 6. Version created on each transition
# ---------------------------------------------------------------------------

def test_version_created_on_submit(db_session: Session, author, test_org):
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="version-on-submit")
    versions_before = _version_count(db_session, article.id)

    transition_article(
        article_uuid=article.article_uuid,
        action="submit",
        user=author,
        user_rights=_perms(action_submit_review=True),
        db_session=db_session,
    )

    versions_after = _version_count(db_session, article.id)
    assert versions_after == versions_before + 1


def test_version_notes_reflect_transition(db_session: Session, author, test_org):
    """The new version's notes field should describe the action performed."""
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="version-notes-check")

    transition_article(
        article_uuid=article.article_uuid,
        action="submit",
        user=author,
        user_rights=_perms(action_submit_review=True),
        db_session=db_session,
    )

    latest_version = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article.id)
        .order_by(ArticleVersion.version_number.desc())  # type: ignore[union-attr]
    ).first()

    assert latest_version is not None
    assert "submit" in latest_version.notes.lower()


# ---------------------------------------------------------------------------
# 7. Full happy path
# ---------------------------------------------------------------------------

def test_full_workflow_happy_path(db_session: Session, author, reviewer, test_org):
    """
    Walk the full happy path:
      DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED → DRAFT
    and assert status at each step.
    """
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="full-happy-path")

    # DRAFT → IN_REVIEW
    r = transition_article(article.article_uuid, "submit", author,
                           _perms(action_submit_review=True), db_session)
    assert r.status == "IN_REVIEW"

    # IN_REVIEW → APPROVED
    r = transition_article(article.article_uuid, "approve", reviewer,
                           _perms(action_review=True), db_session)
    assert r.status == "APPROVED"
    assert r.reviewer_id == reviewer.id
    assert r.review_date is not None

    # APPROVED → PUBLISHED
    r = transition_article(article.article_uuid, "publish", reviewer,
                           _perms(action_publish=True), db_session)
    assert r.status == "PUBLISHED"
    assert r.published_at is not None

    # PUBLISHED → ARCHIVED
    r = transition_article(article.article_uuid, "archive", reviewer,
                           _perms(action_publish=True), db_session)
    assert r.status == "ARCHIVED"

    # ARCHIVED → DRAFT
    r = transition_article(article.article_uuid, "reopen", reviewer,
                           _perms(action_publish=True), db_session)
    assert r.status == "DRAFT"


def test_approve_revise_path(db_session: Session, author, reviewer, test_org):
    """APPROVED → DRAFT (revise) path works correctly."""
    article = _make_article(db_session, test_org.id, author.id, status="APPROVED", slug="revise-path")

    r = transition_article(article.article_uuid, "revise", reviewer,
                           _perms(action_publish=True), db_session)
    assert r.status == "DRAFT"


# ---------------------------------------------------------------------------
# 8. 404 on unknown article
# ---------------------------------------------------------------------------

def test_transition_article_not_found(db_session: Session, author):
    """Transitioning a non-existent article UUID must raise 404."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        transition_article(
            article_uuid="article_does-not-exist",
            action="submit",
            user=author,
            user_rights=_all_perms(),
            db_session=db_session,
        )

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# 9. get_article_versions — newest first, pagination
# ---------------------------------------------------------------------------

def test_get_article_versions_newest_first(db_session: Session, author, test_org):
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="versions-order")

    # Create 3 versions manually
    for i in range(1, 4):
        db_session.add(ArticleVersion(
            article_id=article.id,
            version_number=i,
            content={"rev": i},
            created_by_id=author.id,
        ))
    db_session.commit()

    versions = get_article_versions(article.article_uuid, db_session)
    assert len(versions) == 3
    assert versions[0].version_number == 3
    assert versions[1].version_number == 2
    assert versions[2].version_number == 1


def test_get_article_versions_pagination(db_session: Session, author, test_org):
    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="versions-pagination")

    for i in range(1, 6):
        db_session.add(ArticleVersion(
            article_id=article.id,
            version_number=i,
            content={"rev": i},
            created_by_id=author.id,
        ))
    db_session.commit()

    page1 = get_article_versions(article.article_uuid, db_session, page=1, limit=2)
    page2 = get_article_versions(article.article_uuid, db_session, page=2, limit=2)
    page3 = get_article_versions(article.article_uuid, db_session, page=3, limit=2)

    assert len(page1) == 2
    assert page1[0].version_number == 5  # newest first
    assert len(page2) == 2
    assert page2[0].version_number == 3
    assert len(page3) == 1
    assert page3[0].version_number == 1


def test_get_article_versions_not_found(db_session: Session):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        get_article_versions("article_does-not-exist", db_session)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# 10. restore_article_version
# ---------------------------------------------------------------------------

def test_restore_article_version_creates_new_snapshot(db_session: Session, author, test_org):
    """Restoring a version creates a new version entry and updates article content."""
    original_content = {"blocks": [{"type": "paragraph", "text": "Original"}]}
    updated_content = {"blocks": [{"type": "paragraph", "text": "Updated"}]}

    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="restore-test")

    # Create version 1 with original content
    db_session.add(ArticleVersion(
        article_id=article.id,
        version_number=1,
        content=original_content,
        created_by_id=author.id,
    ))
    db_session.commit()

    # Update article content to simulate an edit
    article.content = updated_content
    db_session.add(article)
    db_session.commit()

    # Create version 2 with updated content
    db_session.add(ArticleVersion(
        article_id=article.id,
        version_number=2,
        content=updated_content,
        created_by_id=author.id,
    ))
    db_session.commit()

    versions_before = _version_count(db_session, article.id)

    # Restore to version 1
    result = restore_article_version(article.article_uuid, 1, author.id, db_session)

    # Content should match version 1
    assert result.content == original_content

    # A new version should have been created
    versions_after = _version_count(db_session, article.id)
    assert versions_after == versions_before + 1

    # The newest version should note the restore
    latest = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article.id)
        .order_by(ArticleVersion.version_number.desc())  # type: ignore[union-attr]
    ).first()
    assert "Restored" in latest.notes or "restored" in latest.notes.lower()
    assert "1" in latest.notes


def test_restore_nonexistent_version_raises_404(db_session: Session, author, test_org):
    from fastapi import HTTPException

    article = _make_article(db_session, test_org.id, author.id, status="DRAFT", slug="restore-404-test")

    with pytest.raises(HTTPException) as exc_info:
        restore_article_version(article.article_uuid, 999, author.id, db_session)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# 11. TRANSITIONS constant — structural sanity checks
# ---------------------------------------------------------------------------

def test_transitions_covers_all_status_values():
    """Every ArticleStatusEnum value should appear as a key in TRANSITIONS."""
    from src.db.articles import ArticleStatusEnum
    expected_statuses = {s.value for s in ArticleStatusEnum}
    assert expected_statuses == set(TRANSITIONS.keys()), (
        f"TRANSITIONS is missing or has extra statuses. "
        f"Expected: {expected_statuses}, got: {set(TRANSITIONS.keys())}"
    )


def test_transitions_total_action_count():
    """There should be exactly 7 defined transitions."""
    total_actions = sum(len(actions) for actions in TRANSITIONS.values())
    assert total_actions == 7, f"Expected 7 transitions, got {total_actions}"
