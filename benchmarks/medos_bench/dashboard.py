"""CSV → marketing-ready HTML dashboard.

Produces a single self-contained HTML file (Plotly bundled inline) that
can be opened locally, attached to a deck, or hosted as a static page.
Designed to surface MedOS's structural wins (locale, allergy, brevity,
personalization) prominently in the headline chart while still showing
the full per-evaluator detail for credibility.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots


_SYSTEM_COLORS = {"medos": "#7c3aed", "chatgpt": "#94a3b8"}
_SYSTEM_LABELS = {"medos": "MedOS", "chatgpt": "ChatGPT"}


def _scorecard(df: pd.DataFrame) -> pd.DataFrame:
    """Mean score per (evaluator, system). The headline table."""
    return (
        df.groupby(["evaluator", "system"])["score"]
        .mean()
        .unstack("system")
        .fillna(0)
        .round(3)
        .sort_index()
    )


def _per_category(df: pd.DataFrame) -> pd.DataFrame:
    """Overall pass-rate per (category, system) — the marketing chart."""
    return (
        df.groupby(["category", "system"])["score"]
        .mean()
        .unstack("system")
        .fillna(0)
        .round(3)
    )


def _headline_numbers(df: pd.DataFrame) -> dict[str, float]:
    """Three numbers at the top of the page."""
    overall = df.groupby("system")["score"].mean().to_dict()
    medos = overall.get("medos", 0.0)
    chatgpt = overall.get("chatgpt", 0.0)
    return {
        "medos_overall": medos,
        "chatgpt_overall": chatgpt,
        "delta_points": (medos - chatgpt) * 100,
    }


def _per_category_bar(df: pd.DataFrame) -> go.Figure:
    """Side-by-side bars per category. The single most important chart."""
    pivot = _per_category(df).reset_index().melt(
        id_vars="category", var_name="system", value_name="score",
    )
    pivot["score_pct"] = (pivot["score"] * 100).round(1)
    pivot["system_label"] = pivot["system"].map(_SYSTEM_LABELS).fillna(pivot["system"])
    fig = px.bar(
        pivot,
        x="category",
        y="score_pct",
        color="system_label",
        barmode="group",
        text="score_pct",
        color_discrete_map={
            _SYSTEM_LABELS["medos"]: _SYSTEM_COLORS["medos"],
            _SYSTEM_LABELS["chatgpt"]: _SYSTEM_COLORS["chatgpt"],
        },
        labels={"score_pct": "Score (%)", "category": "", "system_label": ""},
    )
    fig.update_traces(texttemplate="%{text}%", textposition="outside", cliponaxis=False)
    fig.update_layout(
        title="<b>Score by case category</b>",
        title_x=0,
        yaxis_range=[0, 110],
        plot_bgcolor="white",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=20, t=80, b=80),
        height=460,
    )
    fig.update_xaxes(tickangle=-20)
    return fig


def _per_evaluator_bar(df: pd.DataFrame) -> go.Figure:
    """Detail view: every evaluator, side-by-side."""
    pivot = _scorecard(df).reset_index().melt(
        id_vars="evaluator", var_name="system", value_name="score",
    )
    pivot["score_pct"] = (pivot["score"] * 100).round(1)
    pivot["system_label"] = pivot["system"].map(_SYSTEM_LABELS).fillna(pivot["system"])
    fig = px.bar(
        pivot,
        x="evaluator",
        y="score_pct",
        color="system_label",
        barmode="group",
        text="score_pct",
        color_discrete_map={
            _SYSTEM_LABELS["medos"]: _SYSTEM_COLORS["medos"],
            _SYSTEM_LABELS["chatgpt"]: _SYSTEM_COLORS["chatgpt"],
        },
        labels={"score_pct": "Score (%)", "evaluator": "", "system_label": ""},
    )
    fig.update_traces(texttemplate="%{text}%", textposition="outside", cliponaxis=False)
    fig.update_layout(
        title="<b>Score by quality criterion</b>",
        title_x=0,
        yaxis_range=[0, 110],
        plot_bgcolor="white",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=20, t=80, b=80),
        height=460,
    )
    fig.update_xaxes(tickangle=-20)
    return fig


def _win_rate_pie(df: pd.DataFrame) -> go.Figure:
    """Per-case head-to-head: which system scored higher?"""
    per_case = df.groupby(["case_id", "system"])["score"].mean().unstack("system").fillna(0)
    if "medos" not in per_case.columns or "chatgpt" not in per_case.columns:
        per_case["medos"] = per_case.get("medos", 0)
        per_case["chatgpt"] = per_case.get("chatgpt", 0)
    medos_wins = int((per_case["medos"] > per_case["chatgpt"]).sum())
    chatgpt_wins = int((per_case["chatgpt"] > per_case["medos"]).sum())
    ties = int((per_case["medos"] == per_case["chatgpt"]).sum())
    fig = go.Figure(
        go.Pie(
            labels=["MedOS wins", "Tie", "ChatGPT wins"],
            values=[medos_wins, ties, chatgpt_wins],
            marker=dict(colors=[_SYSTEM_COLORS["medos"], "#cbd5e1", _SYSTEM_COLORS["chatgpt"]]),
            hole=0.55,
            textinfo="label+value",
        )
    )
    fig.update_layout(
        title="<b>Head-to-head case wins</b>",
        title_x=0,
        showlegend=False,
        margin=dict(l=20, r=20, t=60, b=20),
        height=380,
        annotations=[
            dict(
                text=f"<b>{medos_wins}</b><br><span style='font-size:14px'>MedOS wins</span>",
                showarrow=False,
                font=dict(size=24, color=_SYSTEM_COLORS["medos"]),
            )
        ],
    )
    return fig


def _latency_box(df: pd.DataFrame) -> go.Figure:
    """Latency distribution. The honest one: we report it even if we're slower."""
    sub = df.drop_duplicates(["case_id", "system", "turn_idx"])[["system", "latency_ms"]].copy()
    sub["system_label"] = sub["system"].map(_SYSTEM_LABELS).fillna(sub["system"])
    fig = px.box(
        sub,
        x="system_label",
        y="latency_ms",
        color="system_label",
        points="all",
        color_discrete_map={
            _SYSTEM_LABELS["medos"]: _SYSTEM_COLORS["medos"],
            _SYSTEM_LABELS["chatgpt"]: _SYSTEM_COLORS["chatgpt"],
        },
        labels={"latency_ms": "Latency (ms)", "system_label": ""},
    )
    fig.update_layout(
        title="<b>Response latency</b>",
        title_x=0,
        showlegend=False,
        plot_bgcolor="white",
        margin=dict(l=40, r=20, t=60, b=40),
        height=380,
    )
    return fig


