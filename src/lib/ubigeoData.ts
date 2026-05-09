// Ubigeo data for Peru (Departments, Provinces, Districts)
// Source: Community-processed SUNAT/INEI data

export const DEPARTMENTS = [
  {"id":"01","name":"Amazonas"},
  {"id":"02","name":"Ancash"},
  {"id":"03","name":"Apurimac"},
  {"id":"04","name":"Arequipa"},
  {"id":"05","name":"Ayacucho"},
  {"id":"06","name":"Cajamarca"},
  {"id":"07","name":"Callao"},
  {"id":"08","name":"Cusco"},
  {"id":"09","name":"Huancavelica"},
  {"id":"10","name":"Huanuco"},
  {"id":"11","name":"Ica"},
  {"id":"12","name":"Junin"},
  {"id":"13","name":"La Libertad"},
  {"id":"14","name":"Lambayeque"},
  {"id":"15","name":"Lima"},
  {"id":"16","name":"Loreto"},
  {"id":"17","name":"Madre de Dios"},
  {"id":"18","name":"Moquegua"},
  {"id":"19","name":"Pasco"},
  {"id":"20","name":"Piura"},
  {"id":"21","name":"Puno"},
  {"id":"22","name":"San Martin"},
  {"id":"23","name":"Tacna"},
  {"id":"24","name":"Tumbes"},
  {"id":"25","name":"Ucayali"}
];

// Mappings for common lookup
export const DEPT_MAP: Record<string, string> = {
  "01": "Amazonas", "02": "Ancash", "03": "Apurimac", "04": "Arequipa", "05": "Ayacucho",
  "06": "Cajamarca", "07": "Callao", "08": "Cusco", "09": "Huancavelica", "10": "Huanuco",
  "11": "Ica", "12": "Junin", "13": "La Libertad", "14": "Lambayeque", "15": "Lima",
  "16": "Loreto", "17": "Madre de Dios", "18": "Moquegua", "19": "Pasco", "20": "Piura",
  "21": "Puno", "22": "San Martin", "23": "Tacna", "24": "Tumbes", "25": "Ucayali"
};

