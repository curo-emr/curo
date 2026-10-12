import { nullIfNotFound, signInErrorMessage } from "./errors";

const answer = (status: number, message?: string) => ({ response: { status, data: { message } } });

describe("signInErrorMessage", () => {
  it("calls a 401 wrong credentials, whatever the server says", () => {
    expect(signInErrorMessage(answer(401, "Unauthorized"))).toBe("Invalid email or password.");
  });

  it("passes on the server's reason for anything else, such as a lockout", () => {
    expect(signInErrorMessage(answer(429, "Too many failed sign-in attempts. Try again in 14 minutes."))).toBe(
      "Too many failed sign-in attempts. Try again in 14 minutes.",
    );
    expect(signInErrorMessage(answer(500))).toBe("Couldn't sign in. Try again in a moment.");
  });

  it("says when the server couldn't be reached", () => {
    expect(signInErrorMessage(new Error("Network Error"))).toMatch(/^Couldn't reach the server/);
  });
});

describe("nullIfNotFound", () => {
  it("passes the record through", async () => {
    await expect(nullIfNotFound(Promise.resolve("record"))).resolves.toBe("record");
  });

  it.each([404, 400])("reads a %d as no such record", async status => {
    await expect(nullIfNotFound(Promise.reject(answer(status)))).resolves.toBeNull();
  });

  it("still throws any other failure", async () => {
    await expect(nullIfNotFound(Promise.reject(answer(500)))).rejects.toEqual(answer(500));
  });
});
