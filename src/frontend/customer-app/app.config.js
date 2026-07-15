const path = require('path')

// `npm run web` invokes `expo start --web`, so --web on argv tells us which env
// file to load — 10.0.2.2 (Android emulator) is meaningless to a browser, which
// needs plain localhost instead.
const envFile = process.argv.includes('--web') ? 'envs/.env.web' : 'envs/.env'
require('dotenv').config({ path: path.resolve(__dirname, envFile) })

module.exports = require('./app.json')
