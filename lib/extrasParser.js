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

    // En este punto, unificar con lo parseado del CBMEI y agregar el rubro a todo...
    if( fs.existsSync(path) ) {
        var lines = fs.readFileSync(path, 'utf-8').split('\n');
        lines.map((l) => {
            if(l.length > 0) {
                let product = JSON.parse(l);
                items[product.clave.clave_cbm] = product;
            }
        });
    }

    // Leer el archivo de rubros
    path = './rubros.csv';
    let rubros = {};
    if( fs.existsSync(path) ) {
        var lines = fs.readFileSync(path, 'utf-8').split('\n');
        lines.map((l) => {
            if(l.length > 0) {
                let rubro = CSV.parse(l)[0]; // return index 0 directly because only one row is parsed at a time
                rubros[rubro[0]] = rubro[1];
            }
        });
    }

    let itemArray = [];
    Object.keys(items).map( (key) => {
        addRubro(items[key], rubros);
        fieldCheck(items[key]);
        itemArray.push( items[key] );
    });

    return itemArray;
}

function fieldCheck(item) {
    if( !item.hasOwnProperty('descripcion') ) Object.assign(item, { descripcion: "" });
    if( !item.hasOwnProperty('presentacion') ) Object.assign(item, { presentacion: "" });
    if( !item.hasOwnProperty('nombre') ) Object.assign(item, { nombre: "" });
    if( !item.clave.hasOwnProperty('clave_original') ) Object.assign(item.clave, { clave_original: "" });
}

function addRubro(item, rubros) {
    if( rubros.hasOwnProperty(item.clave.clave1_grupo_id) ) {
        Object.assign(item, { rubro: rubros[item.clave.clave1_grupo_id] })
    }
}

function getItemFromLine(line) {
    let cells = CSV.parse(line)[0]; // return index 0 directly because only one row is parsed at a time
    let clave = parseClave(cells[0]);
    let details = parseDetails(clave, cells[1]);

    return {
        id: clave.clave_cbm,
        clave: clave,
        nombre: details.nombre,
        presentacion: details.presentacion,
        descripcion: details.descripcion
    }
}

function parseClave(string) {
    let clave_cbmei = string;
    if(string.length == 11) {
        clave_cbmei = '0' + string;
    }

    return {
        "clave_corta": clave_cbmei.substring(0, 10),
        "clave_cbm": clave_cbmei,
        "clave1_grupo_id": clave_cbmei.substring(0, 3),
        "clave2_especifico_id": clave_cbmei.substring(3, 6),
        "clave3_diferenciador_id": clave_cbmei.substring(6, 10),
        "clave4_variante_id": clave_cbmei.substring(10)
    }
}

function parseDetails(clave, details) {
    let product_name = getProductName(details);
    let presentation = getPresentation(details);
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

function getPresentation(string) {
    let pieces = string.split('. ');

    if(pieces.length == 1) return '';

    if( isValidPresentation(pieces[pieces.length - 1]) ) return pieces[pieces.length - 1];
    else return '';
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
