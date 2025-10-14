import pandas as pd
from typing import Dict


def parse_abilities(row: pd.Series, csv_type: str) -> Dict[str, Dict[str, int]]:
    """
    parse ability scores and modifiers.
    
    bestiary has the base stats
    monster_stats has mods and saves
    
    args:
        row: Series (row)
        csv_type: 'bestiary' or 'monster_stats' to determine parsing
    
    returns:
        dict mapping ability to mod/save
    """
    abilities = {}
    
    if csv_type == 'monster_stats':
        # monster_stats has modifiers and saves directly
        for ability in ['str', 'dex', 'con', 'int', 'wis', 'cha']:
            mod_col = f'{ability.upper()} Mod'
            save_col = f'{ability.upper()} Save'
            
            mod = int(row[mod_col]) if pd.notna(row.get(mod_col)) else 0
            save = int(row[save_col]) if pd.notna(row.get(save_col)) else 0
            
            abilities[ability] = {"mod": mod, "save": save}
    
    elif csv_type == 'bestiary':
        # bestiary has raw scores so you'd have to calculate mods
        ability_map = {
            'str': 'Strength',
            'dex': 'Dexterity',
            'con': 'Constitution',
            'int': 'Intelligence',
            'wis': 'Wisdom',
            'cha': 'Charisma'
        }
        
        for short, full in ability_map.items():
            score = int(row[full]) if pd.notna(row.get(full)) else 10
            mod = (score - 10) // 2
            # default to no proficiency mod
            abilities[short] = {"mod": mod, "save": mod}
    
    return abilities
