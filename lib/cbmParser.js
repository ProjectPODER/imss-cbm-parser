function parseFile(lines, ignoreThisParam) {
    let items = [];
    let i = 0;
    let fileEnd = false;

    while(!fileEnd) {
        let groupResult = parseNextGroup(lines, i);
        items.push( ...groupResult.items );
        i = groupResult.endLine;

        if(i >= lines.length) fileEnd = true;
    }

    return items;
}

function parseNextGroup(lines, i) {
    let stop = false;
    let currentGroup = {};

    // Skip until group name is found
    while(!stop) {
        let line = lines[i];
        if( line.match( /^Grupo Nº/ ) ) {
            stop = true;
            currentGroup = getGroupDetailsFromLine(line);
        }
        i++;
        if(i >= lines.length) return { items: [], endLine: i }
    }

    // Parse items belonging to group
    let tempItems = getGroupItemNames(currentGroup, lines, i);
    i += tempItems.length;

    tempItems.map( (item, j) => {
        let nextItem = 'IMPOSSIBLE_TO_MATCH'; // In case it's the last item of the group, make it so this will never match
        if(j+1 < tempItems.length) nextItem = tempItems[j+1].nombre;
        let details = getItemDetails(item.nombre, nextItem, lines, i);

        item['claves'] = details.claves;
        item['descripcion'] = details.descripcion;
        item['indicaciones'] = details.indicaciones;
        item['dosis'] = details.dosis;
        item['generalidades'] = details.generalidades;
        item['riesgo_embarazo'] = details.riesgo_embarazo,
        item['efectos_adversos'] = details.efectos_adversos,
        item['contraindicaciones'] = details.contraindicaciones,
        item['precauciones'] = details.precauciones,
        item['interacciones'] = details.interacciones

        i = details.endLine;
    } );

    return { items: tempItems, endLine: i }
}

function getGroupDetailsFromLine(line) {
    let group = {};
    let fragments = line.split( ": " );

    group['id'] = fragments[0].replace('Grupo Nº ', '');
    group['nombre'] = fragments[1].replace( /\.{2,}.*$/, '' ).trim();

    return group;
}

function getGroupItemNames(group, lines, i) {
    let stop = false;
    let items = [];

    while(!stop) {
        let lineType = getLineType(lines[i]);
        if( lineType == 'group' ) { stop = true }
        else if( lineType == 'empty' || lineType == 'skippable' ) { /* skip line */ }
        else {
            let item = {
                nombre: lines[i].replace( /\.{2,}.*$/, '' ).trim(),
                grupo: group
            }
            items.push(item);
        }
        i++;
    }
    return items;
}

function getItemDetails(name, nextItem, lines, i) {
    // Skip until item name is found
    while(!lines[i].trim().match(name) && lines[i].trim() != name) {
        i++
    }
    i++; // Skip line with item name

    // Gather all lines until next item name or next group heading (if last item)
    let detailLines = [];
    while(!lines[i].trim().match(nextItem) && lines[i].trim() != nextItem && getLineType(lines[i]) != 'group' && i < lines.length - 1) {
        if(getLineType(lines[i]) == 'valid') detailLines.push(lines[i]);
        i++;
    }

    let itemData = parseItemTable(detailLines);
    let [ presentaciones, descripcion ] = extractPresentaciones(itemData[1]);
    let generalidades = getGeneralidades(detailLines);

    return {
        endLine: i,
        claves: getProductKeys(detailLines, presentaciones),
        descripcion: cleanString( descripcion.join('\n') ),
        indicaciones: getIndicaciones(itemData[2]),
        dosis: getDosis(itemData[3]),
        generalidades: generalidades["descripcion"],
        riesgo_embarazo: generalidades["riesgo_embarazo"],
        efectos_adversos: generalidades["efectos_adversos"],
        contraindicaciones: generalidades["contraindicaciones"],
        precauciones: generalidades["precauciones"],
        interacciones: generalidades["interacciones"]
    }
}

function parseItemTable(lines) {
    let colWidths = getColumnWidths(lines[0]);
    let table = [];

    for(let i=1; i<lines.length; i++) {
        if(lines[i].trim() == 'Generalidades') i = lines.length;
        else table.push( splitLineIntoColumns(lines[i], colWidths) );
    }

    let columns = [ [], [], [], [] ];

    for(let i=0; i<table.length; i++) {
        columns[0].push(table[i][0]);
        columns[1].push(table[i][1]);
        columns[2].push(table[i][2]);
        columns[3].push(table[i][3]);
    }

    return columns;
}

function getColumnWidths(line) {
    let keywords = [ 'Clave', 'Descripción', 'Indicaciones', 'Vía de administración y Dosis' ];
    let positions = [];

    keywords.map( k => { positions.push( line.indexOf(k) ) } );

    return positions;
}

function splitLineIntoColumns(line, widths) {
    let columns = [];

    for(let i=0; i<widths.length; i++) {
        let nextWidth = 0;

        if(i == widths.length - 1) nextWidth = line.length;
        else nextWidth = widths[i+1] - 1;

        columns.push(line.substring(widths[i], nextWidth).trim());
    }

    return columns;
}

