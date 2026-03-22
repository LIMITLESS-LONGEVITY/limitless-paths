"""add_article_blocks

Revision ID: t9u0v1w2x3y4
Revises: 02409bad14b0
Create Date: 2026-03-22 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

revision: str = 't9u0v1w2x3y4'
down_revision: Union[str, None] = '02409bad14b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('block', 'course_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('block', 'activity_id', existing_type=sa.Integer(), nullable=True)
    op.add_column(
        'block',
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=True),
    )
    op.create_index('ix_block_article_id', 'block', ['article_id'])


def downgrade() -> None:
    op.drop_index('ix_block_article_id', table_name='block')
    op.drop_column('block', 'article_id')
    op.alter_column('block', 'activity_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('block', 'course_id', existing_type=sa.Integer(), nullable=False)
