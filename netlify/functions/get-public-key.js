export const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: process.env.PUBLIC_KEY || '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkYa1FfTrFN0FeQWUoi1o\nHeE2RlAHDitY9iqHYkRaVNAIR5LsijwlmOXn+f7RgPul38BLHZpT/tn05DoLcZKr\nSuejx1FJbJFZhJe4oWZMGgKPtYTvTMUJ1XM8qa+IL7wWN7cmAVqK6DmMqIOuGXv5\n+bPRwyp50HY5vx0Co3evLjwBAuyrwAmtoyW3hFzsSFLe1+L/Geq/8i+OrSTEtewm\nbuXer6xZe/h5tSsnQKA+1u0GOEtvKkZ1Ziuyemd0wQOPim00BMkf39WM8P+X0uqs\nXArFp2KwsFmmjRutZ8c0AUMCJLwOaTTmAWMHm2JiRfIr4nZFIThcsI/5EMUOOQaj\nJwIDAQAB\n-----END PUBLIC KEY-----',
    }),
  }
}