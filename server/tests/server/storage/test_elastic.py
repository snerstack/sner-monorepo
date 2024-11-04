# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.elastic tests
"""

from unittest.mock import Mock, patch

import sner.server.storage.elastic
from sner.server.storage.elastic import BulkIndexer


def test_bulk_indexing():
    """test bulk indexing"""

    es_bulk_mock = Mock(return_value=(1, []))

    with patch.object(sner.server.storage.elastic, 'es_bulk', es_bulk_mock):
        indexer = BulkIndexer('http://dummy:80', None, None, 1)

        indexer.index('test-index', '1', {'dummy': 1})
        indexer.index('test-index', '2', {'dummy': 2})
        es_bulk_mock.assert_called_once()
