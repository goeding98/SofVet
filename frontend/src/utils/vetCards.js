// Tarjetas / matrículas profesionales por nombre de usuario
const MAP = [
  { nombre: 'jessica hincapie',          tp: 'TP 54005'  },
  { nombre: 'diego paris',               tp: 'TP 57719'  },
  { nombre: 'josé alejandro estupiñan',  tp: 'TP 54472'  },
  { nombre: 'jose alejandro estupinan',  tp: 'TP 54472'  },
  { nombre: 'kamyla',                    tp: 'TP 55216'  },
  { nombre: 'maría alejandra martínez',  tp: 'TP 37599'  },
  { nombre: 'maria alejandra martinez',  tp: 'TP 37599'  },
  { nombre: 'juliana ricci murillo',     tp: 'TP 57714'  },
  { nombre: 'karen zapata',              tp: 'Rpp 81'    },
  { nombre: 'juan bejarano',             tp: 'TP 31019'  },
  { nombre: 'giovanny pasos',            tp: 'TP 16097'  },
  { nombre: 'giovanny passos',           tp: 'TP 16097'  },
  { nombre: 'geraldine sanchez',         tp: 'TP 58624'  },
  { nombre: 'geraldine sánchez',         tp: 'TP 58624'  },
];

export function getTP(nombre) {
  if (!nombre) return null;
  const key = nombre.toLowerCase().trim();
  for (const { nombre: n, tp } of MAP) {
    if (key === n || key.includes(n) || n.includes(key)) return tp;
  }
  return null;
}
