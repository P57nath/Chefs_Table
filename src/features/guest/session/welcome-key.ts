/** Shared by the server layout (inline script) and the client overlay. */
export const welcomeKey = (token: string) => `es-welcomed:${token}`;

/** Inline script: hide the welcome overlay before first paint if this tab already saw it. */
export function welcomeSeenScript(token: string): string {
  const key = JSON.stringify(welcomeKey(token)).replace(/</g, "\\u003c");
  return `try{if(sessionStorage.getItem(${key})==="1")document.documentElement.dataset.welcomed="1"}catch(e){}`;
}
