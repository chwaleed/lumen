"""rename and change column type

Revision ID: 0524db2320ab
Revises: 20260409_0002
Create Date: 2026-04-17 21:26:30.391746
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = '0524db2320ab'
down_revision = '20260409_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('file_entries', 'content', new_column_name="file_url")
    
    op.alter_column('file_entries', 'file_url', existing_type= sa.Text(), type_=sa.VARCHAR(length=255))
    
    pass


def downgrade() -> None:
    
    op.alter_column(
        'file_entries',
        'file_url',
        existing_type=sa.VARCHAR(length=255),
        type_=sa.Text()
    )
    
    op.alter_column(
        'file_entries',
        'file_url',
        new_column_name='content'
    )
    pass
