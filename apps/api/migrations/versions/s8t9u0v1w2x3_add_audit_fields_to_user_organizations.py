"""add_audit_fields_to_user_organizations

Revision ID: s8t9u0v1w2x3
Revises: 601c493d5fc2
Create Date: 2026-03-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 's8t9u0v1w2x3'
down_revision: Union[str, None] = '601c493d5fc2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'userorganization',
        sa.Column('updated_by', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_userorganization_updated_by_user',
        'userorganization',
        'user',
        ['updated_by'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_userorganization_updated_by_user',
        'userorganization',
        type_='foreignkey',
    )
    op.drop_column('userorganization', 'updated_by')
