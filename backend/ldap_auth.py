"""AD LDAP bind authentication — validates credentials against luch.local DCs."""
from config import AD


def ldap_auth(username: str, password: str) -> bool:
    """Try SIMPLE bind (UPN) against each DC in order. Returns True on first success."""
    if not username or not password:
        return False
    try:
        from ldap3 import Server, Connection, SIMPLE
    except ImportError:
        print("[ldap] ldap3 not installed — skipping AD auth")
        return False

    upn = f"{username}@{AD['domain']}"
    for dc in AD["servers"]:
        try:
            srv = Server(dc, port=389, connect_timeout=4)
            conn = Connection(srv, user=upn, password=password, authentication=SIMPLE, auto_bind=True)
            conn.unbind()
            return True
        except Exception as e:
            print(f"[ldap] {dc}: {e}")
            continue
    return False
