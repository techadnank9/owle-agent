import psycopg
from langgraph.checkpoint.postgres import PostgresSaver


def init_checkpointer(database_url: str) -> PostgresSaver:
    conn = psycopg.connect(database_url, autocommit=True)
    checkpointer = PostgresSaver(conn)
    checkpointer.setup()
    return checkpointer
