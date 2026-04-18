from langgraph.checkpoint.postgres import PostgresSaver


def init_checkpointer(database_url: str) -> PostgresSaver:
    checkpointer = PostgresSaver.from_conn_string(database_url)
    checkpointer.setup()
    return checkpointer
