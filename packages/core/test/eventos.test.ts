import { describe, expect, it } from 'vitest';
import {
  diasHasta,
  esGratuito,
  eventoLleno,
  haceCuanto,
  nombrePeriodo,
  periodoDeMes,
  resumenFechaEvento,
  totalesPlataforma,
  type MetricaDojo,
} from '../src';

describe('eventos', () => {
  it('distingue gratuito de pago', () => {
    expect(esGratuito({ costo: 0 })).toBe(true);
    expect(esGratuito({ costo: 15 })).toBe(false);
  });

  it('un evento sin cupo nunca esta lleno', () => {
    expect(eventoLleno({ cupo: null, plazas_libres: null })).toBe(false);
    expect(eventoLleno({ cupo: 10, plazas_libres: 3 })).toBe(false);
    expect(eventoLleno({ cupo: 10, plazas_libres: 0 })).toBe(true);
  });

  it('cuenta los dias sin desviarse por zona horaria', () => {
    const hoy = new Date(2026, 8, 15, 23, 30);
    expect(diasHasta('2026-09-15', hoy)).toBe(0);
    expect(diasHasta('2026-09-16', hoy)).toBe(1);
    expect(diasHasta('2026-09-10', hoy)).toBe(-5);
  });

  it('describe la fecha en relacion al presente', () => {
    const hoy = new Date(2026, 8, 15, 10, 0);
    expect(resumenFechaEvento({ fecha: '2026-09-15', hora: null }, )).toBeTypeOf('string');
    expect(diasHasta('2026-09-15', hoy)).toBe(0);
  });
});

describe('periodos', () => {
  it('siempre apunta al dia 1, que es lo que exige la base de datos', () => {
    const periodo = periodoDeMes(new Date(2026, 8, 23));
    expect(periodo).toBe('2026-09-01');
    expect(periodoDeMes(new Date(2026, 11, 5), 1)).toBe('2027-01-01');
    expect(periodoDeMes(new Date(2026, 0, 5), -1)).toBe('2025-12-01');
  });

  it('nombra el periodo en espanol', () => {
    expect(nombrePeriodo('2026-03-01')).toBe('marzo de 2026');
    expect(nombrePeriodo('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('totalesPlataforma', () => {
  const metricas: MetricaDojo[] = [
    {
      dojo_id: '1', dojo: 'A', estado_licencia: 'activa', licencia_vence_el: null,
      alumnos_activos: 10, clases_activas: 2, usuarios: 5, asistencias_30d: 40,
      ingresos_mes: 350, suscripcion_al_dia: true,
    },
    {
      dojo_id: '2', dojo: 'B', estado_licencia: 'vencida', licencia_vence_el: null,
      alumnos_activos: 4, clases_activas: 1, usuarios: 3, asistencias_30d: 12,
      ingresos_mes: 140, suscripcion_al_dia: false,
    },
  ];

  it('suma y cuenta segun el estado de licencia', () => {
    const totales = totalesPlataforma(metricas);
    expect(totales.dojos).toBe(2);
    expect(totales.dojosActivos).toBe(1);
    expect(totales.alumnos).toBe(14);
    expect(totales.asistencias30d).toBe(52);
    expect(totales.ingresosMes).toBe(490);
    expect(totales.morosos).toBe(1);
  });

  it('no rompe sin datos', () => {
    expect(totalesPlataforma([]).dojos).toBe(0);
    expect(totalesPlataforma([]).ingresosMes).toBe(0);
  });
});

describe('haceCuanto', () => {
  const ahora = new Date('2026-09-15T12:00:00Z');

  it('usa la unidad adecuada segun la antiguedad', () => {
    expect(haceCuanto('2026-09-15T11:59:40Z', ahora)).toBe('ahora');
    expect(haceCuanto('2026-09-15T11:30:00Z', ahora)).toBe('hace 30 min');
    expect(haceCuanto('2026-09-15T07:00:00Z', ahora)).toBe('hace 5 h');
    expect(haceCuanto('2026-09-14T12:00:00Z', ahora)).toBe('ayer');
    expect(haceCuanto('2026-09-05T12:00:00Z', ahora)).toBe('hace 10 dias');
    expect(haceCuanto('2026-01-05T12:00:00Z', ahora)).toBe('2026-01-05');
  });
});