// Provinces by Department ID
export const PROVINCES: Record<string, {id: string, name: string}[]> = {
  "01": [{"id":"0101","name":"Chachapoyas"},{"id":"0102","name":"Bagua"},{"id":"0103","name":"Bongara"},{"id":"0104","name":"Condorcanqui"},{"id":"0105","name":"Luya"},{"id":"0106","name":"Rodriguez de Mendoza"},{"id":"0107","name":"Utcubamba"}],
  "02": [{"id":"0201","name":"Huaraz"},{"id":"0202","name":"Aija"},{"id":"0203","name":"Antonio Raymondi"},{"id":"0204","name":"Asuncion"},{"id":"0205","name":"Bolognesi"},{"id":"0206","name":"Carhuaz"},{"id":"0207","name":"Carlos Fermin Fitzcarrald"},{"id":"0208","name":"Casma"},{"id":"0209","name":"Corongo"},{"id":"0210","name":"Huari"},{"id":"0211","name":"Huarmey"},{"id":"0212","name":"Huaylas"},{"id":"0213","name":"Mariscal Luzuriaga"},{"id":"0214","name":"Ocros"},{"id":"0215","name":"Pallasca"},{"id":"0216","name":"Pomabamba"},{"id":"0217","name":"Recuay"},{"id":"0218","name":"Santa"},{"id":"0219","name":"Sihuas"},{"id":"0220","name":"Yungay"}],
  "03": [{"id":"0301","name":"Abancay"},{"id":"0302","name":"Andahuaylas"},{"id":"0303","name":"Antabamba"},{"id":"0304","name":"Aymaraes"},{"id":"0305","name":"Cotabambas"},{"id":"0306","name":"Chincheros"},{"id":"0307","name":"Grau"}],
  "04": [{"id":"0401","name":"Arequipa"},{"id":"0402","name":"Camana"},{"id":"0403","name":"Caraveli"},{"id":"0404","name":"Castilla"},{"id":"0405","name":"Caylloma"},{"id":"0406","name":"Condesuyos"},{"id":"0407","name":"Islay"},{"id":"0408","name":"La Union"}],
  "05": [{"id":"0501","name":"Huamanga"},{"id":"0502","name":"Cangallo"},{"id":"0503","name":"Huanca Sancos"},{"id":"0504","name":"Huanta"},{"id":"0505","name":"La Mar"},{"id":"0506","name":"Lucanas"},{"id":"0507","name":"Parinacochas"},{"id":"0508","name":"Paucar del Sara Sara"},{"id":"0509","name":"Sucre"},{"id":"0510","name":"Victor Fajardo"},{"id":"0511","name":"Vilcas Huaman"}],
  "06": [{"id":"0601","name":"Cajamarca"},{"id":"0602","name":"Cajabamba"},{"id":"0603","name":"Celendin"},{"id":"0604","name":"Chota"},{"id":"0605","name":"Contumaza"},{"id":"0606","name":"Cutervo"},{"id":"0607","name":"Hualgayoc"},{"id":"0608","name":"Jaen"},{"id":"0609","name":"San Ignacio"},{"id":"0610","name":"San Marcos"},{"id":"0611","name":"San Miguel"},{"id":"0612","name":"San Pablo"},{"id":"0613","name":"Santa Cruz"}],
  "07": [{"id":"0701","name":"Callao"}],
  "08": [{"id":"0801","name":"Cusco"},{"id":"0802","name":"Acomayo"},{"id":"0803","name":"Anta"},{"id":"0804","name":"Calca"},{"id":"0805","name":"Canas"},{"id":"0806","name":"Canchis"},{"id":"0807","name":"Chumbivilcas"},{"id":"0808","name":"Espinar"},{"id":"0809","name":"La Convencion"},{"id":"0810","name":"Paruro"},{"id":"0811","name":"Paucartambo"},{"id":"0812","name":"Quispicanchi"},{"id":"0813","name":"Urubamba"}],
  "09": [{"id":"0901","name":"Huancavelica"},{"id":"0902","name":"Acobamba"},{"id":"0903","name":"Angaraes"},{"id":"0904","name":"Castrovirreyna"},{"id":"0905","name":"Churcampa"},{"id":"0906","name":"Huaytara"},{"id":"0907","name":"Tayacaja"}],
  "10": [{"id":"1001","name":"Huanuco"},{"id":"1002","name":"Ambo"},{"id":"1003","name":"Dos de Mayo"},{"id":"1004","name":"Huacaybamba"},{"id":"1005","name":"Huamalies"},{"id":"1006","name":"Leoncio Prado"},{"id":"1007","name":"Marañon"},{"id":"1008","name":"Pachitea"},{"id":"1009","name":"Puerto Inca"},{"id":"1010","name":"Lauricocha"},{"id":"1011","name":"Yarowilca"}],
  "11": [{"id":"1101","name":"Ica"},{"id":"1102","name":"Chincha"},{"id":"1103","name":"Nazca"},{"id":"1104","name":"Palpa"},{"id":"1105","name":"Pisco"}],
  "12": [{"id":"1201","name":"Huancayo"},{"id":"1202","name":"Concepcion"},{"id":"1203","name":"Chanchamayo"},{"id":"1204","name":"Jauja"},{"id":"1205","name":"Junin"},{"id":"1206","name":"Satipo"},{"id":"1207","name":"Tarma"},{"id":"1208","name":"Yauli"},{"id":"1209","name":"Chupaca"}],
  "13": [{"id":"1301","name":"Trujillo"},{"id":"1302","name":"Ascope"},{"id":"1303","name":"Bolivar"},{"id":"1304","name":"Chepen"},{"id":"1305","name":"Julcan"},{"id":"1306","name":"Otuzco"},{"id":"1307","name":"Pacasmayo"},{"id":"1308","name":"Pataz"},{"id":"1309","name":"Sanchez Carrion"},{"id":"1310","name":"Santiago de Chuco"},{"id":"1311","name":"Gran Chimu"},{"id":"1312","name":"Viru"}],
  "14": [{"id":"1401","name":"Chiclayo"},{"id":"1402","name":"Ferreñafe"},{"id":"1403","name":"Lambayeque"}],
  "15": [{"id":"1501","name":"Lima"},{"id":"1502","name":"Barranca"},{"id":"1503","name":"Cajatambo"},{"id":"1504","name":"Canta"},{"id":"1505","name":"Cañete"},{"id":"1506","name":"Huaral"},{"id":"1507","name":"Huarochiri"},{"id":"1508","name":"Huaura"},{"id":"1509","name":"Oyon"},{"id":"1510","name":"Yauyos"}],
  "16": [{"id":"1601","name":"Maynas"},{"id":"1602","name":"Alto Amazonas"},{"id":"1603","name":"Loreto"},{"id":"1604","name":"Mariscal Ramon Castilla"},{"id":"1605","name":"Requena"},{"id":"1606","name":"Ucayali"},{"id":"1607","name":"Datem del Marañon"},{"id":"1608","name":"Putumayo"}],
  "17": [{"id":"1701","name":"Tambopata"},{"id":"1702","name":"Manu"},{"id":"1703","name":"Tahuamanu"}],
  "18": [{"id":"1801","name":"Mariscal Nieto"},{"id":"1802","name":"General Sanchez Cerro"},{"id":"1803","name":"Ilo"}],
  "19": [{"id":"1901","name":"Pasco"},{"id":"1902","name":"Daniel Alcides Carrion"},{"id":"1903","name":"Oxapampa"}],
  "20": [{"id":"2001","name":"Piura"},{"id":"2002","name":"Ayabaca"},{"id":"2003","name":"Huancabamba"},{"id":"2004","name":"Morropon"},{"id":"2005","name":"Paita"},{"id":"2006","name":"Sullana"},{"id":"2007","name":"Talara"},{"id":"2008","name":"Sechura"}],
  "21": [{"id":"2101","name":"Puno"},{"id":"2102","name":"Azangaro"},{"id":"2103","name":"Carabaya"},{"id":"2104","name":"Chucuito"},{"id":"2105","name":"El Collao"},{"id":"2106","name":"Huancane"},{"id":"2107","name":"Lampa"},{"id":"2108","name":"Melgar"},{"id":"2109","name":"Moho"},{"id":"2110","name":"San Antonio de Putina"},{"id":"2111","name":"San Roman"},{"id":"2112","name":"Sandia"},{"id":"2113","name":"Yunguyo"}],
  "22": [{"id":"2201","name":"Moyobamba"},{"id":"2202","name":"Bellavista"},{"id":"2203","name":"El Dorado"},{"id":"2204","name":"Huallaga"},{"id":"2205","name":"Lamas"},{"id":"2206","name":"Mariscal Caceres"},{"id":"2207","name":"Picota"},{"id":"2208","name":"Rioja"},{"id":"2209","name":"San Martin"},{"id":"2210","name":"Tocache"}],
  "23": [{"id":"2301","name":"Tacna"},{"id":"2302","name":"Candarave"},{"id":"2303","name":"Jorge Basadre"},{"id":"2304","name":"Tarata"}],
  "24": [{"id":"2401","name":"Tumbes"},{"id":"2402","name":"Contralmirante Villar"},{"id":"2403","name":"Zarumilla"}],
  "25": [{"id":"2501","name":"Coronel Portillo"},{"id":"2502","name":"Atalaya"},{"id":"2503","name":"Padre Abad"},{"id":"2504","name":"Purus"}]
};

