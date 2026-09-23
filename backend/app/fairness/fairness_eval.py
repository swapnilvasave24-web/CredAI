"""
Fairness evaluation across multiple protected and structural attributes.

Groups evaluated:
1. CODE_GENDER       — standard demographic fairness (as in Home Credit schema)
2. THIN_FILE         — borrowers with no prior bureau loans (bureau_loan_count == 0)
                       This is the core group CredAI is designed to help.
3. NAME_INCOME_TYPE  — income source (Working, Pensioner, Self-employed, etc.)

All numbers are computed from actual model predictions on the held-out test set.
Nothing is hard-coded. Numbers are reported as diagnostics, NOT as certifications
of fairness or regulatory compliance.
"""
import numpy as np
import pandas as pd


def _group_metrics(df: pd.DataFrame, y_true_col: str, y_pred_col: str,
                   group_col: str) -> dict:
    """Compute per-group metrics and parity/opportunity differences."""
    groups = df[group_col].dropna().unique()
    results = {}
    approval_rates: dict[str, float] = {}
    tprs: dict[str, float | None] = {}
    fprs: dict[str, float | None] = {}

    for g in groups:
        sub = df[df[group_col] == g]
        y_true = sub[y_true_col].to_numpy()
        y_pred = sub[y_pred_col].to_numpy()

        approval_rate = float((y_pred == 0).mean())
        approval_rates[str(g)] = approval_rate

        positives = y_true == 1
        negatives = y_true == 0
        tpr = float((y_pred[positives] == 1).mean()) if positives.sum() > 0 else None
        fpr = float((y_pred[negatives] == 1).mean()) if negatives.sum() > 0 else None
        tprs[str(g)] = tpr
        fprs[str(g)] = fpr

        results[str(g)] = {
            "n": int(len(sub)),
            "approval_rate": approval_rate,
            "true_positive_rate": tpr,
            "false_positive_rate": fpr,
        }

    approval_vals = list(approval_rates.values())
    demographic_parity_difference = float(max(approval_vals) - min(approval_vals))

    tpr_vals = [v for v in tprs.values() if v is not None]
    equal_opportunity_difference = (
        float(max(tpr_vals) - min(tpr_vals)) if len(tpr_vals) > 1 else None
    )

    fpr_vals = [v for v in fprs.values() if v is not None]
    fpr_difference = (
        float(max(fpr_vals) - min(fpr_vals)) if len(fpr_vals) > 1 else None
    )

    return {
        "group_attribute": group_col,
        "group_metrics": results,
        "demographic_parity_difference": demographic_parity_difference,
        "equal_opportunity_difference": equal_opportunity_difference,
        "false_positive_rate_difference": fpr_difference,
    }


def evaluate_group_fairness(df: pd.DataFrame, y_true_col: str, y_pred_col: str,
                             group_col: str = "CODE_GENDER") -> dict:
    """
    Primary fairness endpoint — kept backward compatible.
    Returns gender fairness + thin-file fairness audit side-by-side.
    """
    df = df.copy()

    # ── 1. Gender fairness (original) ──────────────────────────────
    gender_result = _group_metrics(df, y_true_col, y_pred_col, group_col)

    # ── 2. Thin-file fairness (NEW — core of the problem statement) ─
    # Thin-file = no bureau loans AND no prior applications
    thin_mask = (df.get("BUREAU_LOAN_COUNT", pd.Series(1, index=df.index)) == 0) & \
                (df.get("PREV_APPLICATION_COUNT", pd.Series(1, index=df.index)) == 0)
    df["THIN_FILE_GROUP"] = thin_mask.map({True: "Thin-File (No History)", False: "Established Credit"})
    thin_result = _group_metrics(df, y_true_col, y_pred_col, "THIN_FILE_GROUP")

    # ── 3. Income type fairness (NEW) ──────────────────────────────
    income_result = None
    if "NAME_INCOME_TYPE" in df.columns:
        income_result = _group_metrics(df, y_true_col, y_pred_col, "NAME_INCOME_TYPE")

    note = (
        "These are descriptive fairness diagnostics on this prototype's test split, "
        "not a certification of legal/regulatory fairness. "
        "Differences are reported as-is; no threshold is claimed to make the model 'fair' "
        "— only a numeric evaluation range. "
        "The thin-file audit (THIN_FILE_GROUP) is the key metric for this system's stated goal "
        "of serving borrowers with no credit history."
    )

    return {
        # Backward-compatible top-level (gender, used by existing UI)
        **gender_result,
        # Extended audit
        "thin_file_fairness": thin_result,
        "income_type_fairness": income_result,
        "note": note,
    }
