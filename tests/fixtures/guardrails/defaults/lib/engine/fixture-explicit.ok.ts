const input: { limit?: number | null } = {};
if (input.limit == null) {
  throw new Error('limit required');
}
const limit = input.limit;
export { limit };
