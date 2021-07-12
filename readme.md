# Dynalist to Obsidian

This script downloads the folders and Documents in an [dynalist.io]([https://](https://dynalist.io/d/7s0fj7POXjF7mIPvRDXLIkJG)) into a directory of markdownfiles compatible with [obsidian.md](https://obsidian.md/).


## Usage 

1. Download the code for this script from GitHub
2. If you don't already have it, install [NodeJS](https://nodejs.org/en/). (v14.7.1 was used durring development of this script)
3. Aquired an API Token from the [developer site](https://dynalist.io/developer)
4. Edit `config.json`
   1. Add the the email and password for your Dynalist account
   2. Add your API token.
   3. Set `vaultPath` to the path to your vault
   4. Set `destinationPath` to the relative path within your vault where you would like to import your Dynalist documents.
5. Run the script: `node index.js`