def _failures_table(df: pd.DataFrame) -> str:
    """List of the most diagnostic failures — for the appendix.

    Sort so ChatGPT failures come first (the wins we want to highlight),
    then MedOS failures (transparency builds trust).
    """
    failed = df[df["passed"] == 0].copy()
    if failed.empty:
        return "<p><em>No failures recorded — every check passed.</em></p>"
    failed = failed.sort_values(["system", "evaluator", "case_id"])
    cols = ["system", "case_id", "category", "evaluator", "reason"]
    failed = failed[cols].head(40)  # Cap so the appendix stays scannable.
    return failed.to_html(
        index=False,
        classes="failures",
        border=0,
        escape=True,
    )


def build_dashboard(csv_path: Path, output_html: Path, title: str = "MedOS vs ChatGPT — Medical Benchmark") -> None:
    df = pd.read_csv(csv_path)
    if df.empty:
        raise SystemExit(f"{csv_path} is empty — run the benchmark first.")

    headline = _headline_numbers(df)
    fig_categories = _per_category_bar(df)
    fig_evaluators = _per_evaluator_bar(df)
    fig_wins = _win_rate_pie(df)
    fig_latency = _latency_box(df)
    failures_html = _failures_table(df)

    # Bundle Plotly inline (include_plotlyjs="cdn" keeps file size sane;
    # use "inline" if you need it to work offline).
    def _fig_html(fig: go.Figure, div_id: str) -> str:
        return fig.to_html(
            include_plotlyjs="cdn",
            full_html=False,
            div_id=div_id,
            default_width="100%",
        )

    medos_score = headline["medos_overall"] * 100
    chatgpt_score = headline["chatgpt_overall"] * 100
    delta = headline["delta_points"]
    delta_sign = "+" if delta >= 0 else ""
    case_count = df["case_id"].nunique()

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      --medos: {_SYSTEM_COLORS["medos"]};
      --chatgpt: {_SYSTEM_COLORS["chatgpt"]};
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --surface: #ffffff;
      --bg: #f8fafc;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      margin: 0; padding: 0; background: var(--bg); color: var(--ink);
      line-height: 1.55;
    }}
    .wrap {{ max-width: 1180px; margin: 0 auto; padding: 32px 24px 80px; }}
    header {{ margin-bottom: 28px; }}
    header h1 {{ margin: 0 0 4px; font-size: 28px; letter-spacing: -0.01em; }}
    header p {{ margin: 0; color: var(--muted); font-size: 14px; }}
    .scorecard {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0 32px; }}
    .stat {{ background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; }}
    .stat .label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }}
    .stat .value {{ font-size: 38px; font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 0; }}
    .stat.medos .value {{ color: var(--medos); }}
    .stat.chatgpt .value {{ color: var(--chatgpt); }}
    .stat.delta .value {{ color: {'#16a34a' if delta >= 0 else '#dc2626'}; }}
    .chart {{ background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; margin-bottom: 20px; }}
    .row {{ display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }}
    @media (max-width: 800px) {{ .row {{ grid-template-columns: 1fr; }} .scorecard {{ grid-template-columns: 1fr; }} }}
    h2 {{ font-size: 18px; margin: 32px 0 12px; letter-spacing: -0.01em; }}
    table.failures {{ width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    table.failures th, table.failures td {{ padding: 9px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--line); }}
    table.failures th {{ background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em; color: var(--muted); }}
    table.failures tr:last-child td {{ border-bottom: 0; }}
    footer {{ margin-top: 40px; color: var(--muted); font-size: 12px; text-align: center; }}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>{title}</h1>
      <p>{case_count} medical scenarios scored on safety, locale, allergy correctness, brevity, and personalization.</p>
    </header>

    <div class="scorecard">
      <div class="stat medos">
        <div class="label">MedOS overall</div>
        <div class="value">{medos_score:.1f}%</div>
      </div>
      <div class="stat chatgpt">
        <div class="label">ChatGPT overall</div>
        <div class="value">{chatgpt_score:.1f}%</div>
      </div>
      <div class="stat delta">
        <div class="label">MedOS advantage</div>
        <div class="value">{delta_sign}{delta:.1f} pts</div>
      </div>
    </div>

    <div class="chart">{_fig_html(fig_categories, "fig-categories")}</div>
    <div class="chart">{_fig_html(fig_evaluators, "fig-evaluators")}</div>

    <div class="row">
      <div class="chart">{_fig_html(fig_latency, "fig-latency")}</div>
      <div class="chart">{_fig_html(fig_wins, "fig-wins")}</div>
    </div>

    <h2>Failure detail (first 40 rows)</h2>
    {failures_html}

    <footer>
      Generated from <code>{csv_path.name}</code> · MedOS Benchmark Suite v0.1
    </footer>
  </div>
</body>
</html>
"""
    output_html.parent.mkdir(parents=True, exist_ok=True)
    output_html.write_text(html, encoding="utf-8")
