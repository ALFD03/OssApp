import { describe, expect, it } from 'vitest';
import {
  APP_POR_ROL,
  ROLES,
  accionesDe,
  destinosSecundarios,
  esRol,
  licenciaPermiteOperar,
  pestanasDe,
  puede,
  requiereDojo,
  rutasDeApp,
} from '../src';

describe('roles', () => {
  it('reconoce solo los roles del enum', () => {
    expect(esRol('maestro')).toBe(true);
    expect(esRol('admin')).toBe(false);
    expect(esRol(null)).toBe(false);
  });

  it('solo el superadmin opera fuera de un dojo', () => {
    for (const rol of ROLES) {
      expect(requiereDojo(rol)).toBe(rol !== 'superadmin');
    }
  });
});

describe('permisos', () => {
  it('el sensei es un subconjunto estricto del maestro', () => {
    const maestro = new Set(accionesDe('maestro'));
    const sensei = accionesDe('sensei');
    for (const accion of sensei) {
      expect(maestro.has(accion)).toBe(true);
    }
    expect(sensei.length).toBeLessThan(maestro.size);
  });

  it('el sensei no gestiona alumnos, pagos ni otros sensei', () => {
    expect(puede('sensei', 'alumnos.gestionar')).toBe(false);
    expect(puede('sensei', 'pagos.verificar')).toBe(false);
    expect(puede('sensei', 'sensei.gestionar')).toBe(false);
  });

  it('ningun rol de dojo toca acciones de plataforma', () => {
    for (const rol of ROLES) {
      if (rol === 'superadmin') continue;
      expect(accionesDe(rol).some((a) => a.startsWith('plataforma.'))).toBe(false);
    }
    expect(puede('superadmin', 'plataforma.dojos.administrar')).toBe(true);
  });

  it('el superadmin no opera datos de un dojo concreto', () => {
    expect(puede('superadmin', 'alumnos.gestionar')).toBe(false);
    expect(puede('superadmin', 'pagos.verificar')).toBe(false);
    expect(puede('superadmin', 'asistencia.marcar.manual')).toBe(false);
  });

  it('solo las familias escanean el QR y solo el staff lo genera', () => {
    expect(puede('alumno', 'asistencia.escanear.qr')).toBe(true);
    expect(puede('representante', 'asistencia.escanear.qr')).toBe(true);
    expect(puede('maestro', 'asistencia.escanear.qr')).toBe(false);
    expect(puede('maestro', 'asistencia.qr.generar')).toBe(true);
    expect(puede('alumno', 'asistencia.qr.generar')).toBe(false);
  });

  it('el alumno no sube comprobantes: lo hace su representante', () => {
    expect(puede('representante', 'pagos.comprobante.subir')).toBe(true);
    expect(puede('alumno', 'pagos.comprobante.subir')).toBe(false);
    expect(puede('alumno', 'pagos.propios.ver')).toBe(true);
  });
});

describe('navegacion', () => {
  it('cada rol tiene pestanas y todas son unicas', () => {
    for (const rol of ROLES) {
      const rutas = pestanasDe(rol).map((p) => p.ruta);
      expect(rutas.length).toBeGreaterThan(0);
      expect(new Set(rutas).size).toBe(rutas.length);
      expect(rutas).toContain('index');
    }
  });

  it('agrupa las rutas de los roles de cada app sin duplicados', () => {
    const staff = rutasDeApp(ROLES.filter((r) => APP_POR_ROL[r] === 'staff'));
    expect(new Set(staff).size).toBe(staff.length);
    expect(staff).toContain('metricas');
    expect(staff).not.toContain('progreso');

    const familias = rutasDeApp(ROLES.filter((r) => APP_POR_ROL[r] === 'familias'));
    expect(familias).toContain('progreso');
    expect(familias).not.toContain('metricas');
  });
});

describe('licencias', () => {
  it('solo activa y prueba permiten operar', () => {
    expect(licenciaPermiteOperar('activa')).toBe(true);
    expect(licenciaPermiteOperar('prueba')).toBe(true);
    expect(licenciaPermiteOperar('suspendida')).toBe(false);
    expect(licenciaPermiteOperar('vencida')).toBe(false);
  });
});

describe('pantalla Mas', () => {
  it('ningun destino secundario duplica una pestana del mismo rol', () => {
    for (const rol of ROLES) {
      const enPestanas = new Set(pestanasDe(rol).map((p) => p.ruta));
      for (const destino of destinosSecundarios(rol)) {
        expect(enPestanas.has(destino.ruta)).toBe(false);
      }
    }
  });

  it('todo rol llega a su perfil, por pestana o por Mas', () => {
    for (const rol of ROLES) {
      const alcanzables = [
        ...pestanasDe(rol).map((p) => p.ruta),
        ...destinosSecundarios(rol).map((d) => d.ruta),
      ];
      expect(alcanzables).toContain('perfil');
    }
  });

  it('no hay mas de cinco pestanas: no caben en un movil', () => {
    for (const rol of ROLES) {
      expect(pestanasDe(rol).length).toBeLessThanOrEqual(5);
    }
  });

  it('quien tiene pestana Mas tiene destinos que mostrar', () => {
    for (const rol of ROLES) {
      const tieneMas = pestanasDe(rol).some((p) => p.ruta === 'mas');
      expect(tieneMas).toBe(destinosSecundarios(rol).length > 0);
    }
  });

  it('rutasDeApp incluye tambien los destinos secundarios', () => {
    const staff = rutasDeApp(ROLES.filter((r) => APP_POR_ROL[r] === 'staff'));
    expect(staff).toContain('grados');
    expect(staff).toContain('asistencia');
  });
});
