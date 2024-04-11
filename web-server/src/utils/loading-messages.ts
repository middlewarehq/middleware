const LOADING_MESSAGES = [
  'Hoping your numbers look great? Me too! 🤞',
  "Hang on. I'll grab lunch and get fresh data for you... any minute now...",
  'And the oscar goes to... YOU! For hanging on while we get these stats for you',
  'Loading... like watching paint dry, but with data 🎨',
  'Hang on, one of our employees ran away with your data 🏃‍♂️ (jk 👀)',
  'Grabbing lunch! Erm... data. I mean data.',
  'How badly do you actually want that cycle time/sprint spillover?',
  'Your team is doing juuuust fiiiine... trust me.',
  'How many times did you ask your team for updates today?',
  'Samad is bringing your insights on a skateboard 🛹',
  'Shivam is literally typing out the API response right now. 1 sec ⏳',
  'Eshaan stayed up all night to do the math for this 🌙',
  "Look out of your window! It's Amogh with your data! 📨",
  "Adnan doesn't think your stats are half bad. He thinks they are half good! 👌"
];

function getRandomSeededInt(max: number): number {
  const currentTime = new Date().getTime();
  const timeBasedSeed = Math.floor(currentTime / 5000); // 5 seconds window
  const seed = timeBasedSeed % (max + 1);
  return seed;
}

export const getRandomLoadMsg = () =>
  LOADING_MESSAGES[getRandomSeededInt(LOADING_MESSAGES.length - 1)];
