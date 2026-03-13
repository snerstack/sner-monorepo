"""add auror.testssl queue

Revision ID: d706f43147e4
Revises: 8a837b9c8998
Create Date: 2025-08-13 20:24:26.999991

"""

import sqlalchemy as sa
import yaml
from alembic import op

# revision identifiers, used by Alembic.
revision = "d706f43147e4"
down_revision = "8a837b9c8998"
branch_labels = None
depends_on = None


SCHEDULER_LOCK_NUMBER_REVd706f43147e4 = 1


def upgrade():
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO queue
            (name, config, group_size, priority, active, reqs)
            VALUES
            ('auror.testssl', 'module: auror_testssl', 1, 10, true, '{"auror"}'::text[])
            ON CONFLICT (name) DO NOTHING
            """
        )
    )


def downgrade():
    conn = op.get_bind()
    conn.execute(
        sa.text("""SELECT pg_advisory_lock(:locknum)"""),
        {"locknum": SCHEDULER_LOCK_NUMBER_REVd706f43147e4},
    )

    # won't delete queue with any workload (mainly because readynet and heatmap management)
    try:
        targets_count = conn.execute(
            sa.text("""SELECT count(*) FROM target AS t JOIN queue AS q ON t.queue_id = q.id WHERE q.name = 'auror.testssl'""")
        ).scalar()
        if targets_count > 0:
            raise RuntimeError("cannot delete 'auror_testssl' queue, targets found")

        jobs_count = conn.execute(
            sa.text("""SELECT count(*) FROM job AS j JOIN queue AS q ON j.queue_id = q.id WHERE q.name = 'auror.testssl'""")
        ).scalar()
        if jobs_count > 0:
            raise RuntimeError("cannot delete 'auror_testssl' queue, jobs found")

        conn.execute(sa.text("""DELETE FROM queue WHERE name = 'auror.testssl'"""))

    finally:
        conn.execute(
            sa.text("""SELECT pg_advisory_unlock(:locknum)"""),
            {"locknum": SCHEDULER_LOCK_NUMBER_REVd706f43147e4},
        )
