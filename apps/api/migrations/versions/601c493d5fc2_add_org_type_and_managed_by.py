"""add_org_type_and_managed_by

Revision ID: 601c493d5fc2
Revises: b779a507fe39
Create Date: 2026-03-20 17:32:35.273713

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = '601c493d5fc2'
down_revision: Union[str, None] = 'b779a507fe39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add org_type (nullable) and managed_by (non-nullable, default "limitless") to organization table
    op.add_column('organization', sa.Column('org_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('organization', sa.Column('managed_by', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='limitless'))
    # Remove server_default so future rows are handled by the application default
    op.alter_column('organization', 'managed_by', server_default=None)


def downgrade() -> None:
    op.drop_column('organization', 'managed_by')
    op.drop_column('organization', 'org_type')
