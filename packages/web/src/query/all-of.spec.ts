import { allOf, type Loadable } from "./all-of";

const query = <T,>(data: T | undefined, state: Partial<Loadable<T>> = {}): Loadable<T> => ({
  data,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
  ...state,
});

describe("allOf", () => {
  it("has the data once every query has loaded", () => {
    expect(allOf(query(1), query("a")).data).toEqual([1, "a"]);
    expect(allOf(query(1), query(undefined)).data).toBeUndefined();
  });

  it("keeps empty data, which is loaded", () => {
    expect(allOf(query([]), query(0)).data).toEqual([[], 0]);
  });

  it("fails if any query failed, and retries only those", () => {
    const failed = query(undefined, { isError: true });
    const loaded = query(1);
    const all = allOf(loaded, failed);
    expect(all.isError).toBe(true);
    all.refetch();
    expect(failed.refetch).toHaveBeenCalled();
    expect(loaded.refetch).not.toHaveBeenCalled();
  });

  it("is fetching while any query is", () => {
    expect(allOf(query(1), query(2, { isFetching: true })).isFetching).toBe(true);
  });
});
