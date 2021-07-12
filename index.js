const config = require("./config.json");
const fetch = require("node-fetch");
const path = require('path');
const fs = require('fs');


console.log("Reading file list from dynalist.io/api...")

fetch("https://dynalist.io/api/v1/file/list", {
    "method": 'POST',
    "content-type": 'application/json',
    "body": JSON.stringify({
        token: config.credentials.token
    })
})
    .then(res => res.json())
    .then(structureFiles)
    .then((val) => importFolder(val.folder, val.files))
    .catch(err => console.error(err));



/**
 * Structures the file/document objects hiearctically replacing the `children` properties of
 * each node with an array of the actual children nodes. Also, adds a path property to each node
 * that matches the file or folder that will be created.
 * 
 * @param {*} filesBody 
 * @returns The root folder node
 */

function structureFiles(filesBody) {

    if (filesBody._code != "Ok") throw `body._code != "Ok"`;

    console.log(`${filesBody.files.length} Dynalist folders and documents found.`);

    /**
     * Replaces the children array of node ids, with an array of the actual child node objects
     * @param {*} folderNode 
     */
    function replaceChildren(folderNode) {

        if (folderNode.type != "folder") throw "node.type != folder passed to replaceChildren";

        let childNodes = [];

        for (let childNodeId of folderNode.children) {

            //Find the childNode
            let childNodeIndex = filesBody.files.findIndex(f => f.id === childNodeId);
            if (childNodeIndex == -1) throw `File ID not found: ${childNodeId}`
            let childNode = filesBody.files[childNodeIndex];


            if (childNode.type == "folder") {
                childNode.path = path.join(folderNode.path, cleanPathPart(childNode.title));
                console.log(childNode.path);
                replaceChildren(childNode);
            }
            else if (childNode.type == "document") {
                childNode.path = path.join(folderNode.path, cleanPathPart(childNode.title) + ".md");
                console.log(childNode.path + " [FILE]");
            }
            else throw `Unexpected file.type: ${file.type}`

            childNodes.push(childNode);
        }

        folderNode.children = childNodes;
    }

    //Start structuring from root node
    let rootFile = filesBody.files.find(f => f.id === filesBody.root_file_id);
    rootFile.path = path.join(config.vaultPath, config.destinationPath);

    replaceChildren(rootFile);

    return { files: filesBody.files, folder: rootFile }

}






/**
 * Imports the Dynalist folder
 * @param {*} folder The folderNode to import*
 * @param {*} files Flat list of files nodes from API
 */

function importFolder(folder, files) {

    function importFolderContents() {
        for (let child of folder.children) {
            if (child.type == "folder") importFolder(child, files);
            else if (child.type == "document") importDocumentToMdFile(child, files)
            else throw `Unexpected file.type: ${file.type}`
        }
    }

    //Attempt to access destPath
    fs.access(folder.path, function (err) {

        if (err) { //destPath does not exist

            //create the directory
            console.log(`Destination folder does not exist. Creating folder: ${folder.path}`);
            fs.mkdir(folder.path, function (err) {

                if (err) {
                    console.error(err)
                    throw err;
                }
                else {
                    importFolderContents();
                }
            });
        }
        else { //destPath exists

            console.log(`Destination folder exists: ${destPath}`);
            fs.readdir(path, function (err, files) {

                if (err) {
                    console.error(err);
                    throw err;
                }
                else if (folderContents.length > 0) {
                    let errMess = `Existing folder is not empty: ${folder.path}`;
                    console.warn(errMess);
                    importFolderContents();
                }
                else {
                    importFolderContents();
                }

            })
        }
    })
}

function importDocumentToMdFile(documentNode, files) {
    fs.appendFile(documentNode.path, 'placeholder data', function (err) {
        if (err) throw err;;
    })
}

/**
 * Removes/replaced invalid characters from a file or folder name
 * @param {*} pathPart 
 */
function cleanPathPart(pathPart) {
    const pattern = /[^\w\.!@#$^+=-\s\(\)&]/
    let cleaned = pathPart.replace(pattern, "_");

    cleaned = cleaned.trim();

    if (cleaned != pathPart) {
        console.warn(`File name changed from original document title. "${pathPart}" => "${cleaned}"`);
    }

    return cleaned;
}


