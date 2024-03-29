"""init schema v0.6.2

Revision ID: bb0d676c28c7
Revises: 
Create Date: 2022-05-26 19:28:14.874287

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'bb0d676c28c7'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('excl',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('family', sa.Enum('NETWORK', 'REGEX', name='exclfamily'), nullable=False),
    sa.Column('value', sa.Text(), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('heatmap',
    sa.Column('hashval', sa.String(), nullable=False),
    sa.Column('count', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('hashval', name='heatmap_pkey')
    )
    op.create_table('host',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('address', postgresql.INET(), nullable=False),
    sa.Column('hostname', sa.String(length=256), nullable=True),
    sa.Column('os', sa.Text(), nullable=True),
    sa.Column('tags', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created', sa.DateTime(), nullable=True),
    sa.Column('modified', sa.DateTime(), nullable=True),
    sa.Column('rescan_time', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('queue',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    sa.Column('config', sa.Text(), nullable=True),
    sa.Column('group_size', sa.Integer(), nullable=False),
    sa.Column('priority', sa.Integer(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('reqs', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('user',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=250), nullable=False),
    sa.Column('password', sa.String(length=250), nullable=True),
    sa.Column('email', sa.String(length=250), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('roles', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('apikey', sa.String(length=250), nullable=True),
    sa.Column('totp', sa.String(length=32), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('username')
    )
    op.create_table('job',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('queue_id', sa.Integer(), nullable=True),
    sa.Column('assignment', sa.Text(), nullable=False),
    sa.Column('retval', sa.Integer(), nullable=True),
    sa.Column('time_start', sa.DateTime(), nullable=True),
    sa.Column('time_end', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['queue_id'], ['queue.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('readynet',
    sa.Column('queue_id', sa.Integer(), nullable=False),
    sa.Column('hashval', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['queue_id'], ['queue.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('queue_id', 'hashval', name='readynet_pkey')
    )
    op.create_index('readynet_hashval', 'readynet', ['hashval'], unique=False)
    op.create_table('service',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('host_id', sa.Integer(), nullable=False),
    sa.Column('proto', sa.String(length=250), nullable=False),
    sa.Column('port', sa.Integer(), nullable=False),
    sa.Column('state', sa.String(length=250), nullable=True),
    sa.Column('name', sa.String(length=250), nullable=True),
    sa.Column('info', sa.Text(), nullable=True),
    sa.Column('tags', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created', sa.DateTime(), nullable=True),
    sa.Column('modified', sa.DateTime(), nullable=True),
    sa.Column('rescan_time', sa.DateTime(), nullable=True),
    sa.Column('import_time', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['host_id'], ['host.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('target',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('queue_id', sa.Integer(), nullable=False),
    sa.Column('target', sa.Text(), nullable=False),
    sa.Column('hashval', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['queue_id'], ['queue.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('target_hashval', 'target', ['hashval'], unique=False)
    op.create_index('target_queueid_hashval', 'target', ['queue_id', 'hashval'], unique=False)
    op.create_table('webauthn_credential',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('user_handle', sa.String(length=64), nullable=False),
    sa.Column('credential_data', sa.LargeBinary(), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=True),
    sa.Column('registered', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('note',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('host_id', sa.Integer(), nullable=False),
    sa.Column('service_id', sa.Integer(), nullable=True),
    sa.Column('via_target', sa.String(length=250), nullable=True),
    sa.Column('xtype', sa.String(length=250), nullable=True),
    sa.Column('data', sa.Text(), nullable=True),
    sa.Column('tags', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created', sa.DateTime(), nullable=True),
    sa.Column('modified', sa.DateTime(), nullable=True),
    sa.Column('import_time', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['host_id'], ['host.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['service_id'], ['service.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('vuln',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('host_id', sa.Integer(), nullable=False),
    sa.Column('service_id', sa.Integer(), nullable=True),
    sa.Column('via_target', sa.String(length=250), nullable=True),
    sa.Column('name', sa.String(length=1000), nullable=False),
    sa.Column('xtype', sa.String(length=250), nullable=True),
    sa.Column('severity', sa.Enum('UNKNOWN', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='severityenum'), nullable=False),
    sa.Column('descr', sa.Text(), nullable=True),
    sa.Column('data', sa.Text(), nullable=True),
    sa.Column('refs', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('tags', postgresql.ARRAY(sa.String(), dimensions=1), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created', sa.DateTime(), nullable=True),
    sa.Column('modified', sa.DateTime(), nullable=True),
    sa.Column('rescan_time', sa.DateTime(), nullable=True),
    sa.Column('import_time', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['host_id'], ['host.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['service_id'], ['service.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('vuln')
    op.drop_table('note')
    op.drop_table('webauthn_credential')
    op.drop_index('target_queueid_hashval', table_name='target')
    op.drop_index('target_hashval', table_name='target')
    op.drop_table('target')
    op.drop_table('service')
    op.drop_index('readynet_hashval', table_name='readynet')
    op.drop_table('readynet')
    op.drop_table('job')
    op.drop_table('user')
    op.drop_table('queue')
    op.drop_table('host')
    op.drop_table('heatmap')
    op.drop_table('excl')
    sa.Enum(name='exclfamily').drop(op.get_bind())
    sa.Enum(name='severityenum').drop(op.get_bind())
    # ### end Alembic commands ###
