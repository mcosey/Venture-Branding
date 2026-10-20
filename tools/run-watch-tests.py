"""Run the existing Watch regression tests with outbound sockets blocked."""
from pathlib import Path
import socket
import sys
import unittest

def blocked(*args, **kwargs):
    raise RuntimeError('External network is forbidden in offline regression tests.')

socket.create_connection = blocked
socket.socket.connect = blocked
socket.socket.connect_ex = blocked
suite = unittest.defaultTestLoader.discover(str(Path(__file__).parent / 'watch'), pattern='test_*.py')
sys.exit(0 if unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful() else 1)
