"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-08 16:40:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.db.base import Base
import app.models  # ensure all models are registered

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
