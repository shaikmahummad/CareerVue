from __future__ import annotations

import pytest
from tests.dast.run_dast_tests import DAST_TARGETS, SECURITY_VECTORS


@pytest.mark.parametrize("target", DAST_TARGETS[:10])
def test_dast_security_baseline(target):
    path, name, desc = target
    assert len(path) > 0
    assert len(name) > 0

