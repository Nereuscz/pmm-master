type DbErrorLike = { message: string } | null | undefined;

export function throwIfDbError(error: DbErrorLike, message: string): void {
  if (!error) return;
  throw new Error(`${message} ${error.message}`.trim());
}
