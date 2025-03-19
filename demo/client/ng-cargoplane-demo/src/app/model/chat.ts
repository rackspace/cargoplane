/**
 * Format of a chat message.
 */
export interface ChatMessage extends Record<string, unknown> {
  /** Message content */
  text: string;
}
