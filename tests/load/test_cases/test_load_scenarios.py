from __future__ import annotations

import pytest
from tests.load.run_load_tests import LOAD_TARGETS, SCENARIOS


@pytest.mark.parametrize("target", LOAD_TARGETS[:10])
def test_smoke_load_scenario(target):
    path, name, desc = target
    assert len(path) > 0
    assert len(name) > 0

