#!/usr/bin/env python3
import json
from parsers import load_csvs
from merge import merge_monster_data


def main():
    """
    Load csvs and write json output
    """
    
    bestiary, monster_stats = load_csvs()

    # lookup by monster name
    monster_stats_lookup = {row['Name']: row for _, row in monster_stats.iterrows()}

    monsters = []

    for _, row in bestiary.iterrows():
        name = row['Name']
        monster_stats_row = monster_stats_lookup.get(name)

        # please please
        if monster_stats_row is None:
            print(f"'{name}' only in bestiary file :(")

        monster = merge_monster_data(row, monster_stats_row)
        monsters.append(monster)

    monsters.sort(key=lambda m: m['name'])

    print(f"\n{len(monsters)} monsters merged.")

    output_file = '../public/data/monsters.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(monsters, f, indent=2, ensure_ascii=False)

    # let's see:
    print(f"\nFile at: {output_file}")

    if monsters:
        print("\nHere's a dude:")
        print(json.dumps(monsters[0], indent=2))

    print(f"Total monsters: {len(monsters)}")
    print(f"With traits: {sum(1 for m in monsters if m['traits'])}")
    print(f"With actions: {sum(1 for m in monsters if m['actions'])}")

if __name__ == '__main__':
    main()