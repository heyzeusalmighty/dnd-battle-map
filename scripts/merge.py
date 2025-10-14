import pandas as pd
from typing import Dict, Any, Optional

from parsers import (
    parse_hp,
    parse_speed,
    parse_cr,
    parse_abilities,
    parse_actions,
    parse_traits,
    parse_list_field
)


def merge_monster_data(bestiary_row: pd.Series, monster_stats_row: Optional[pd.Series]) -> Dict[str, Any]:
    """
    merge data from both csvs.
    
    Here's the idea:
    - Use monster_stats for numeric stats when available
    - Use bestiary for rich text fields
    - fallback to bestiary values if monster_stats data is missing
    
    args:
        bestiary_row (required)
        monster_stats_row (may be None)
    
    returns:
        dict of merged monster data
    """
    monster = {}
    
    # === basic info ===
    monster['name'] = bestiary_row['Name']
    
    if monster_stats_row is not None and pd.notna(monster_stats_row.get('Size')):
        monster['size'] = monster_stats_row['Size']
    else:
        monster['size'] = bestiary_row.get('Size', 'Medium')
    
    monster['type'] = bestiary_row['Type']
    monster['alignment'] = bestiary_row['Alignment']
    
    # === combat ===
    # ac
    if monster_stats_row is not None and pd.notna(monster_stats_row.get('AC')):
        monster['ac'] = int(monster_stats_row['AC'])
    else:
        monster['ac'] = int(bestiary_row['AC']) if pd.notna(bestiary_row.get('AC')) else 10
    
    # hp - parse from bestiary (has the formula)
    monster['hp'] = parse_hp(bestiary_row['HP'])
    
    # init - monster_stats (bestiary doesn't have this)
    if monster_stats_row is not None and pd.notna(monster_stats_row.get('Initiative')):
        monster['initiative'] = int(monster_stats_row['Initiative'])
    else:
        # fallback: use dex mod
        monster['initiative'] = 0
    
    # === speed ===
    # prefer monster_stats, fallback to bestiary
    if monster_stats_row is not None:
        speed = {}
        if pd.notna(monster_stats_row.get('Walk')):
            speed['walk'] = int(monster_stats_row['Walk'])
        if pd.notna(monster_stats_row.get('Fly')):
            speed['fly'] = int(monster_stats_row['Fly'])
        if pd.notna(monster_stats_row.get('Swim')):
            speed['swim'] = int(monster_stats_row['Swim'])
        if pd.notna(monster_stats_row.get('Climb')):
            speed['climb'] = int(monster_stats_row['Climb'])
        if pd.notna(monster_stats_row.get('Burrow')):
            speed['burrow'] = int(monster_stats_row['Burrow'])
        
        monster['speed'] = speed if speed else parse_speed(bestiary_row.get('Speed', ''))
    else:
        monster['speed'] = parse_speed(bestiary_row.get('Speed', ''))
    
    # === abilities ===
    # prefer monster_stats (has mods and saves), fallback to bestiary (only raw scores)
    if monster_stats_row is not None:
        monster['abilities'] = parse_abilities(monster_stats_row, 'monster_stats')
    else:
        monster['abilities'] = parse_abilities(bestiary_row, 'bestiary')
    
    # === senses ===
    senses = {}
    if monster_stats_row is not None:
        if pd.notna(monster_stats_row.get('Darkvision')):
            senses['darkvision'] = int(monster_stats_row['Darkvision'])
        if pd.notna(monster_stats_row.get('Blindsight')):
            senses['blindsight'] = int(monster_stats_row['Blindsight'])
        if pd.notna(monster_stats_row.get('Truesight')):
            senses['truesight'] = int(monster_stats_row['Truesight'])
            # this movie ruled
        if pd.notna(monster_stats_row.get('Tremorsense')):
            senses['tremorsense'] = int(monster_stats_row['Tremorsense'])
        if pd.notna(monster_stats_row.get('Passive Perception')):
            senses['passivePerception'] = int(monster_stats_row['Passive Perception'])
    monster['senses'] = senses
    
    # === Languages ===
    # critical stuff
    lang_str = bestiary_row.get('Languages', '')
    monster['languages'] = parse_list_field(lang_str)
    
    # === cr / xp / proficiency bonus ===
    cr_data = parse_cr(bestiary_row.get('CR', '0'))
    monster['cr'] = cr_data['cr']
    monster['xp'] = cr_data['xp']
    monster['proficiencyBonus'] = cr_data['proficiencyBonus']
    
    # === damage vulnerabilities/immunities/resistances ===
    monster['vulnerabilities'] = parse_list_field(bestiary_row.get('Damage Vulnerabilities', ''))
    monster['resistances'] = parse_list_field(bestiary_row.get('Damage Resistances', ''))
    
    immunities = {}
    immunities['damage'] = parse_list_field(bestiary_row.get('Damage Immunities', ''))
    immunities['conditions'] = parse_list_field(bestiary_row.get('Condition Immunities', ''))
    monster['immunities'] = immunities
    
    # === text fields from bestiary ===
    monster['traits'] = parse_traits(bestiary_row.get('Traits', ''))
    monster['actions'] = parse_actions(bestiary_row.get('Actions', ''))
    monster['bonusActions'] = parse_actions(bestiary_row.get('Bonus Actions', ''))
    monster['reactions'] = parse_actions(bestiary_row.get('Reactions', ''))
    monster['legendaryActions'] = parse_actions(bestiary_row.get('Legendary Actions', ''))
    
    # === other stuff ===
    monster['environment'] = parse_list_field(bestiary_row.get('Environment', ''))
    monster['treasure'] = bestiary_row.get('Treasure', '') if pd.notna(bestiary_row.get('Treasure')) else ''
    
    # source info
    source = {}
    if pd.notna(bestiary_row.get('Source')):
        source['book'] = bestiary_row['Source']
    if pd.notna(bestiary_row.get('Page')):
        try:
            source['page'] = int(bestiary_row['Page'])
        except (ValueError, TypeError):
            pass
    if source:
        monster['source'] = source
    
    return monster
