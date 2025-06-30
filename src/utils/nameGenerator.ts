// Fantasy name generation utility
const FIRST_NAMES = [
  // Male names
  'Aiden', 'Alaric', 'Aldric', 'Alexander', 'Alistair', 'Arthur', 'Asher', 'Atlas',
  'Benedict', 'Caspian', 'Cedric', 'Damien', 'Dorian', 'Edmund', 'Elias', 'Felix',
  'Gabriel', 'Gareth', 'Jasper', 'Leon', 'Lucian', 'Magnus', 'Marcus', 'Nathaniel',
  'Oliver', 'Orion', 'Owen', 'Sebastian', 'Theodore', 'Tristan', 'Victor', 'William',
  
  // Female names
  'Adelaide', 'Arabella', 'Aurora', 'Beatrice', 'Celeste', 'Clara', 'Cordelia', 'Diana',
  'Eleanor', 'Evangeline', 'Genevieve', 'Helena', 'Imogen', 'Isabella', 'Josephine', 'Juliet',
  'Katherine', 'Lillian', 'Lydia', 'Margaret', 'Ophelia', 'Penelope', 'Rosalind', 'Seraphina',
  'Theodora', 'Valentina', 'Victoria', 'Vivienne', 'Winifred', 'Ximena', 'Yasmine', 'Zara',
  
  // Unisex names
  'Avery', 'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Gray', 'Harper',
  'Jordan', 'Kai', 'Lane', 'Morgan', 'Parker', 'Quinn', 'River', 'Sage'
];

const SURNAME_PREFIXES = [
  'Black', 'White', 'Silver', 'Gold', 'Iron', 'Stone', 'Wood', 'Green',
  'Red', 'Blue', 'Grey', 'Brown', 'Swift', 'Strong', 'Wise', 'Fair',
  'Noble', 'Bright', 'Dark', 'Light', 'Wild', 'Free', 'True', 'Bold'
];

const SURNAME_SUFFIXES = [
  'wood', 'stone', 'field', 'brook', 'hill', 'vale', 'ford', 'bridge',
  'gate', 'tower', 'crown', 'heart', 'soul', 'mind', 'wing', 'claw',
  'sword', 'shield', 'bow', 'arrow', 'storm', 'wind', 'fire', 'water'
];

export function generateRandomName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const prefix = SURNAME_PREFIXES[Math.floor(Math.random() * SURNAME_PREFIXES.length)];
  const suffix = SURNAME_SUFFIXES[Math.floor(Math.random() * SURNAME_SUFFIXES.length)];
  
  return `${firstName} ${prefix}${suffix}`;
}

export function generateFirstName(): string {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
}

export const PRESET_BACKGROUNDS = [
  {
    title: 'Curious Explorer',
    description: 'Driven by an insatiable desire to discover new places, people, and experiences.'
  },
  {
    title: 'Noble Diplomat',
    description: 'Skilled in the art of conversation and negotiation, seeking peaceful solutions.'
  },
  {
    title: 'Mysterious Wanderer',
    description: 'A traveler with a hidden past, carrying secrets and hard-won wisdom.'
  },
  {
    title: 'Scholarly Seeker',
    description: 'Devoted to learning and understanding, always asking questions and seeking truth.'
  },
  {
    title: 'Compassionate Healer',
    description: 'Dedicated to helping others and bringing comfort to those in need.'
  },
  {
    title: 'Brave Adventurer',
    description: 'Bold and courageous, ready to face any challenge that comes their way.'
  }
];

export const BALANCED_PERSONALITY_TRAITS = [
  'Curious', 'Compassionate', 'Brave', 'Diplomatic'
];

export function getRandomPresetBackground() {
  return PRESET_BACKGROUNDS[Math.floor(Math.random() * PRESET_BACKGROUNDS.length)];
}

export function getRandomAvatarColor(): number {
  return Math.floor(Math.random() * 8); // 0-7 for the 8 avatar colors
}