// Simplified Districts (Lima as main example, others can be lazy loaded or added)
export const DISTRICTS: Record<string, {id: string, name: string}[]> = {
  "1501": [{"id":"150101","name":"Lima"},{"id":"150102","name":"Ancon"},{"id":"150103","name":"Ate"},{"id":"150104","name":"Barranco"},{"id":"150105","name":"Breña"},{"id":"150106","name":"Carabayllo"},{"id":"150107","name":"Chaclacayo"},{"id":"150108","name":"Chorrillos"},{"id":"150109","name":"Cieneguilla"},{"id":"150110","name":"Comas"},{"id":"150111","name":"El Agustino"},{"id":"150112","name":"Independencia"},{"id":"150113","name":"Jesus Maria"},{"id":"150114","name":"La Molina"},{"id":"150115","name":"La Victoria"},{"id":"150116","name":"Lince"},{"id":"150117","name":"Los Olivos"},{"id":"150118","name":"Lurigancho"},{"id":"150119","name":"Lurin"},{"id":"150120","name":"Magdalena del Mar"},{"id":"150121","name":"Miraflores"},{"id":"150122","name":"Pueblo Libre"},{"id":"150123","name":"Pucusana"},{"id":"150124","name":"Puente Piedra"},{"id":"150125","name":"Punta Hermosa"},{"id":"150126","name":"Punta Negra"},{"id":"150127","name":"Rimac"},{"id":"150128","name":"San Bartolo"},{"id":"150129","name":"San Borja"},{"id":"150130","name":"San Isidro"},{"id":"150131","name":"San Juan de Lurigancho"},{"id":"150132","name":"San Juan de Miraflores"},{"id":"150133","name":"San Luis"},{"id":"150134","name":"San Martin de Porres"},{"id":"150135","name":"San Miguel"},{"id":"150136","name":"Santa Anita"},{"id":"150137","name":"Santa Maria del Mar"},{"id":"150138","name":"Santa Rosa"},{"id":"150139","name":"Santiago de Surco"},{"id":"150140","name":"Surquillo"},{"id":"150141","name":"Villa El Salvador"},{"id":"150142","name":"Villa Maria del Triunfo"}],
  "1401": [{"id":"140101","name":"Chiclayo"},{"id":"140102","name":"Chongoyape"},{"id":"140103","name":"Eten"},{"id":"140104","name":"Eten Puerto"},{"id":"140105","name":"Jose Leonardo Ortiz"},{"id":"140106","name":"La Victoria"},{"id":"140107","name":"Lagunas"},{"id":"140108","name":"Monsefu"},{"id":"140109","name":"Nueva Arica"},{"id":"140110","name":"Oyotun"},{"id":"140111","name":"Picsi"},{"id":"140112","name":"Pimentel"},{"id":"140113","name":"Reque"},{"id":"140114","name":"Santa Rosa"},{"id":"140115","name":"Saa"},{"id":"140116","name":"Cayalti"},{"id":"140117","name":"Patapo"},{"id":"140118","name":"Pomalca"},{"id":"140119","name":"Pucala"},{"id":"140120","name":"Tumán"}]
};

export const getDeptId = (name: string) => DEPARTMENTS.find(d => d.name.toUpperCase() === name.toUpperCase())?.id || "";
export const getProvId = (deptId: string, name: string) => PROVINCES[deptId]?.find(p => p.name.toUpperCase() === name.toUpperCase())?.id || "";
export const getDistId = (provId: string, name: string) => DISTRICTS[provId]?.find(d => d.name.toUpperCase() === name.toUpperCase())?.id || "";
