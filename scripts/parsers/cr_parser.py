import re
import pandas as pd
from typing import Dict, Any


def parse_cr(cr_str: str) -> Dict[str, Any]:
    """
    parse CR string like "3 (XP 700; PB +2)".
    can't imagine this will ever be used but whatever
    
    args:
        cr_str: CR string from csv
    
    returns:
        Dict with cr, xp, and proficiencyBonus
    """
    if pd.isna(cr_str):
        return {"cr": "0", "xp": 0, "proficiencyBonus": 0}
    
    cr_str = str(cr_str).strip()
    cr_match = re.match(r'([^\(]+)', cr_str)
    cr = cr_match.group(1).strip() if cr_match else "0"

    xp_match = re.search(r'XP\s+(\d+)', cr_str)
    xp = int(xp_match.group(1)) if xp_match else 0

    pb_match = re.search(r'PB\s+\+?(\d+)', cr_str)
    pb = int(pb_match.group(1)) if pb_match else 0
    
    return {"cr": cr, "xp": xp, "proficiencyBonus": pb}
