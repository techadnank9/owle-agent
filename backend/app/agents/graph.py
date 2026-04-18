from langgraph.graph import StateGraph, END

from .state import AgentState
from .nodes.web_enricher import web_enricher_node
from .nodes.account_selector import account_selector_node
from .nodes.stakeholder_mapper import stakeholder_mapper_node
from .nodes.strategy_decider import strategy_decider_node
from .nodes.outreach_generator import outreach_generator_node
from .nodes.reply_classifier import reply_classifier_node
from .nodes.meeting_booker import meeting_booker_node
from .nodes.learning_updater import learning_updater_node


def _route_after_strategy(state: AgentState) -> str:
    action = (state.get("strategy") or {}).get("action", "pursue")
    return "outreach_generator" if action == "pursue" else END


def build_outreach_graph(checkpointer):
    g = StateGraph(AgentState)

    g.add_node("web_enricher", web_enricher_node)
    g.add_node("account_selector", account_selector_node)
    g.add_node("stakeholder_mapper", stakeholder_mapper_node)
    g.add_node("strategy_decider", strategy_decider_node)
    g.add_node("outreach_generator", outreach_generator_node)

    g.set_entry_point("web_enricher")
    g.add_edge("web_enricher", "account_selector")
    g.add_edge("account_selector", "stakeholder_mapper")
    g.add_edge("stakeholder_mapper", "strategy_decider")
    g.add_conditional_edges("strategy_decider", _route_after_strategy)
    g.add_edge("outreach_generator", END)

    return g.compile(
        checkpointer=checkpointer,
        interrupt_after=["outreach_generator"],
    )


def build_reply_graph(checkpointer):
    g = StateGraph(AgentState)

    g.add_node("reply_classifier", reply_classifier_node)
    g.add_node("meeting_booker", meeting_booker_node)
    g.add_node("learning_updater", learning_updater_node)

    g.set_entry_point("reply_classifier")
    g.add_edge("reply_classifier", "meeting_booker")
    g.add_edge("meeting_booker", "learning_updater")
    g.add_edge("learning_updater", END)

    return g.compile(checkpointer=checkpointer)


def build_graph(checkpointer):
    return build_outreach_graph(checkpointer)
