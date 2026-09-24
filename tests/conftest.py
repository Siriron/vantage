"""Direct Mode stdin compatibility for Faultline's pinned runner.

The stable genlayer-test 0.29.2 loader needs an fd-0 encoded message context
for this runner. A pipe supplies that context without changing contract
behavior or test assertions.
"""

import os

from gltest.direct import loader


def _inject_message_to_fd0(vm):
    try:
        from genlayer.py import calldata
        from genlayer.py.types import Address
    except ImportError:
        return

    def address(value):
        return Address(value) if isinstance(value, bytes) else value

    message_data = {
        "contract_address": address(vm._contract_address),
        "sender_address": address(vm.sender),
        "origin_address": address(vm.origin),
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)
    read_fd, write_fd = os.pipe()
    try:
        os.write(write_fd, encoded)
    finally:
        os.close(write_fd)

    vm._original_stdin_fd = os.dup(0)
    try:
        os.dup2(read_fd, 0)
    finally:
        os.close(read_fd)


loader._inject_message_to_fd0 = _inject_message_to_fd0


def _patch_datetime_refresh():
    """
    genlayer-test 0.29.2's VMContext._refresh_gl_message() (see
    gltest/direct/vm.py) refreshes sender_address/origin_address/value on
    every call so a test can change vm.sender between calls on an
    already-deployed contract, but it does NOT refresh "datetime" — so
    gl.message_raw["datetime"] stays frozen at whatever it was when the
    contract module was first imported (deploy time), even after a later
    vm.warp() call. Confirmed by reading vm.py directly: _refresh_gl_message
    sets sender_address/origin_address and rebuilds gl.message, but never
    touches the "datetime" key. This silently breaks every multi-call test
    that warps time after deploy (e.g. testing a deadline that must pass
    between two calls on the same contract instance) unless patched here.
    Wrap the existing refresh so datetime is kept in sync the same way
    sender/origin already are.
    """
    import sys
    from gltest.direct.vm import VMContext

    original_refresh = VMContext._refresh_gl_message

    def _patched_refresh(self):
        original_refresh(self)
        if 'genlayer.gl' not in sys.modules:
            return
        gl = sys.modules['genlayer.gl']
        if hasattr(gl, 'message_raw') and gl.message_raw is not None:
            gl.message_raw['datetime'] = self._datetime

    VMContext._refresh_gl_message = _patched_refresh


_patch_datetime_refresh()
