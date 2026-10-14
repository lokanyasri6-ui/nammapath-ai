export class AiResponseError extends Error {
  constructor(message = "The AI response did not match the expected format.") {
    super(message);
    this.name = "AiResponseError";
  }
}
