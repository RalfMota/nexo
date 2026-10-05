/* NEXO — Ícones em pixel art (SVG embutido) */

const svg = (content) =>
  `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${content}</svg>`;

export const ICONS = {
  map: svg(`
    <path fill="#e9d8a6" d="M1 3h4v11H1zM6 2h4v11H6zM11 3h4v11h-4z"/>
    <path fill="#c49c63" d="M5 3h1v11H5zM10 2h1v11h-1z"/>
    <path fill="#c2453b" d="M7 5h2v2H7zM3 9h1v1H3zM12 7h1v2h-1z"/>
    <path fill="#4f9a3f" d="M2 5h2v2H2zM12 11h2v1h-2z"/>`),
  journal: svg(`
    <path fill="#7b4fd6" d="M3 1h10v14H3z"/>
    <path fill="#5a35a8" d="M3 1h2v14H3z"/>
    <path fill="#fbf1d9" d="M6 3h6v4H6z"/>
    <path fill="#f2b84b" d="M10 11h2v4h-2z"/>`),
  items: svg(`
    <path fill="#a0703f" d="M3 5h10v10H3z"/>
    <path fill="#7d5530" d="M5 2h6v3H5zM3 8h10v1H3z"/>
    <path fill="#f2b84b" d="M7 8h2v3H7z"/>`),
  calculator: svg(`
    <path fill="#3b3b5c" d="M3 1h10v14H3z"/>
    <path fill="#5fe3d0" d="M5 3h6v3H5z"/>
    <path fill="#fbf1d9" d="M5 8h2v2H5zM9 8h2v2H9zM5 11h2v2H5zM9 11h2v2H9z"/>`),
  compass: svg(`
    <path fill="#c9862a" d="M5 1h6v2h2v2h2v6h-2v2h-2v2H5v-2H3v-2H1V5h2V3h2z"/>
    <path fill="#fbf1d9" d="M5 3h6v2h2v6h-2v2H5v-2H3V5h2z"/>
    <path fill="#c2453b" d="M7 4h2v4H7z"/>
    <path fill="#3b3b5c" d="M7 8h2v4H7z"/>`),
  menu: svg(`
    <path fill="#4f3019" d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>`),
  crystal: svg(`
    <path fill="#118a80" d="M8 1l5 5-5 9-5-9z"/>
    <path fill="#5fe3d0" d="M8 1l5 5H3z"/>
    <path fill="#e3fffb" d="M6 3h2v2H6z"/>`),
};
