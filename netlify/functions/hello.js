// This is a simple function with zero dependencies to test the build process.
export const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "Hello from the test function!" }),
  };
};