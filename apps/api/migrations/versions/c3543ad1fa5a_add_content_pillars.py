"""add_content_pillars

Revision ID: c3543ad1fa5a
Revises: s8t9u0v1w2x3
Create Date: 2026-03-20 20:02:22.347068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'c3543ad1fa5a'
down_revision: Union[str, None] = 's8t9u0v1w2x3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'content_pillars',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('icon', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('update_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    # Non-unique index on slug for fast lookups
    op.create_index(op.f('ix_content_pillars_slug'), 'content_pillars', ['slug'], unique=False)
    # Partial unique index: platform-wide pillars (org_id IS NULL) must have unique slugs
    op.create_index(
        'ix_content_pillars_slug_platform',
        'content_pillars',
        ['slug'],
        unique=True,
        postgresql_where=sa.text('org_id IS NULL'),
    )
    # Partial unique index: org-scoped pillars must have unique slugs within the same org
    op.create_index(
        'ix_content_pillars_slug_per_org',
        'content_pillars',
        ['slug', 'org_id'],
        unique=True,
        postgresql_where=sa.text('org_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('ix_content_pillars_slug_per_org', table_name='content_pillars')
    op.drop_index('ix_content_pillars_slug_platform', table_name='content_pillars')
    op.drop_index(op.f('ix_content_pillars_slug'), table_name='content_pillars')
    op.drop_table('content_pillars')
