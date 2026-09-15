import { describe, expect, it } from 'vitest';
import {
  edadDe,
  formatearFranja,
  formatearHora,
  nombreDia,
  resumirHorarios,
  type Horario,
} from '../src';

function horario(dia: number, inicio: string, fin: string): Horario {
  return {
    id: `${dia}-${inicio}`,
    dojo_id: 'd',
    clase_id: 'c',
    dia_semana: dia,
    hora_inicio: inicio,
    hora_fin: fin,
  };
}

describe('horas', () => {
  it('recorta los segundos que devuelve Postgres', () => {
    expect(formatearHora('17:00:00')).toBe('17:00');
    expect(formatearFranja(horario(1, '17:00:00', '18:30:00'))).toBe('17:00 - 18:30');
  });

  it('nombra los dias como EXTRACT(DOW): 0 es domingo', () => {
    expect(nombreDia(0)).toBe('Domingo');
    expect(nombreDia(6)).toBe('Sabado');
    expect(nombreDia(9)).toBe('?');
  });
});

describe('resumirHorarios', () => {
  it('agrupa los dias que comparten franja', () => {
    const resumen = resumirHorarios([
      horario(1, '17:00:00', '18:00:00'),
      horario(3, '17:00:00', '18:00:00'),
      horario(5, '17:00:00', '18:00:00'),
    ]);
    expect(resumen).toBe('Lun, Mie, Vie 17:00 - 18:00');
  });

  it('separa las franjas distintas y ordena los dias', () => {
    const resumen = resumirHorarios([
      horario(4, '19:00:00', '20:30:00'),
      horario(1, '17:00:00', '18:00:00'),
      horario(1, '19:00:00', '20:30:00'),
    ]);
    expect(resumen).toBe('Lun 17:00 - 18:00 · Lun, Jue 19:00 - 20:30');
  });

  it('lo dice cuando la clase no tiene horario', () => {
    expect(resumirHorarios([])).toBe('Sin horario asignado');
  });
});

describe('edadDe', () => {
  const hoy = new Date('2026-09-15T12:00:00Z');

  it('resta un ano si aun no ha llegado el cumpleanos', () => {
    expect(edadDe('2015-09-16', hoy)).toBe(10);
    expect(edadDe('2015-09-15', hoy)).toBe(11);
    expect(edadDe('2015-01-01', hoy)).toBe(11);
  });

  it('devuelve null si no hay fecha o es invalida', () => {
    expect(edadDe(null, hoy)).toBeNull();
    expect(edadDe('no-es-fecha', hoy)).toBeNull();
  });
});
