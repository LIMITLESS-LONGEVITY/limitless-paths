"""change_related_articles_to_jsonb

Revision ID: 2cf56d3b1ed5
Revises: f5ce43e95ed2
Create Date: 2026-03-20 20:58:46.372078

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlalchemy.dialects.postgresql
import sqlmodel # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '2cf56d3b1ed5'
down_revision: Union[str, None] = 'f5ce43e95ed2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'course', 'related_articles',
        existing_type=sa.JSON(),
        type_=sa.dialects.postgresql.JSONB(),
        existing_nullable=True,
        postgresql_using='related_articles::jsonb',
    )


def downgrade() -> None:
    op.alter_column(
        'course', 'related_articles',
        existing_type=sa.dialects.postgresql.JSONB(),
        type_=sa.JSON(),
        existing_nullable=True,
    )
