const yargs = require('yargs')
const findUp = require('find-up')
const fs = require('fs')
const configPath = findUp.sync(['.parse-xsdrc', '.parse-xsdrc.json'])
const config = configPath ? JSON.parse(fs.readFileSync(configPath)) : {}

const argv = yargs
  .config(config)
  .commandDir('cmds')
  .demandCommand()
  .help()
  .argv

console.log(argv)
