"""
Org Admin Service
Provides stats and user-search utilities used by superadmin org-admin endpoints.
"""
from typing import List, Optional
from sqlmodel import Session, select, func

from src.db.organizations import Organization
from src.db.user_organizations import UserOrganization
from src.db.articles import Article
from src.db.courses.courses import Course
from src.db.users import User


async def get_org_stats(org_id: int, db_session: Session) -> dict:
    """
    Return aggregate counts for a given organization.

    Returns:
        {
            "member_count": int,
            "article_count": int,
            "course_count": int,
            "created": str,
        }
    """
    # Member count
    member_count = db_session.exec(
        select(func.count(UserOrganization.id)).where(UserOrganization.org_id == org_id)
    ).one()

    # Article count
    article_count = db_session.exec(
        select(func.count(Article.id)).where(Article.org_id == org_id)
    ).one()

    # Course count
    course_count = db_session.exec(
        select(func.count(Course.id)).where(Course.org_id == org_id)
    ).one()

    # Creation date from Organization table
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    created = org.creation_date if org else ""

    return {
        "member_count": member_count or 0,
        "article_count": article_count or 0,
        "course_count": course_count or 0,
        "created": created,
    }


async def search_users_by_email(
    query: str,
    db_session: Session,
    limit: int = 10,
) -> List[dict]:
    """
    Case-insensitive email search across all users.

    Returns list of {id, email, first_name, last_name}.
    """
    users = db_session.exec(
        select(User)
        .where(User.email.ilike(f"%{query}%"))
        .limit(limit)
    ).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "first_name": getattr(u, "first_name", "") or "",
            "last_name": getattr(u, "last_name", "") or "",
        }
        for u in users
    ]
