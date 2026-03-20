import pytest
from sqlmodel import Session, select
from src.db.content_pillars import ContentPillar, ContentPillarCreate
from src.db.organizations import Organization  # noqa: F401 — ensures 'organization' table is in metadata


def test_create_pillar(db_session: Session):
    """Create a pillar and verify all fields are stored correctly."""
    pillar = ContentPillar(
        name="Nutrition",
        slug="nutrition",
        description="Dietary science and longevity nutrition",
        icon="leaf",
        display_order=1,
        is_active=True,
        org_id=None,
    )
    db_session.add(pillar)
    db_session.commit()
    db_session.refresh(pillar)

    assert pillar.id is not None
    assert pillar.name == "Nutrition"
    assert pillar.slug == "nutrition"
    assert pillar.description == "Dietary science and longevity nutrition"
    assert pillar.icon == "leaf"
    assert pillar.display_order == 1
    assert pillar.is_active is True
    assert pillar.org_id is None
    assert pillar.creation_date is not None
    assert pillar.update_date is not None


def test_slug_uniqueness_platform_wide(db_session: Session):
    """Two platform-wide pillars (org_id=NULL) with the same slug should conflict."""
    pillar1 = ContentPillar(name="Nutrition", slug="nutrition", display_order=0, is_active=True)
    db_session.add(pillar1)
    db_session.commit()

    pillar2 = ContentPillar(name="Nutrition Copy", slug="nutrition", display_order=1, is_active=True)
    db_session.add(pillar2)
    with pytest.raises(Exception):  # IntegrityError — partial unique index violation
        db_session.commit()


def test_slug_uniqueness_org_scoped(db_session: Session):
    """Two org-scoped pillars with the same org_id and slug should conflict."""
    pillar1 = ContentPillar(name="Movement", slug="movement", display_order=0, is_active=True, org_id=1)
    db_session.add(pillar1)
    db_session.commit()

    pillar2 = ContentPillar(name="Movement Dup", slug="movement", display_order=1, is_active=True, org_id=1)
    db_session.add(pillar2)
    with pytest.raises(Exception):  # IntegrityError — partial unique index violation
        db_session.commit()


def test_slug_same_across_orgs_allowed(db_session: Session):
    """Same slug for different org_id values should be allowed."""
    pillar1 = ContentPillar(name="Sleep", slug="sleep", display_order=0, is_active=True, org_id=1)
    db_session.add(pillar1)
    db_session.commit()

    pillar2 = ContentPillar(name="Sleep", slug="sleep", display_order=0, is_active=True, org_id=2)
    db_session.add(pillar2)
    db_session.commit()  # Should NOT raise

    results = db_session.exec(select(ContentPillar).where(ContentPillar.slug == "sleep")).all()
    assert len(results) == 2


def test_display_order_sorting(db_session: Session):
    """Pillars queried with ORDER BY display_order return in correct sequence."""
    pillars_data = [
        ContentPillar(name="Medicine", slug="medicine", display_order=3, is_active=True),
        ContentPillar(name="Nutrition", slug="nutrition", display_order=1, is_active=True),
        ContentPillar(name="Movement", slug="movement", display_order=2, is_active=True),
    ]
    for p in pillars_data:
        db_session.add(p)
    db_session.commit()

    results = db_session.exec(
        select(ContentPillar).order_by(ContentPillar.display_order)
    ).all()

    assert [r.slug for r in results] == ["nutrition", "movement", "medicine"]


def test_is_active_filtering(db_session: Session):
    """Only active pillars are returned when filtering by is_active=True."""
    active = ContentPillar(name="Sleep", slug="sleep", display_order=1, is_active=True)
    inactive = ContentPillar(name="Health Tech", slug="health-tech", display_order=2, is_active=False)
    db_session.add(active)
    db_session.add(inactive)
    db_session.commit()

    active_results = db_session.exec(
        select(ContentPillar).where(ContentPillar.is_active == True)  # noqa: E712
    ).all()
    assert len(active_results) == 1
    assert active_results[0].slug == "sleep"

    all_results = db_session.exec(select(ContentPillar)).all()
    assert len(all_results) == 2


def test_create_schema_validation():
    """ContentPillarCreate schema validates required fields and defaults."""
    create = ContentPillarCreate(
        name="Mental Health",
        slug="mental-health",
        description="Cognitive performance and stress resilience",
        icon="brain",
        display_order=4,
        is_active=True,
    )
    assert create.name == "Mental Health"
    assert create.slug == "mental-health"
    assert create.description == "Cognitive performance and stress resilience"
    assert create.icon == "brain"
    assert create.display_order == 4
    assert create.is_active is True
    assert create.org_id is None


def test_create_schema_defaults():
    """ContentPillarCreate uses sensible defaults when optional fields omitted."""
    create = ContentPillarCreate(name="Movement", slug="movement")
    assert create.display_order == 0
    assert create.is_active is True
    assert create.org_id is None
    assert create.description is None
    assert create.icon is None
