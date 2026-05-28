"""WebSocket → SSH relay for branch MikroTik routers via paramiko."""
import asyncio
import paramiko
from config import HQ_API

SSH_USER = "admin"
SSH_PASSWORD = HQ_API["password"]


async def branch_shell_proxy(ws, branch_id: int) -> None:
    host = f"10.255.255.{branch_id}"
    loop = asyncio.get_event_loop()

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        await loop.run_in_executor(None, lambda: ssh.connect(
            host,
            username=SSH_USER,
            password=SSH_PASSWORD,
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
            banner_timeout=10,
        ))
    except Exception as e:
        await ws.send_bytes(f"\r\n\x1b[31m[SSH error: {e}]\x1b[0m\r\n".encode())
        return

    channel = None
    try:
        channel = await loop.run_in_executor(None, lambda: _open_shell(ssh))
        if channel is None:
            await ws.send_bytes(b"\r\n\x1b[31m[Failed to open PTY]\x1b[0m\r\n")
            return
        await _relay(ws, channel, loop)
    except Exception as e:
        print(f"[shell_proxy] relay error: {e}")
    finally:
        if channel:
            channel.close()
        ssh.close()


def _open_shell(ssh: paramiko.SSHClient):
    try:
        ch = ssh.invoke_shell(term="xterm-256color", width=200, height=50)
        ch.setblocking(False)
        return ch
    except Exception as e:
        print(f"[shell_proxy] open_shell error: {e}")
        return None


async def _relay(ws, channel: paramiko.Channel, loop: asyncio.AbstractEventLoop) -> None:
    async def ws_to_ssh():
        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                data = msg.get("bytes") or (msg.get("text") or "").encode("utf-8")
                if data:
                    await loop.run_in_executor(None, channel.sendall, data)
        except Exception:
            pass

    async def ssh_to_ws():
        try:
            while not channel.closed:
                ready = await loop.run_in_executor(None, channel.recv_ready)
                if ready:
                    data = await loop.run_in_executor(None, channel.recv, 4096)
                    if not data:
                        break
                    await ws.send_bytes(data)
                elif await loop.run_in_executor(None, channel.exit_status_ready):
                    break
                else:
                    await asyncio.sleep(0.04)
        except Exception:
            pass

    ws_task = asyncio.create_task(ws_to_ssh())
    ssh_task = asyncio.create_task(ssh_to_ws())
    done, pending = await asyncio.wait([ws_task, ssh_task], return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass
