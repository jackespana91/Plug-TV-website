/**
 * "The Plug" roster — the streetwear golfers that make this The Plug Golf and
 * not another golf game. Pure cosmetic data: an accent colour (themes confetti
 * + the result celebration), a face, a ball-trail colour, and a win call-out.
 * Zero effect on RTP or the drawn outcome.
 *
 * Rendered by the HUD avatar chip, the character picker, and the win-celebration
 * line in the Svelte components; the selected id is UI state (persisted in
 * localStorage), never sent to the RGS.
 */
export type Character = {
  id: string;
  name: string;
  tag: string;
  face: string; // emoji
  color: string; // accent hex
  trail: string; // ball-trail hex
  cel: string; // win call-out
};

export const CHARACTERS: Character[] = [
  { id: 'drip', name: 'Drip', tag: 'Pure drip', face: '😎', color: '#39ff7a', trail: '#39ff7a', cel: 'TOO MUCH DRIP! 💧' },
  { id: 'ice', name: 'Ice', tag: 'Ice-cold closer', face: '🥶', color: '#5db8ff', trail: '#bfe6ff', cel: 'ICE COLD! ❄️' },
  { id: 'mic', name: 'Mic', tag: 'Rapper energy', face: '🎤', color: '#ff5db8', trail: '#ff8de1', cel: 'DROP THE MIC! 🎤' },
  { id: 'baller', name: 'Baller', tag: 'Baller', face: '⚽', color: '#ffd34d', trail: '#ffe27a', cel: 'GOLAZO! ⚽' },
  { id: 'boss', name: 'Boss', tag: 'Influencer', face: '👑', color: '#c07bff', trail: '#d9b3ff', cel: 'BOSS MOVE! 👑' },
  { id: 'ace', name: 'Ace', tag: 'Streetwear pro', face: '🧢', color: '#ff8c42', trail: '#ffb37a', cel: 'ACE VIBES! 🔥' },
];

export const DEFAULT_CHARACTER = 'drip';

export const characterById = (id: string): Character =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
