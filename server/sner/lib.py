# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
shared functions
"""

import re
import os
import signal
from abc import ABC, abstractmethod
from contextlib import contextmanager
from ipaddress import ip_address
from pathlib import Path
from zipfile import ZipFile

import magic
import yaml


def load_yaml(filename):
    """load yaml from file, silence file not found"""

    if filename and os.path.exists(filename):
        config = yaml.safe_load(Path(filename).read_text(encoding='utf-8'))
        return config or {}
    return {}


def is_zip(path):
    """detect if path is zip archive"""
    return magic.from_file(path, mime=True) == 'application/zip'


def file_from_zip(zippath, filename):
    """extract file data from zipfile"""

    with ZipFile(zippath) as ftmp_zip:
        with ftmp_zip.open(filename) as ftmp:
            return ftmp.read()


def files_from_zip(zippath, regexp):
    """extract files data from zipfile by filename regexp"""

    matcher = re.compile(regexp)
    with ZipFile(zippath) as ftmp_zip:
        for filename in ftmp_zip.namelist():
            if matcher.match(filename):
                yield file_from_zip(zippath, filename)


def uri_ipv6_address(value):
    """format ipv6 address to brackets"""
    return f"[{value}]"


class TerminateContextRunner(ABC):
    """terminate context parent"""

    def __init__(self):
        self.original_signal_handlers = {}

    @contextmanager
    def terminate_context(self):
        """terminate context manager; should restore handlers despite of underlying code exceptions"""

        self.original_signal_handlers[signal.SIGTERM] = signal.signal(signal.SIGTERM, self.terminate)
        self.original_signal_handlers[signal.SIGINT] = signal.signal(signal.SIGINT, self.terminate)
        try:
            yield
        finally:
            signal.signal(signal.SIGINT, self.original_signal_handlers[signal.SIGINT])
            signal.signal(signal.SIGTERM, self.original_signal_handlers[signal.SIGTERM])

    @abstractmethod
    def terminate(self, signum=None, frame=None):
        """terminate implementation"""


def get_nested_key(data, *keys):
    """get nested key from dict"""

    try:
        for key in keys:
            data = data[key]
        return data
    except KeyError:
        return None


def is_address(addr):
    """is_address helper"""

    try:
        ip_address(addr)
        return True
    except ValueError:
        return False


def is_ipv6_address(addr):
    """ipv6 address helper"""

    try:
        return ip_address(addr).version == 6
    except ValueError:
        return False
