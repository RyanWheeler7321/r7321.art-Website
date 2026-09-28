export class SupportError extends Error {
  constructor(code, message, status = 400, retryAfter = 0) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
