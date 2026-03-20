"""add_articles_and_versions

Revision ID: df29fd15dbfd
Revises: c3543ad1fa5a
Create Date: 2026-03-20 20:05:49.428250

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'df29fd15dbfd'
down_revision: Union[str, None] = 'c3543ad1fa5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'articles',
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('summary', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('content', sa.JSON(), nullable=True),
        sa.Column('featured_image', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('pillar_id', sa.Integer(), nullable=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=True),
        sa.Column('review_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('review_notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('published_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('related_courses', sa.JSON(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('update_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['user.id']),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id']),
        sa.ForeignKeyConstraint(['pillar_id'], ['content_pillars.id']),
        sa.ForeignKeyConstraint(['reviewer_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', 'org_id', name='uq_article_slug_per_org'),
    )
    op.create_index(
        op.f('ix_articles_article_uuid'), 'articles', ['article_uuid'], unique=True
    )
    op.create_table(
        'article_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('content', sa.JSON(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('article_versions')
    op.drop_index(op.f('ix_articles_article_uuid'), table_name='articles')
    op.drop_table('articles')
