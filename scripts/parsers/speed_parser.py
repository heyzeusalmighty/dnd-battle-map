"""
Speed parsing utilities

Handles parsing speed strings like "40 ft. climb 40 ft. fly 80 ft."
"""

import re
import pandas as pd
from typing import Dict


def parse_speed(speed_str: str) -> Dict[str, int]:
    """
    Parse speed string into structured dict.
    
    Examples:
        "20.0 ft." -> {"walk": 20}
        "40 ft. climb 40 ft. fly 80 ft." -> {"walk": 40, "climb": 40, "fly": 80}
        "30 ft., swim 30 ft." -> {"walk": 30, "swim": 30}
    
    Args:
        speed_str: Speed string from CSV
    
    Returns:
        Dict with speed types as keys and values in feet
        Possible keys: walk, fly, swim, climb, burrow
    """
    if pd.isna(speed_str):
        return {}
    
    speed_str = str(speed_str).strip()
    result = {}
    
    # Match patterns like "40 ft." or "climb 40 ft."
    # First number with no prefix is walk speed
    parts = speed_str.split(',')
    for part in parts:
        part = part.strip()
        
        # Try to match "climb 40 ft."
        match = re.search(r'(walk|fly|swim|climb|burrow)\s+(\d+)', part, re.IGNORECASE)
        if match:
            speed_type = match.group(1).lower()
            speed_val = int(match.group(2))
            result[speed_type] = speed_val
        else:
            # Try to match just "40 ft." (assume walk)
            match = re.search(r'(\d+)\s*ft', part)
            if match and 'walk' not in result:
                result['walk'] = int(match.group(1))
    
    return result
