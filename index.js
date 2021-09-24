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

    console.log(`${filesBody.files.length} folders and documents found in Dynalist account.`);

    /**
     * Replaces the children array of node ids, with an array of the actual child node objects
     * @param {*} folderNode 
     */
    function replaceChildren(folderNode) {

        if (folderNode.type != "folder") throw "node.type != folder passed to replaceChildren";

        let childNodes = [];


        function cleanPathPart(pathPart) {
            const pattern = /[^\w\.!@#$^+=-\s\(\)&]/
            let cleaned = pathPart.replace(pattern, "_");
            cleaned = cleaned.trim();
            return cleaned;
        }

        for (let childNodeId of folderNode.children) {

            //Find the childNode
            let childNodeIndex = filesBody.files.findIndex(f => f.id === childNodeId);
            if (childNodeIndex == -1) throw `File ID not found: ${childNodeId}`
            let childNode = filesBody.files[childNodeIndex];


            if (childNode.type == "folder") {

                let folderName = cleanPathPart(childNode.title);

                childNode.path = path.join(folderNode.path, folderName);

                if (childNode.title != folderName) {
                    console.warn(`Folder name changed from original title: "${childNode.title}" => "${folderName}"`);
                }

                replaceChildren(childNode);
            }
            else if (childNode.type == "document") {

                let fileName = cleanPathPart(childNode.title);

                if (childNode.title != fileName) {
                    console.warn(`File name changed from original document title: "${childNode.title}" => "${fileName}.md"`);
                }

                childNode.path = path.join(folderNode.path, fileName + ".md");
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
 * @param {*} folderFile The folderNode to import*
 * @param {*} files Flat list of files nodes from API
 */
function importFolder(folderFile, files) {

    function importFolderContents() {
        for (let childFile of folderFile.children) {
            if (childFile.type == "folder") importFolder(childFile, files);
            else if (childFile.type == "document") {

                fs.access(childFile.path, function (err) {
                    if (err) queueDocumentFile(childFile, files)
                    else console.error(`Skipping document "${childFile.title}". Existing file found: ${childFile.path}`);
                });
            }
            else throw `Unexpected file.type: ${file.type}`
        }
    }

    //Attempt to access folder.path
    fs.access(folderFile.path, function (err) {

        if (err) {

            //Create folder if it doesn't exist
            console.log(`Creating folder: ${folderFile.path}`);
            fs.mkdir(folderFile.path, function (err) {

                if (err) {
                    console.error(err)
                    throw err;
                }
                else {
                    importFolderContents();
                }
            });
        }
        else {
            //Check if existing folder is empty
            fs.readdir(folderFile.path, function (err, folderContents) {
                if (err) {
                    console.error(err);
                    throw err;
                }
                else if (folderContents.length > 0) {
                    let errMess = `Existing folder is not empty: ${folderFile.path}`;
                    console.warn(errMess);
                    importFolderContents();
                }
                else {
                    console.log(`Existing folder found: ${folderFile.path}`);
                    importFolderContents();
                }
            })
        }
    })
}


let documentFileQueue = [];

/**
 * Reads the document from dynalist.io/api/v1/doc/read and passes the results to the writeMdFile function
 * @param {*} documentFile 
 * @param {*} files A collection of all files in the account
 */
function queueDocumentFile(documentFile, files) {

    //push file the queue
    if (documentFileQueue.length == 0) {
        documentFileQueue.push(documentFile);
        fetchNextDocument(files);
    }
    else documentFileQueue.push(documentFile);
}



/**
 * Fetch the next document in documentFileQueue
 * @param {*} files 
 */
function fetchNextDocument(files) {
    let nextDocumentFile = documentFileQueue[0];

    console.log(`Fetching document: ${nextDocumentFile.title} (id:${nextDocumentFile.id})`);

    fetch("https://dynalist.io/api/v1/doc/read", {
        "method": 'POST',
        "content-type": 'application/json',
        "body": JSON.stringify({
            token: config.credentials.token,
            file_id: nextDocumentFile.id
        })
    })
        .then(res => res.json())
        .then((respBody) => handleReadDocResponse(respBody, files))
        .catch(err => console.error(err));
}



/**
 * Handle a response from fetching a document from dynalist.io/api/v1/doc/read
 * @param {*} documentBody 
 * @param {*} files 
 */
function handleReadDocResponse(documentBody, files) {

    if (documentBody._code == "Ok") {
        //remove first document from the queue
        let documentFile = documentFileQueue.shift();

        //pass the doc body to writeMDFile
        writeMdFile(documentBody, documentFile, files);

        //Determine if there are more files
        if (documentFileQueue.length > 0) {
            setTimeout(fetchNextDocument, config.requestInterval);
        }
    }
    else {
        console.error(JSON.stringify(documentBody, null, 4));
    }
}



/**
 * Write a MD file from the nodes in in documentBody
 * @param {*} documentBody The document nodes to write to the file
 * @param {*} documentFile The file currently being created
 * @param {*} files  All files to reference for creating links
 */
function writeMdFile(documentBody, documentFile, files) {

    fs.access(documentFile.path, function (err) {

        if (err) {

            console.log(`Creating file: ${documentFile.path}`);
            let writeStream = fs.createWriteStream(documentFile.path);

            writeStream.on('finish', function () {
                console.log(`Completed writing file: ${documentFile.path}`)
            });



            //Detrmines if line breaks need to be proceded with double spaces
            let lineBreak;
            if (config.strictLineBreaks) lineBreak = "  \n";
            else lineBreak = "\n";


            function writeNode(node, level, number) {

                let contentLines = node.content.split(/\r?\n/);

                //Creates the indent from the level
                let indent;
                if (config.useTab) indent = "\t";
                else indent = "\s".repeat(config.tabSize);

                for (let lineIdx = 0; lineIdx < contentLines.length; lineIdx++) {


                    //Indent the line
                    writeStream.write(indent.repeat(level));

                    if (lineIdx == 0) {

                        //Write bullet on first line only
                        //Currently the Dynalist API does not identify numbered lists so we're stuck with this for now
                        if (number) {
                            writeStream.write(`${number}. `)
                        }
                        else writeStream.write("- ");


                        //Checkbox
                        let checkBox = "";
                        if (node.checked && (node.checkbox || config.addCheckBoxes)) {
                            checkBox = "[X] "
                        }
                        else if (node.checkbox) {
                            checkBox = "[ ] "
                        }
                        writeStream.write(checkBox);

                        //Heading Mark
                        let heading = "";
                        if (node.heading && node.heading > 0) {
                            heading = "#".repeat(node.heading) + " ";
                        }
                        writeStream.write(heading);
                    }
                    else {
                        //If writing an additional line just add an additional indent
                        writeStream.write(indent);
                    }

                    //Write Line Content
                    let contentLine = contentLines[lineIdx];

                    try {
                        writeStream.write(contentLine);
                    }
                    catch (err) {
                        console.error(err);
                    }


                    //Writes a #color-xxxx tag 
                    if (lineIdx == 0) {
                        if (node.color && config.colorTags.length > node.color) {
                            let colorTag = ` ${config.colorTags[node.color]}`
                            writeStream.write(colorTag);
                        }
                    }

                    //Adds Line break to end of line
                    writeStream.write(lineBreak);


                } //end of conten line loop


                //Writes node note as first child
                if (node.note) {
                    let noteNode = {
                        content: node.note
                    }
                    writeNode(noteNode, level + 1);
                }

                //Write child nodes
                if (node.children && node.children.length > 0) {
                    for (let i = 0; i < node.children.length; i++) {
                        let childNodeId = node.children[i];
                        let child = documentBody.nodes.find(n => n.id === childNodeId);
                        if (node.numbered) writeNode(child, level + 1, i + 1);
                        else writeNode(child, level + 1);
                    }
                }
            }


            //Get the root node of the document
            let rootNode = documentBody.nodes.find(n => n.id == "root");

            //Write the root node header if enabled
            if (config.rootNodeHeader) {
                writeStream.write("# ");
                writeStream.write(rootNode.content);
                writeStream.write(lineBreak);
            }



            //Write note
            if (rootNode.note) {
                let noteLines = rootNode.note.split(/\r?\n/);
                for (let noteLine of noteLines) {
                    writeStream.write(noteLine);
                    writeStream.write(lineBreak);
                }
            }






            if (rootNode.children && rootNode.children.length > 0) {

                for (let i = 0; i < rootNode.children.length; i++) {
                    let childNodeId = rootNode.children[i];
                    let child = documentBody.nodes.find(n => n.id === childNodeId);

                    if (rootNode.numbered) writeNode(child, 0, i + 1);
                    else writeNode(child, 0);
                }
            }

            writeStream.end();
        }
        else console.error(`Existing file found: ${documentFile.path}`);
    });
}








