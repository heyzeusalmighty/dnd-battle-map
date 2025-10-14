import re
import pandas as pd
from typing import Dict, Any


def parse_hp(hp_str: str) -> Dict[str, Any]:
    """
    parse HP string into average, formula, dice breakdown, and max.
    the idea here would be to expose quick or nasty defaults and the roll formula

    dieSize is like the type of die. i have no idea what the actual term for this is.

    args:
        hp_str: HP string
    
    returns:
        dict with average/mag hp, formula, and dice
    """
    if pd.isna(hp_str):
        return {
            "average": 0, 
            "formula": "",
            "numDice": 0,
            "dieSize": 0,
            "modifier": 0,
            "max": 0
        }
    
    hp_str = str(hp_str).strip()
    
    # match pattern (ex. "58 (9d8 + 18)")
    match = re.match(r'(\d+)\s*\(([^)]+)\)', hp_str)
    if match:
        average = int(match.group(1))
        formula = match.group(2).replace(' ', '')  # Remove spaces: "9d8+18"
        
        # dice breakdown
        dice_match = re.match(r'(\d+)d(\d+)([+-]\d+)?', formula)
        if dice_match:
            num_dice = int(dice_match.group(1))
            die_size = int(dice_match.group(2))
            modifier = int(dice_match.group(3)) if dice_match.group(3) else 0
            max_hp = num_dice * die_size + modifier
            
            return {
                "average": average,
                "formula": formula,
                "numDice": num_dice,
                "dieSize": die_size,
                "modifier": modifier,
                "max": max_hp
            }
        
        # if we can't parse dice, just return average and formula
        return {
            "average": average,
            "formula": formula,
            "numDice": 0,
            "dieSize": 0,
            "modifier": 0,
            "max": 0
        }
    
    # fallback: just a number
    try:
        return {
            "average": int(hp_str),
            "formula": "",
            "numDice": 0,
            "dieSize": 0,
            "modifier": 0,
            "max": 0
        }
    except ValueError:
        return {
            "average": 0,
            "formula": "",
            "numDice": 0,
            "dieSize": 0,
            "modifier": 0,
            "max": 0
        }
