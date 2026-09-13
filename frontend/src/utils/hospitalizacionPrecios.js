// Tarifas de hospitalización por 24h, según "Precios Hospitalizacion.xlsx".
// Cada bracket usa peso mínimo (kg); se toma el bracket de mayor "min" que
// el peso alcance. Si el peso supera el bracket más alto disponible (ej.
// perro viral >40kg, o cualquier gato >15kg — no cubiertos en la tabla
// original), se usa automáticamente la tarifa más alta de esa categoría.
const TARIFAS = {
  Gato: {
    no_viral: [
      { min: 0,   valor: 190000 },
      { min: 5.1, valor: 210000 },
    ],
    viral: [
      { min: 0,   valor: 230000 },
      { min: 5.1, valor: 250000 },
    ],
  },
  Perro: {
    no_viral: [
      { min: 0,    valor: 190000 },
      { min: 5.1,  valor: 230000 },
      { min: 10.1, valor: 260000 },
      { min: 15.1, valor: 300000 },
      { min: 20.1, valor: 330000 },
      { min: 25.1, valor: 350000 },
      { min: 30.1, valor: 380000 },
      { min: 40.1, valor: 400000 },
    ],
    viral: [
      { min: 0,    valor: 250000 },
      { min: 5.1,  valor: 300000 },
      { min: 10.1, valor: 330000 },
      { min: 15.1, valor: 360000 },
      { min: 20.1, valor: 380000 },
      { min: 25,   valor: 400000 }, // exactamente 25kg -> tarifa alta (confirmado con Guillermo)
    ],
  },
};

const OBSTRUCCION_URINARIA_GATO = 330000;

function buscarTarifa(brackets, weight) {
  let mejor = brackets[0].valor;
  for (const b of brackets) if (weight >= b.min) mejor = b.valor;
  return mejor;
}

// tipo: 'completa' | 'semi' (semi paga 60% de la tarifa de 24h)
// esPrimerPeriodo: la tarifa fija de obstrucción urinaria SOLO aplica a las
// primeras 24h. Del segundo día en adelante se cobra como hospitalización
// normal (según especie/viral/peso), aunque el paciente siga con la sonda.
export function calcularValorHospitalizacion({ species, weight, viral, obstruccionUrinaria, tipo, esPrimerPeriodo = true }) {
  let base;
  if (species === 'Gato' && obstruccionUrinaria && esPrimerPeriodo) {
    base = OBSTRUCCION_URINARIA_GATO;
  } else {
    const tablaEspecie = TARIFAS[species] || TARIFAS.Perro;
    const brackets = viral ? tablaEspecie.viral : tablaEspecie.no_viral;
    base = buscarTarifa(brackets, Number(weight) || 0);
  }
  return tipo === 'semi' ? Math.round(base * 0.6) : base;
}

const DIA_MS = 24 * 60 * 60 * 1000;

// Calcula qué ítems "Hospitalización D-D" deberían existir a esta hora para
// una hospitalización activa, y cuáles de esos faltan en su hoja de consumo.
export function calcularItemsHospitalizacionFaltantes(hosp, ahora = new Date()) {
  if (!hosp?.ingreso_date || !hosp?.ingreso_time || hosp.status !== 'activo') return [];

  const ingresoDT = new Date(`${hosp.ingreso_date}T${hosp.ingreso_time}`);
  if (Number.isNaN(ingresoDT.getTime())) return [];

  const elapsedMs = ahora.getTime() - ingresoDT.getTime();
  if (elapsedMs < 0) return [];

  const periodosNecesarios = Math.floor(elapsedMs / DIA_MS) + 1;
  const descripcionesExistentes = new Set((hosp.consumo || []).map(it => it.descripcion));

  const faltantes = [];
  for (let i = 0; i < periodosNecesarios; i++) {
    const inicio = new Date(ingresoDT.getTime() + i * DIA_MS);
    const fin = new Date(ingresoDT.getTime() + (i + 1) * DIA_MS);
    const descripcion = `Hospitalización ${inicio.getDate()}-${fin.getDate()}`;
    if (descripcionesExistentes.has(descripcion)) continue;

    const yyyy = inicio.getFullYear();
    const mm = String(inicio.getMonth() + 1).padStart(2, '0');
    const dd = String(inicio.getDate()).padStart(2, '0');

    const valor = calcularValorHospitalizacion({
      species: hosp.species,
      weight: hosp.weight,
      viral: !!hosp.viral,
      obstruccionUrinaria: !!hosp.obstruccion_urinaria,
      tipo: hosp.tipo,
      esPrimerPeriodo: i === 0,
    });

    faltantes.push({
      id: Date.now() + i,
      descripcion,
      cantidad: '1',
      valor,
      fecha: `${yyyy}-${mm}-${dd}`,
      hora: hosp.ingreso_time,
      registrado_por: 'Sistema (automático)',
    });
  }
  return faltantes;
}
