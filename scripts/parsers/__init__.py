"""
Parser module for monster data
"""

from .hp_parser import parse_hp
from .speed_parser import parse_speed
from .cr_parser import parse_cr
from .ability_parser import parse_abilities
from .text_parser import parse_actions, parse_traits, parse_list_field
from .load_csvs import load_csvs

__all__ = [
    'parse_hp',
    'parse_speed',
    'parse_cr',
    'parse_abilities',
    'parse_actions',
    'parse_traits',
    'parse_list_field',
    'load_csvs',
]