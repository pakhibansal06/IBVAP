from typing import List, Dict, Any, Tuple

class RiskEngine:
    """
    Configurable Risk Assessment Engine:
    Calculates overall score (0 - 100) and risk category:
    - 0 - 30: LOW
    - 31 - 60: MEDIUM
    - 61 - 80: HIGH
    - 81 - 100: CRITICAL

    Provides transparent audit explanations for why the risk score was calculated.
    """

    def calculate_risk(self, triggered_threats: List[Dict[str, Any]]) -> Tuple[int, str, List[str]]:
        raw_score = sum(threat["score_delta"] for threat in triggered_threats)
        total_score = min(100, max(0, raw_score))

        if total_score >= 81:
            risk_level = "CRITICAL"
        elif total_score >= 61:
            risk_level = "HIGH"
        elif total_score >= 31:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        reasons = [f"• {threat['label']} (+{threat['score_delta']})" for threat in triggered_threats]
        if not reasons:
            reasons = ["• Normal sector activity within baseline parameters (+0)"]

        return total_score, risk_level, reasons

risk_engine = RiskEngine()
