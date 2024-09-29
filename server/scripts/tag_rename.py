import logging
from argparse import ArgumentParser

from sqlalchemy_filters import apply_filters

from sner.server.app import create_app
from sner.server.extensions import db
from sner.server.storage.models import Host, Service, Note, Vuln


def main():
    """main"""

    tag_old = 'x'
    tag_new = 'i:x'

    with create_app().app_context():
        for model in [Host, Service, Note, Vuln]:
            query = model.query
            for item in query.all():
                print(item, item.tags)
                item.tags = [tag_new if x == tag_old else x for x in item.tags]
                print(item, item.tags)

        db.session.commit()


if __name__ == '__main__':
    main()
