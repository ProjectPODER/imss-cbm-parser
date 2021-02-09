const fs = require('fs');
const CSV = require('csv-string');

function parseFile(lines, path) {
    let items = {};

    lines.map( (line, index) => {
        if(line.length > 0) {
            let item = getItemFromLine(line);
            items[item.clave.clave_cbm] = item;
        }
    } );

    // En este punto, unificar con lo parseado del CBM...
    if( fs.existsSync(path) ) {
        var lines = fs.readFileSync(path, 'utf-8').split('\n');
        lines.map((l) => {
            if(l.length > 0) {
                let product = JSON.parse(l);
                if(product.claves.length > 0) {
                    product.claves.map( clave => {
                        if(items.hasOwnProperty(clave.clave)) {
                            mergeProducts(items[clave.clave], product);
                        }
                    } );
                }
            }
        });
    }

    // process.stdout.write( CSV.stringify(["CLAVE", "NOMBRE", "PRESENTACION", "DESCRIPCION"]) );
    // Object.keys(items).map( (key) => {
    //     let item = items[key];
    //     process.stdout.write( CSV.stringify([item.clave.clave_cbm, item.nombre, item.presentacion, item.descripcion]) );
    // } );

    let itemArray = [];
    Object.keys(items).map( (key) => { itemArray.push( items[key] ) } );

    return itemArray;
}

function mergeProducts(item, product) {
    if(product.hasOwnProperty('grupo'))                 Object.assign(item, { grupo: product.grupo });
    if(product.hasOwnProperty('indicaciones'))          Object.assign(item, { indicaciones: product.indicaciones });
    if(product.hasOwnProperty('dosis'))                 Object.assign(item, { dosis: product.dosis });
    if(product.hasOwnProperty('generalidades'))         Object.assign(item, { generalidades: product.generalidades });
    if(product.hasOwnProperty('riesgo_embarazo'))       Object.assign(item, { riesgo_embarazo: product.riesgo_embarazo });
    if(product.hasOwnProperty('efectos_adversos'))      Object.assign(item, { efectos_adversos: product.efectos_adversos });
    if(product.hasOwnProperty('contraindicaciones'))    Object.assign(item, { contraindicaciones: product.contraindicaciones });
    if(product.hasOwnProperty('precauciones'))          Object.assign(item, { precauciones: product.precauciones });
    if(product.hasOwnProperty('interacciones'))         Object.assign(item, { interacciones: product.interacciones });
}

function getItemFromLine(line) {
    let cells = CSV.parse(line)[0]; // return index 0 directly because only one row is parsed at a time
    let clave = parseClave(cells[0]);
    let details = parseDetails(clave, cells[1], cells[2]);

    return {
        id: clave.clave_cbm,
        clave: clave,
        nombre: details.nombre,
        presentacion: details.presentacion,
        descripcion: details.descripcion
    };
}

function parseClave(string) {
    let clave_cbmei = string.replace(/\./g, '');
    let parts = string.split('.');
    return {
        "clave_original": string,
        "clave_cbm": clave_cbmei,
        "clave1_grupo_id": parts[0],
        "clave2_especifico_id": parts[1],
        "clave3_diferenciador_id": parts[2],
        "clave4_variante_id": ( (parts.length > 3)? parts[3] : null )
    }
}

function parseDetails(clave, details, unit) {
    let product_name = getProductName(details);
    let presentation = getPresentation(details, unit);
    let description = getDescription(product_name, details, presentation);

    return {
        nombre: cleanString( product_name.toUpperCase()),
        descripcion: cleanString(description),
        presentacion: cleanString(presentation)
    };
}

function getProductName(string) {
    return string.split('.')[0];
}

function getPresentation(string, unit) {
    let pieces = string.split('. ');

    if( isValidPresentation(pieces[pieces.length - 1]) ) return pieces[pieces.length - 1];
    else return unit;
}

const presentaciones = [
    '\\(\\d* y \\d*\\) ampolletas',
    '\\d* cartuchos',
    '\\d* tarjetas de prueba',
    '\\d* envases',
    '\\d* frascos',
    '\\d* placas',
    'Ampolleta',
    'Barra de \\d*',
    'Block con \\d*',
    'Bolsa',
    'Bote',
    'Botella',
    'Bulto o paquete',
    'Caja',
    'Carrete',
    'Cartucho',
    'Diluyente amortiguador',
    'Dos reactivos',
    'Envase',
    'Envase:',
    'Envases',
    'Equipo',
    'Estuche',
    'Frasco',
    'Frascos',
    'Jeringa',
    'Juego',
    'Kit',
    'Lata',
    'Metro',
    'Mínimo \\d* pruebas',
    'Montaje para',
    'Paquete',
    'Par',
    'Para \\d*',
    'Pieza',
    'Para mínimo \\d*',
    'Placa de gel',
    'Placa para',
    'Pluma',
    'Presentacion',
    'Prueba RTC',
    'Revelador',
    'Rollo',
    'Sobre',
    'Solución',
    'Tubo',
    'Unidad o envase colectivo',
    'Unidosis',
    'Vaso de plástico',
    'Vial'
];

function isValidPresentation(string) {
    var re = new RegExp('^(' + presentaciones.join("|") + ')\\s', "i");
    if( re.test(string) ) return true;
    return false;
}

function getDescription(name, string, presentation) {
    let pieces = string.split('. ');
    let description = [];

    pieces.map( piece => {
        if(piece != name && piece != presentation) description.push(piece);
    } )

    return description.join('. ');
}

function cleanString(string) {
    return string.replace(/\s{2,}/g, ' ').replace('- ', '-').trim();
}

function outputJsonItem(item) {
    process.stdout.write( JSON.stringify(item) + '\n' );
}

module.exports = { parseFile, outputJsonItem };
