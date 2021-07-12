# Dynalist to Obsidian

This script downloads the folders and documents in an [dynalist.io](https://dynalist.io/) into folder structure of markdown files compatible with [obsidian.md](https://obsidian.md/).

## Setup

1. Clone/Download this script from GitHub
2. If you don't already have it, install [NodeJS](https://nodejs.org/en/). (v14.7.1 was used durring development of this script)
5. Run `npm install` to install required packages.

## Configure

Before running the script you will need to configure it by editing `config.json`.

- **credentials.email:** Email for your Dynalist account
- **credentials.password:** Password for your Dynalist account. This is required for downloading attachments.
- **credentials.token:** API Token from the [developer site](https://dynalist.io/developer).
- **vaultPath:** The path to the Obsidian vault to import into.
- **destinationPath:** A relative path within your vault where you would like to import your Dynalist documents.
- **requestInterval:** The interval between requests to the DynaList API. 

## Run the Script

Run `node index.js` to begin the migration.