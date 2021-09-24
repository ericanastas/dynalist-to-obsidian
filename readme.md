# Dynalist to Obsidian

This script downloads the folders and documents in [dynalist.io](https://dynalist.io/) into a local folder structure of markdown files compatible with [obsidian.md](https://obsidian.md/).

## Setup

1. Clone or download this script from GitHub
2. If you don't already have it, install [NodeJS](https://nodejs.org/en/). (v14.7.1 was used durring development of this script)
5. Run `npm install` to install required packages.

## Configure

Before running the script you will need to configure it by editing `config.json`.

- **credentials.token:** API Token from the [developer site](https://dynalist.io/developer).
- **vaultPath:** The path to the Obsidian vault to import into.
- **destinationPath:** A relative path within your vault where you would like to import your Dynalist documents.
- **requestInterval:** The interval between requests to the DynaList API. 
- **addCheckBoxes:** Add checkboxes to list items that are completed, but did not have check boxes.
- **strictLineBreaks:** Adds two spaces before line breaks to align with strict markdown.
- **documentLinks:** Set to true to update internal links to between Dynalist documents with links to the new migrated files.
- **blockLinks:** Set to true to migrate links to specific nodes within documents as [block links](https://help.obsidian.md/How+to/Link+to+blocks). This requires adding a `^header-id` to the target items. If `blockLinks=false `and  `documentLinks=true` then links to specific nodes will be replaced with a link to the migrated file.

## Run the Script

Run `node index.js` to begin the migration.