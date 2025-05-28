"""
Regenerate internal ssl certificates for tests
"""

# PEP 773 dependencies
# /// script
# dependencies = [
#   "certipy",
# ]
# ///

import asyncio
import shutil
import ssl
from pathlib import Path

from certipy import Certipy

ssl_dir = Path(__file__).parent.resolve() / "ssl"
port = 12345


def make_certs():
    """Create certificates for proxy client and ssl backend"""
    # start fresh
    shutil.rmtree(ssl_dir)
    alt_names = [
        "IP:127.0.0.1",
        "IP:0:0:0:0:0:0:0:1",
        "DNS:localhost",
    ]
    certipy = Certipy(store_dir=ssl_dir)
    _trust_bundles = certipy.trust_from_graph({
        "backend-ca": ["proxy-client-ca"],
        "proxy-client-ca": ["backend-ca"],
    })
    for name in ("backend", "proxy-client"):
        certipy.create_signed_pair(
            name, f"{name}-ca", alt_names=alt_names
        )



async def client_connected(reader, writer):
    """Callback for ssl server"""
    print("client connected")
    msg = await reader.read(5)
    print("server received", msg.decode())
    writer.write(b"pong")


async def ssl_backend():
    """Run a test ssl server"""
    ssl_context = ssl.create_default_context(
        ssl.Purpose.CLIENT_AUTH, cafile=ssl_dir / "backend-ca_trust.crt"
    )
    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.load_default_certs()
    ssl_context.load_cert_chain(
        ssl_dir / "backend/backend.crt", ssl_dir / "backend/backend.key"
    )
    await asyncio.start_server(
        client_connected, host="localhost", port=port, ssl=ssl_context
    )


async def ssl_client():
    """Run a test ssl client"""
    ssl_context = ssl.create_default_context(
        ssl.Purpose.SERVER_AUTH, cafile=ssl_dir / "proxy-client-ca_trust.crt"
    )
    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.load_default_certs()
    ssl_context.check_hostname = True
    ssl_context.load_cert_chain(
        ssl_dir / "proxy-client/proxy-client.crt",
        ssl_dir / "proxy-client/proxy-client.key",
    )
    reader, writer = await asyncio.open_connection("localhost", port, ssl=ssl_context)
    writer.write(b"ping")
    msg = await reader.read(5)
    print("client received", msg.decode())


async def main():
    # make the certs
    print(f"Making internal ssl certificates in {ssl_dir}")
    make_certs()
    print("Testing internal ssl setup")
    await ssl_backend()
    await ssl_client()
    print("OK")


if __name__ == "__main__":
    asyncio.run(main())
