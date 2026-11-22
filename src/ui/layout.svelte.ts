// Portrait or landscape, as reactive state. Steps split into two rows of 8 in portrait.

const query = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait)') : null;

export const layout = $state({ portrait: query?.matches ?? false });

query?.addEventListener('change', (e) => (layout.portrait = e.matches));
