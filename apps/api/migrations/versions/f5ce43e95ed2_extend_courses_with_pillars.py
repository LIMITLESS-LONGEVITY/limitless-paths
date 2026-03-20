"""extend_courses_with_pillars

Revision ID: f5ce43e95ed2
Revises: df29fd15dbfd
Create Date: 2026-03-20 20:08:53.122028

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'f5ce43e95ed2'
down_revision: Union[str, None] = 'df29fd15dbfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add pillar_id and related_articles columns to course table
    op.add_column('course', sa.Column('pillar_id', sa.Integer(), nullable=True))
    op.add_column('course', sa.Column('related_articles', sa.JSON(), nullable=True))
    op.create_foreign_key(
        'fk_course_pillar_id',
        'course', 'content_pillars',
        ['pillar_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_course_pillar_id', 'course', type_='foreignkey')
    op.drop_column('course', 'related_articles')
    op.drop_column('course', 'pillar_id')
