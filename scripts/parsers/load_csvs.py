import pandas as pd
from typing import Tuple, Optional


def load_csvs() -> Tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
    """
    load both CSV files.

    Returns:
        tuple of (bestiary_dataframe, monster_stats_dataframe)
        otherwise (None, None)
    """
    print("🔍 Reading CSV files...")
    
    bestiary_paths = ['data/Bestiary.csv', 'Bestiary.csv']
    bestiary = _load_csv(bestiary_paths, "Bestiary")
    
    if bestiary is None:
        return None, None

    monster_stats_paths = [
        'data/Dungeons and Dragons 2024 Monster Stats.csv',
        'Dungeons and Dragons 2024 Monster Stats.csv'
    ]
    monster_stats = _load_csv(monster_stats_paths, "Monster Stats")
    
    if monster_stats is None:
        return None, None
    
    print(f"\nbestiary shape: {bestiary.shape}")
    print(f"monster_stats shape: {monster_stats.shape}")
    print(f"\nbestiary: {len(bestiary)} monsters")
    print(f"monster_stats: {len(monster_stats)} monsters")
    
    return bestiary, monster_stats


def _load_csv(paths: list, name: str) -> Optional[pd.DataFrame]:
    """
    Helper function to load a single CSV with multiple attempts.
    
    Args:
        paths: List of file paths to try
        name: Human-readable name for error messages
    
    Returns:
        DataFrame if successful, None if all attempts fail
    """
    for path in paths:
        # Try comma separator first (standard CSV)
        try:
            df = pd.read_csv(path, encoding='utf-8')
            print(f"✅ Found {name} at: {path}")
            return df
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"⚠️  Warning: Error reading {path} with comma separator: {e}")
        
        # Try tab separator (TSV)
        try:
            df = pd.read_csv(path, sep='\t', encoding='utf-8')
            print(f"✅ Found {name} (tab-separated) at: {path}")
            return df
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"⚠️  Warning: Error reading {path} with tab separator: {e}")
    
    # All attempts failed
    print(f"❌ Error: Could not find {name}")
    print(f"   Tried paths: {paths}")
    return None
