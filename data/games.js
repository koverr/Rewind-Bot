export function getGames() {
  return Object.keys(GAMES);
}

const BO2 = {
  name: 'Black Ops 2',
  modes: {
    hp: {
      name: 'Hardpoint',
      description: 'Hardpoint is played for Maps 1 and 4',
      maps: ['Raid', 'Slums', 'Standoff', 'Yemen'],
    },
    snd: {
      name: 'Search and Destroy',
      description: 'Search and Destroy is played for Maps 2 and 5',
      maps: ['Express', 'Meltdown', 'Raid', 'Standoff'],
    },
    ctf: {
      name: 'Capture the Flag',
      description: 'Capture the Flag is played for Map 3',
      maps: ['Raid', 'Slums', 'Standoff'],
    },
  },
};

const MW22 = {
  name: 'Modern Warfare 2 (2022)',
  modes: {
    hp: {
      name: 'Hardpoint',
      description: 'Hardpoint is played for Maps 1 and 4',
      maps: [
        'Al Bagra Fortress',
        'Breenbergh Hotel',
        'Embassy',
        'Mercado Las Almas',
        'Zarqwa Hydroelectric',
      ],
    },
    snd: {
      name: 'Search and Destroy',
      description: 'Search and Destroy is played for Maps 2 and 5',
      maps: [
        'Al Bagra Fortress',
        'Breenbergh Hotel',
        'El Asilo',
        'Embassy',
        'Mercado Las Almas',
      ],
    },
    ctrl: {
      name: 'Control',
      description: 'Control is played for Map 3',
      maps: ['Breenbergh Hotel', 'El Asilo', 'Himmelmatt Expo'],
    },
  },
};

const GAMES = { BO2, MW22 };
