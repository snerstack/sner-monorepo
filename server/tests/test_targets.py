# This file is part of SNER project, see the LICENSE.txt file.
"""
sner.targets tests
"""

from ipaddress import ip_address

from sner.targets import TargetManager, SixenumTarget


def test_manager():
    """test manager"""

    assert isinstance(TargetManager.from_str("sixenum,::1"), SixenumTarget)


def test_sixenumtarget_boundaries():
    """check sixenum_target_boundaries"""

    assert SixenumTarget("::1").boundaries() == (ip_address("::1"), ip_address("::1"))
    assert SixenumTarget("::1-fffa").boundaries() == (ip_address("::1"), ip_address("::fffa"))
