"""
Text parsing utilities

Handles parsing actions, traits, and comma-separated lists
"""

import re
import pandas as pd
from typing import List, Dict


def parse_actions(actions_str: str) -> List[Dict[str, str]]:
    """
    Parse action text into structured list.
    
    Actions are separated by newlines and format is:
    "Action Name. Description text."
    
    Args:
        actions_str: Raw action text from CSV
    
    Returns:
        List of dicts with "name" and "description" keys
        
    Example:
        Input: "Multiattack. The mummy makes two attacks.\nSlam. +5 to hit."
        Output: [
            {"name": "Multiattack", "description": "The mummy makes two attacks."},
            {"name": "Slam", "description": "+5 to hit."}
        ]
    """
    if pd.isna(actions_str):
        return []
    
    actions_str = str(actions_str).strip()
    if not actions_str:
        return []
    
    actions = []
    # Split by newline or double space (common separators)
    parts = re.split(r'\n+|\s{2,}', actions_str)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # Try to split on first period to get name vs description
        match = re.match(r'^([^.]+)\.\s*(.+)$', part, re.DOTALL)
        if match:
            name = match.group(1).strip()
            description = match.group(2).strip()
            actions.append({"name": name, "description": description})
        else:
            # Fallback: whole thing is description
            actions.append({"name": "Action", "description": part})
    
    return actions


def parse_traits(traits_str: str) -> List[Dict[str, str]]:
    """
    Parse traits - same format as actions.
    
    Args:
        traits_str: Raw trait text from CSV
    
    Returns:
        List of dicts with "name" and "description" keys
    """
    return parse_actions(traits_str)


def parse_list_field(field_str: str) -> List[str]:
    """
    Parse comma-separated list like 'fire, poison' into array.
    
    Filters out placeholder values like "—", "-", "None"
    
    Args:
        field_str: Comma-separated string from CSV
    
    Returns:
        List of strings
        
    Example:
        "fire, poison" -> ["fire", "poison"]
        "—" -> []
        "" -> []
    """
    if pd.isna(field_str) or not str(field_str).strip():
        return []
    
    result = [x.strip() for x in str(field_str).split(',') if x.strip()]
    
    # Filter out placeholder values
    return [x for x in result if x not in ['—', '-', 'None', 'none']]
