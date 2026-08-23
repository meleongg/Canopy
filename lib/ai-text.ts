export function stripModelMarkdownMarkers(text: string) {
  return text.replace(/\*\*|__/g, "");
}
