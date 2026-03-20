"""add_user_memberships

Revision ID: b779a507fe39
Revises: 9255242fd04b
Create Date: 2026-03-20 17:29:06.439051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'b779a507fe39'
down_revision: Union[str, None] = '9255242fd04b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_memberships',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tier_id', sa.Integer(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('source', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('started_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('expires_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('update_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['tier_id'], ['membership_tiers.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_user_memberships_user_id'),
        'user_memberships',
        ['user_id'],
        unique=False,
    )
    # Partial unique index: only one active membership per user
    op.create_index(
        'ix_one_active_membership_per_user',
        'user_memberships',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index('ix_one_active_membership_per_user', table_name='user_memberships')
    op.drop_index(op.f('ix_user_memberships_user_id'), table_name='user_memberships')
    op.drop_table('user_memberships')
