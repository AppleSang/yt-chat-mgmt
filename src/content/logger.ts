export const log = (...args: unknown[]): void => {
  console.debug("[YTCCC]", ...args);
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
