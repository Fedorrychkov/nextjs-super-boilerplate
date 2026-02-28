export type AnyString = string & NonNullable<unknown>

export type ValuesMap<T extends AnyString, K> = {
  [Key in T]: K
}