function extractPresentaciones(lines) {
    let presentaciones = [];
    let descripcion = [];
    let tempPres = '';

    for(let i=0; i<lines.length; i++) {
        if(lines[i].trim().length > 0) {
            if( lines[i].match(/^(Envase|\d\senvase|Un frasco|Jeringa prellenada|Tubo de plástico depresible|Frasco ámpula)/) ) {
                tempPres = lines[i].trim();
                if(tempPres.lastIndexOf('.') != tempPres.length - 1) {
                    let go = true;
                    while(go) {
                        i++;
                        tempPres += ' ' + lines[i].trim();
                        if(tempPres.lastIndexOf('.') == tempPres.length - 1) {
                            presentaciones.push( tempPres.substring(0, tempPres.length - 1) );
                            go = false;
                        }
                    }
                }
                else presentaciones.push( tempPres.substring(0, tempPres.length - 1) );
            }
            else descripcion.push(lines[i]);
        }
    }

    return [ presentaciones, descripcion ];
}

function getProductKeys(lines, details) {
    let claves = [];
    let detailIndex = 0;

    lines.map( (dl) => {
        let keys = dl.match(/\d{3}\.\d{3}\.\d{4}\.\d{2}/g);
        if(keys) {
            keys.map( c => {
                claves.push( { clave: c.replace(/\./g, ''), presentacion: cleanString(details[detailIndex]) } );
                detailIndex++;
            });
        }
    } );

    return claves;
}

function getDosis(lines) {
    let dosis = '';

    lines.map(l => {
        if(l.length > 0) dosis += l.trim() + ' ';
    })

    return cleanString(dosis);
}

function getIndicaciones(lines, debug=false) {
    let indicaciones = [];

    let item = '';
    for(let i=0; i<lines.length; i++) {
        if(lines[i].length > 0) {
            item += ' ' + lines[i].trim();
            if( (item.indexOf('.') == item.length - 1) && (item.length > 0) ) {
                indicaciones.push( cleanString(item) );
                item = '';
            }
        }
    }

    return indicaciones.filter( (item, index) => {
        return indicaciones.indexOf(item) === index
    } );
}

function getGeneralidades(lines) {
    let generalidades = [];
    let start = false;

    for(let i=0; i<lines.length; i++) { // Juntar toda la sección de Generalidades primero
        let line = lines[i].trim();
        if(line == 'Generalidades') start = true;
        if(start) {
            generalidades.push(line);
        }
    }
    if(generalidades == '') return {}; // En caso no exista la sección

    let next = false;
    let k = 0;

    // Sección "Generalidades"
    let descripcion = '';
    while(!next) {
        line = generalidades[k];
        if(!line || line.match(/^(Riesgo en el embarazo|Efectos adversos|Contraindicaciones y Precauciones|Interacciones)/i)) next = true;
        else {
            if(line != 'Generalidades') descripcion += line + ' ';
            k++;
        }
    }

    // Sección "Riesgo en el Embarazo"
    let riesgo_embarazo = '';
    if(line.match(/^Riesgo en el embarazo/i)) {
        riesgo_embarazo = line.replace(/Riesgo en el embarazo/i, '').trim();
        k++;
    }

    // Sección "Efectos adversos"
    let efectos_adversos = '';
    next = false;
    while(!next) {
        line = generalidades[k];
        if(!line || line.match(/^(Contraindicaciones y Precauciones|Interacciones)/i)) next = true;
        else {
            if(line != 'Efectos adversos') efectos_adversos += line + ' ';
            k++;
        }
    }

    // Sección "Contraindicaciones y Precauciones"
    let c_y_p = '';
    next = false;
    while(!next) {
        line = generalidades[k];
        if(!line || line.match(/^(Interacciones)/i)) next = true;
        else {
            if(line != 'Contraindicaciones y Precauciones') c_y_p += line + ' ';
            k++;
        }
    }
    let contraindicaciones = '';
    let precauciones = '';
    if(c_y_p.trim() != '') {
        let parts = c_y_p.split('Precauciones:');
        contraindicaciones = parts[0].replace(/^Contraindicaciones:/, '').trim();
        if(parts.length > 1) precauciones = parts[1].trim();
    }

    // Sección "Interacciones"
    let interacciones = '';
    next = false;
    while(!next) {
        line = generalidades[k];
        if(!line) next = true;
        else {
            if(line != 'Interacciones') interacciones += line + ' ';
            k++;
        }
    }

    return {
        descripcion: cleanString(descripcion),
        riesgo_embarazo: cleanString(riesgo_embarazo),
        efectos_adversos: cleanString(efectos_adversos),
        contraindicaciones: cleanString(contraindicaciones),
        precauciones: cleanString(precauciones),
        interacciones: cleanString(interacciones)
    };
}

function cleanString(string) {
    return string.replace(/\s{2,}/g, ' ').replace('- ', '-').trim();
}

function getLineType(line) {
    if( line.length <= 1 ) return 'empty';
    if( line.match( /\s{2,}\d{1,}$/ ) ) return 'skippable';
    if( line.match( /Grupo Nº/ ) ) return 'group';
    if( line.match( /\w{1,}, \d{1,2} de \w{1,} de \d{4}/ ) ) return 'skippable';
    else return 'valid';
}

function outputJsonItem(item) {
    process.stdout.write( JSON.stringify(item) + '\n' );
}

module.exports = { parseFile, outputJsonItem };
