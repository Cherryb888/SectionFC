// Pass-or-Shoot scenarios.
// Coordinates: 0-100 on both axes. Goal is at the top (y = 0). Own half at y = 100.
// Picks a random 5 from these 8 per run.

export const SCENARIOS = [
  {
    id: 1,
    title: "2v1 on the break",
    ball:       { x: 55, y: 35, name: "Jeven Dhillon" },
    allies:     [{ x: 30, y: 30, name: "Rohan Naal" }],
    defenders:  [{ x: 45, y: 20 }],
    goalkeeper: { x: 50, y: 8 },
    best:       "passLeft",
    secondBest: "shoot",
    explanation: "GK set for the shot, defender blocks your angle — square it left for the tap-in.",
  },
  {
    id: 2,
    title: "Clear sight, 18 yards",
    ball:       { x: 50, y: 25, name: "Matt Lampitt" },
    allies:     [{ x: 20, y: 30, name: "Ben Higgs" }, { x: 80, y: 32, name: "Hugo Hansen" }],
    defenders:  [{ x: 35, y: 40 }, { x: 65, y: 40 }],
    goalkeeper: { x: 50, y: 6 },
    best:       "shoot",
    secondBest: null,
    explanation: "Central, no pressure, defenders behind you. Hit the target — don't overthink it.",
  },
  {
    id: 3,
    title: "Overlap on the right",
    ball:       { x: 45, y: 40, name: "Tom Goldsby" },
    allies:     [{ x: 75, y: 35, name: "Lewis Fowler" }],
    defenders:  [{ x: 50, y: 30 }],
    goalkeeper: { x: 50, y: 8 },
    best:       "passRight",
    secondBest: "shoot",
    explanation: "Defender's cutting off the central lane — release the overlap for a cutback.",
  },
  {
    id: 4,
    title: "Tight angle, teammate unmarked",
    ball:       { x: 85, y: 20, name: "Josh Treharne" },
    allies:     [{ x: 50, y: 25, name: "George Mcnulty" }],
    defenders:  [{ x: 75, y: 15 }],
    goalkeeper: { x: 55, y: 6 },
    best:       "passLeft",
    secondBest: "shoot",
    explanation: "Near-post is covered and you're at a bad angle. Cut it back to the unmarked runner.",
  },
  {
    id: 5,
    title: "Edge of the box, no numbers up",
    ball:       { x: 50, y: 28, name: "Ian Healey" },
    allies:     [{ x: 25, y: 45, name: "Guy Horton" }, { x: 75, y: 45, name: "Max Murray" }],
    defenders:  [{ x: 30, y: 40 }, { x: 70, y: 40 }, { x: 50, y: 18 }],
    goalkeeper: { x: 50, y: 8 },
    best:       "shoot",
    secondBest: null,
    explanation: "Everyone's marked, passing lanes are dead. Test the keeper from distance.",
  },
  {
    id: 6,
    title: "Winger hugging the line",
    ball:       { x: 30, y: 35, name: "Hayden Hunter" },
    allies:     [{ x: 55, y: 30, name: "Freddie Palmer" }],
    defenders:  [{ x: 25, y: 25 }],
    goalkeeper: { x: 50, y: 8 },
    best:       "passRight",
    secondBest: "shoot",
    explanation: "Fullback's forcing you wide. Cut inside with the pass to the central runner.",
  },
  {
    id: 7,
    title: "Counter, keeper off line",
    ball:       { x: 50, y: 45, name: "Dani Griffiths" },
    allies:     [{ x: 70, y: 50, name: "Jake Graham" }],
    defenders:  [],
    goalkeeper: { x: 50, y: 18 },
    best:       "shoot",
    secondBest: null,
    explanation: "Keeper's miles off his line and no defenders. Dink it — don't wait.",
  },
  {
    id: 8,
    title: "Crowded box, late runner",
    ball:       { x: 25, y: 30, name: "Callum Dagnall" },
    allies:     [{ x: 55, y: 25, name: "Tom Beeston" }],
    defenders:  [{ x: 30, y: 25 }, { x: 50, y: 15 }, { x: 70, y: 20 }],
    goalkeeper: { x: 50, y: 6 },
    best:       "passRight",
    secondBest: "passLeft",
    explanation: "Shooting lane blocked by three. Slide it to the late runner arriving central.",
  },
];

export function pickScenarios(n = 5) {
  const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
