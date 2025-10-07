// Environment setup script for Netlify deployment
// This helps verify that all required environment variables are set

const requiredEnvVars = [
  'PRIVATE_KEY',
  'PUBLIC_KEY',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('🔍 Checking environment variables...\n');

let allPresent = true;

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Set`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('\n🎉 All required environment variables are set!');
} else {
  console.log('\n⚠️  Some environment variables are missing. Please set them in Netlify dashboard.');
  console.log('\nRequired variables:');
  requiredEnvVars.forEach(envVar => {
    console.log(`- ${envVar}`);
  });
}

// Test RSA key format
if (process.env.PRIVATE_KEY) {
  const privateKey = process.env.PRIVATE_KEY;
  if (privateKey.includes('\\n')) {
    console.log('\n🔧 Private key contains \\n - this is correct for Netlify');
  } else if (privateKey.includes('\n')) {
    console.log('\n⚠️  Private key contains actual newlines - you may need to escape them as \\n for Netlify');
  }
}

if (process.env.PUBLIC_KEY) {
  const publicKey = process.env.PUBLIC_KEY;
  if (publicKey.includes('\\n')) {
    console.log('\n🔧 Public key contains \\n - this is correct for Netlify');
  } else if (publicKey.includes('\n')) {
    console.log('\n⚠️  Public key contains actual newlines - you may need to escape them as \\n for Netlify');
  }
}