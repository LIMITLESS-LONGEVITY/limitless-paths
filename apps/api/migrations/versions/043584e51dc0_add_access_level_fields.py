"""add_access_level_fields

Revision ID: 043584e51dc0
Revises: 2cf56d3b1ed5
Create Date: 2026-03-20 21:33:46.417909

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = '043584e51dc0'
down_revision: Union[str, None] = '2cf56d3b1ed5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add access_level to articles (default "free" for all existing rows)
    op.add_column(
        'articles',
        sa.Column(
            'access_level',
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default='free',
        ),
    )

    # Add default_access_level to content_pillars (default "free")
    op.add_column(
        'content_pillars',
        sa.Column(
            'default_access_level',
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default='free',
        ),
    )

    # Add content_access_level to organization (default "free")
    op.add_column(
        'organization',
        sa.Column(
            'content_access_level',
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default='free',
        ),
    )


def downgrade() -> None:
    op.drop_column('organization', 'content_access_level')
    op.drop_column('content_pillars', 'default_access_level')
    op.drop_column('articles', 'access_level')
