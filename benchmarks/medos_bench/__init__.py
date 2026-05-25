"""MedOS vs ChatGPT medical benchmark suite.

A small harness that replays the same patient conversations against
both systems and scores each reply on safety, allergy correctness,
locale, brevity, personalization, and bubble-format compliance — the
dimensions where MedOS holds structural advantages over a general
chat baseline. Outputs a flat CSV per run plus a self-contained
HTML dashboard suitable for marketing collateral.
"""

__version__ = "0.1.0"
