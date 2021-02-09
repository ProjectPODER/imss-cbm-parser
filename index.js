const fs = require('fs');
const commandLineArgs = require('command-line-args');
const CSV = require('csv-string');

const optionDefinitions = [
    { name: 'file', alias: 'f', type: String },
    { name: 'type', alias: 't', type: String },
    { name: 'cbm', alias: 'c', type: String, defaultValue: '' } // path to parsed CBM file to merge with CBMEI
];
const args = commandLineArgs(optionDefinitions);
if(!args.type) {
    console.error('ERROR: must specify a type of file to parse!');
    process.exit(500);
}
const parser = require('./lib/' + args.type + 'Parser');

const fileContents = getFileContents(args.file);
let items = parser.parseFile(fileContents, args.cbm);

items.map( item => {
    parser.outputJsonItem(item);
} );

// process.stdout.write( CSV.stringify(["INDICACION", "CLAVE", "NOMBRE", "PRESENTACION"]) );
// items.map( item => {
//     item.claves.map( clave => {
//         item.indicaciones.map( indicacion => {
//             process.stdout.write( CSV.stringify([indicacion, clave.clave, item.nombre, clave.presentacion]) );
//         } );
//     } );
// } );
// process.exit(0);

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getFileContents(filename) {
    let path = './' + filename;
    if( fs.existsSync(path) ) {
        return fs.readFileSync(path, 'utf-8').split('\n');
    }

    console.error('File not found.');
    process.exit(1);
}
