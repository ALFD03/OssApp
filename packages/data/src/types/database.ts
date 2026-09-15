export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alumnos: {
        Row: {
          activo: boolean
          actualizado_el: string
          apellido: string
          cinturon_actual_id: string | null
          cinturon_desde: string | null
          creado_el: string
          dojo_id: string
          fecha_ingreso: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          notas: string | null
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_el?: string
          apellido: string
          cinturon_actual_id?: string | null
          cinturon_desde?: string | null
          creado_el?: string
          dojo_id: string
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          notas?: string | null
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_el?: string
          apellido?: string
          cinturon_actual_id?: string | null
          cinturon_desde?: string | null
          creado_el?: string
          dojo_id?: string
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_cinturon_actual_id_fkey"
            columns: ["cinturon_actual_id"]
            isOneToOne: false
            referencedRelation: "cinturones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumnos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumnos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencias: {
        Row: {
          alumno_id: string
          clase_id: string
          client_id: string
          creado_el: string
          dojo_id: string
          fecha: string
          hora: string
          id: string
          origen: Database["public"]["Enums"]["origen_asistencia"]
          registrado_por: string | null
        }
        Insert: {
          alumno_id: string
          clase_id: string
          client_id?: string
          creado_el?: string
          dojo_id: string
          fecha?: string
          hora?: string
          id?: string
          origen: Database["public"]["Enums"]["origen_asistencia"]
          registrado_por?: string | null
        }
        Update: {
          alumno_id?: string
          clase_id?: string
          client_id?: string
          creado_el?: string
          dojo_id?: string
          fecha?: string
          hora?: string
          id?: string
          origen?: Database["public"]["Enums"]["origen_asistencia"]
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "asistencias_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          alumno_id: string
          codigo: string
          dojo_id: string
          emitido_el: string
          examen_id: string
          id: string
        }
        Insert: {
          alumno_id: string
          codigo?: string
          dojo_id: string
          emitido_el?: string
          examen_id: string
          id?: string
        }
        Update: {
          alumno_id?: string
          codigo?: string
          dojo_id?: string
          emitido_el?: string
          examen_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "certificados_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: true
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      cinturones: {
        Row: {
          color: string
          creado_el: string
          dojo_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          color?: string
          creado_el?: string
          dojo_id: string
          id?: string
          nombre: string
          orden: number
        }
        Update: {
          color?: string
          creado_el?: string
          dojo_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "cinturones_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      clase_alumno: {
        Row: {
          alumno_id: string
          clase_id: string
          dojo_id: string
          fecha_inscripcion: string
        }
        Insert: {
          alumno_id: string
          clase_id: string
          dojo_id: string
          fecha_inscripcion?: string
        }
        Update: {
          alumno_id?: string
          clase_id?: string
          dojo_id?: string
          fecha_inscripcion?: string
        }
        Relationships: [
          {
            foreignKeyName: "clase_alumno_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clase_alumno_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "clase_alumno_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clase_alumno_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      clases: {
        Row: {
          activa: boolean
          actualizado_el: string
          capacidad: number | null
          creado_el: string
          dojo_id: string
          id: string
          nivel: Database["public"]["Enums"]["nivel_clase"]
          nombre: string
          sensei_id: string | null
        }
        Insert: {
          activa?: boolean
          actualizado_el?: string
          capacidad?: number | null
          creado_el?: string
          dojo_id: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_clase"]
          nombre: string
          sensei_id?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_el?: string
          capacidad?: number | null
          creado_el?: string
          dojo_id?: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_clase"]
          nombre?: string
          sensei_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clases_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clases_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_qr: {
        Row: {
          activo: boolean
          clase_id: string | null
          creado_el: string
          dojo_id: string
          etiqueta: string
          id: string
          token: string
        }
        Insert: {
          activo?: boolean
          clase_id?: string | null
          creado_el?: string
          dojo_id: string
          etiqueta?: string
          id?: string
          token?: string
        }
        Update: {
          activo?: boolean
          clase_id?: string | null
          creado_el?: string
          dojo_id?: string
          etiqueta?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "codigos_qr_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codigos_qr_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivos: {
        Row: {
          creado_el: string
          id: string
          plataforma: string
          push_token: string
          usado_el: string
          usuario_id: string
        }
        Insert: {
          creado_el?: string
          id?: string
          plataforma: string
          push_token: string
          usado_el?: string
          usuario_id: string
        }
        Update: {
          creado_el?: string
          id?: string
          plataforma?: string
          push_token?: string
          usado_el?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      dojos: {
        Row: {
          activo: boolean
          actualizado_el: string
          creado_el: string
          estado_licencia: Database["public"]["Enums"]["estado_licencia"]
          id: string
          licencia_vence_el: string | null
          nombre: string
          slug: string
        }
        Insert: {
          activo?: boolean
          actualizado_el?: string
          creado_el?: string
          estado_licencia?: Database["public"]["Enums"]["estado_licencia"]
          id?: string
          licencia_vence_el?: string | null
          nombre: string
          slug: string
        }
        Update: {
          activo?: boolean
          actualizado_el?: string
          creado_el?: string
          estado_licencia?: Database["public"]["Enums"]["estado_licencia"]
          id?: string
          licencia_vence_el?: string | null
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          activo: boolean
          actualizado_el: string
          costo: number
          creado_el: string
          creado_por: string | null
          cupo: number | null
          descripcion: string | null
          dojo_id: string
          fecha: string
          hora: string | null
          id: string
          lugar: string | null
          moneda: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Insert: {
          activo?: boolean
          actualizado_el?: string
          costo?: number
          creado_el?: string
          creado_por?: string | null
          cupo?: number | null
          descripcion?: string | null
          dojo_id: string
          fecha: string
          hora?: string | null
          id?: string
          lugar?: string | null
          moneda?: string
          nombre: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
        }
        Update: {
          activo?: boolean
          actualizado_el?: string
          costo?: number
          creado_el?: string
          creado_por?: string | null
          cupo?: number | null
          descripcion?: string | null
          dojo_id?: string
          fecha?: string
          hora?: string | null
          id?: string
          lugar?: string | null
          moneda?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
        }
        Relationships: [
          {
            foreignKeyName: "eventos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      examenes: {
        Row: {
          alumno_id: string
          cinturon_destino_id: string
          creado_el: string
          dojo_id: string
          evaluador_id: string | null
          fecha: string
          id: string
          observaciones: string | null
          resultado: Database["public"]["Enums"]["resultado_examen"]
        }
        Insert: {
          alumno_id: string
          cinturon_destino_id: string
          creado_el?: string
          dojo_id: string
          evaluador_id?: string | null
          fecha?: string
          id?: string
          observaciones?: string | null
          resultado: Database["public"]["Enums"]["resultado_examen"]
        }
        Update: {
          alumno_id?: string
          cinturon_destino_id?: string
          creado_el?: string
          dojo_id?: string
          evaluador_id?: string | null
          fecha?: string
          id?: string
          observaciones?: string | null
          resultado?: Database["public"]["Enums"]["resultado_examen"]
        }
        Relationships: [
          {
            foreignKeyName: "examenes_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examenes_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "examenes_cinturon_destino_id_fkey"
            columns: ["cinturon_destino_id"]
            isOneToOne: false
            referencedRelation: "cinturones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examenes_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examenes_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          clase_id: string
          creado_el: string
          dia_semana: number
          dojo_id: string
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          clase_id: string
          creado_el?: string
          dia_semana: number
          dojo_id: string
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          clase_id?: string
          creado_el?: string
          dia_semana?: number
          dojo_id?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones: {
        Row: {
          actualizado_el: string
          alumno_id: string
          comprobante_url: string | null
          creado_el: string
          dojo_id: string
          estado: Database["public"]["Enums"]["estado_verificacion"]
          evento_id: string
          id: string
          inscrito_por: string | null
          motivo_rechazo: string | null
          verificado_el: string | null
          verificado_por: string | null
        }
        Insert: {
          actualizado_el?: string
          alumno_id: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          evento_id: string
          id?: string
          inscrito_por?: string | null
          motivo_rechazo?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Update: {
          actualizado_el?: string
          alumno_id?: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id?: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          evento_id?: string
          id?: string
          inscrito_por?: string | null
          motivo_rechazo?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "inscripciones_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "vista_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_inscrito_por_fkey"
            columns: ["inscrito_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          creado_el: string
          cuerpo: string
          datos: Json
          dojo_id: string | null
          id: string
          leida: boolean
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
          usuario_id: string
        }
        Insert: {
          creado_el?: string
          cuerpo: string
          datos?: Json
          dojo_id?: string | null
          id?: string
          leida?: boolean
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
          usuario_id: string
        }
        Update: {
          creado_el?: string
          cuerpo?: string
          datos?: Json
          dojo_id?: string | null
          id?: string
          leida?: boolean
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          actualizado_el: string
          alumno_id: string
          comprobante_url: string | null
          creado_el: string
          dojo_id: string
          estado: Database["public"]["Enums"]["estado_verificacion"]
          id: string
          moneda: string
          monto: number
          motivo_rechazo: string | null
          periodo: string
          plan_id: string | null
          referencia: string | null
          subido_por: string | null
          verificado_el: string | null
          verificado_por: string | null
        }
        Insert: {
          actualizado_el?: string
          alumno_id: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          moneda?: string
          monto: number
          motivo_rechazo?: string | null
          periodo: string
          plan_id?: string | null
          referencia?: string | null
          subido_por?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Update: {
          actualizado_el?: string
          alumno_id?: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id?: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          moneda?: string
          monto?: number
          motivo_rechazo?: string | null
          periodo?: string
          plan_id?: string | null
          referencia?: string | null
          subido_por?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "pagos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_pago: {
        Row: {
          activo: boolean
          actualizado_el: string
          creado_el: string
          dojo_id: string
          id: string
          moneda: string
          monto: number
          nombre: string
          periodicidad: Database["public"]["Enums"]["periodicidad_plan"]
        }
        Insert: {
          activo?: boolean
          actualizado_el?: string
          creado_el?: string
          dojo_id: string
          id?: string
          moneda?: string
          monto: number
          nombre: string
          periodicidad?: Database["public"]["Enums"]["periodicidad_plan"]
        }
        Update: {
          activo?: boolean
          actualizado_el?: string
          creado_el?: string
          dojo_id?: string
          id?: string
          moneda?: string
          monto?: number
          nombre?: string
          periodicidad?: Database["public"]["Enums"]["periodicidad_plan"]
        }
        Relationships: [
          {
            foreignKeyName: "planes_pago_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      representante_alumno: {
        Row: {
          alumno_id: string
          creado_el: string
          dojo_id: string
          parentesco: string | null
          representante_id: string
        }
        Insert: {
          alumno_id: string
          creado_el?: string
          dojo_id: string
          parentesco?: string | null
          representante_id: string
        }
        Update: {
          alumno_id?: string
          creado_el?: string
          dojo_id?: string
          parentesco?: string | null
          representante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "representante_alumno_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representante_alumno_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "vista_solvencia"
            referencedColumns: ["alumno_id"]
          },
          {
            foreignKeyName: "representante_alumno_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representante_alumno_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitos_grado: {
        Row: {
          actualizado_el: string
          asistencias_minimas: number
          cinturon_id: string
          creado_el: string
          dojo_id: string
          id: string
          meses_minimos_en_grado_anterior: number
          requiere_solvencia: boolean
        }
        Insert: {
          actualizado_el?: string
          asistencias_minimas?: number
          cinturon_id: string
          creado_el?: string
          dojo_id: string
          id?: string
          meses_minimos_en_grado_anterior?: number
          requiere_solvencia?: boolean
        }
        Update: {
          actualizado_el?: string
          asistencias_minimas?: number
          cinturon_id?: string
          creado_el?: string
          dojo_id?: string
          id?: string
          meses_minimos_en_grado_anterior?: number
          requiere_solvencia?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "requisitos_grado_cinturon_id_fkey"
            columns: ["cinturon_id"]
            isOneToOne: true
            referencedRelation: "cinturones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_grado_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripciones: {
        Row: {
          actualizado_el: string
          comprobante_url: string | null
          creado_el: string
          dojo_id: string
          estado: Database["public"]["Enums"]["estado_verificacion"]
          id: string
          moneda: string
          monto: number
          motivo_rechazo: string | null
          periodo: string
          referencia: string | null
          subido_por: string | null
          verificado_el: string | null
          verificado_por: string | null
        }
        Insert: {
          actualizado_el?: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          moneda?: string
          monto: number
          motivo_rechazo?: string | null
          periodo: string
          referencia?: string | null
          subido_por?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Update: {
          actualizado_el?: string
          comprobante_url?: string | null
          creado_el?: string
          dojo_id?: string
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          moneda?: string
          monto?: number
          motivo_rechazo?: string | null
          periodo?: string
          referencia?: string | null
          subido_por?: string | null
          verificado_el?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_soporte: {
        Row: {
          abierto_por: string | null
          actualizado_el: string
          asunto: string
          cerrado_el: string | null
          creado_el: string
          descripcion: string
          dojo_id: string
          estado: Database["public"]["Enums"]["estado_ticket"]
          id: string
          respuesta: string | null
        }
        Insert: {
          abierto_por?: string | null
          actualizado_el?: string
          asunto: string
          cerrado_el?: string | null
          creado_el?: string
          descripcion: string
          dojo_id: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          id?: string
          respuesta?: string | null
        }
        Update: {
          abierto_por?: string | null
          actualizado_el?: string
          asunto?: string
          cerrado_el?: string | null
          creado_el?: string
          descripcion?: string
          dojo_id?: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          id?: string
          respuesta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_soporte_abierto_por_fkey"
            columns: ["abierto_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          actualizado_el: string
          apellido: string
          creado_el: string
          dojo_id: string | null
          email: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_el?: string
          apellido: string
          creado_el?: string
          dojo_id?: string | null
          email: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_el?: string
          apellido?: string
          creado_el?: string
          dojo_id?: string | null
          email?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_eventos: {
        Row: {
          activo: boolean | null
          actualizado_el: string | null
          costo: number | null
          creado_el: string | null
          creado_por: string | null
          cupo: number | null
          descripcion: string | null
          dojo_id: string | null
          fecha: string | null
          hora: string | null
          id: string | null
          inscritos: number | null
          lugar: string | null
          moneda: string | null
          nombre: string | null
          plazas_libres: number | null
          tipo: Database["public"]["Enums"]["tipo_evento"] | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_el?: string | null
          costo?: number | null
          creado_el?: string | null
          creado_por?: string | null
          cupo?: number | null
          descripcion?: string | null
          dojo_id?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string | null
          inscritos?: never
          lugar?: string | null
          moneda?: string | null
          nombre?: string | null
          plazas_libres?: never
          tipo?: Database["public"]["Enums"]["tipo_evento"] | null
        }
        Update: {
          activo?: boolean | null
          actualizado_el?: string | null
          costo?: number | null
          creado_el?: string | null
          creado_por?: string | null
          cupo?: number | null
          descripcion?: string | null
          dojo_id?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string | null
          inscritos?: never
          lugar?: string | null
          moneda?: string | null
          nombre?: string | null
          plazas_libres?: never
          tipo?: Database["public"]["Enums"]["tipo_evento"] | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_solvencia: {
        Row: {
          alumno_id: string | null
          apellido: string | null
          cubierto_hasta: string | null
          dias_de_atraso: number | null
          dojo_id: string | null
          nombre: string | null
          solvente: boolean | null
          ultimo_periodo_pagado: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      metricas_plataforma: {
        Args: never
        Returns: {
          alumnos_activos: number
          asistencias_30d: number
          clases_activas: number
          dojo: string
          dojo_id: string
          estado_licencia: Database["public"]["Enums"]["estado_licencia"]
          ingresos_mes: number
          licencia_vence_el: string
          suscripcion_al_dia: boolean
          usuarios: number
        }[]
      }
      progreso_de_grado: {
        Args: { p_alumno_id: string }
        Returns: {
          asistencias: number
          asistencias_minimas: number
          cinturon_actual: string
          elegible: boolean
          meses_en_grado: number
          meses_minimos: number
          requiere_solvencia: boolean
          siguiente_cinturon: string
          siguiente_id: string
          solvente: boolean
        }[]
      }
      registrar_asistencia_qr: {
        Args: { p_alumno_id: string; p_client_id?: string; p_token: string }
        Returns: {
          alumno_id: string
          clase_id: string
          client_id: string
          creado_el: string
          dojo_id: string
          fecha: string
          hora: string
          id: string
          origen: Database["public"]["Enums"]["origen_asistencia"]
          registrado_por: string | null
        }
        SetofOptions: {
          from: "*"
          to: "asistencias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      estado_licencia: "activa" | "prueba" | "suspendida" | "vencida"
      estado_ticket: "abierto" | "en_proceso" | "cerrado"
      estado_verificacion: "pendiente" | "aprobado" | "rechazado"
      nivel_clase: "infantil" | "juvenil" | "adultos" | "mixto" | "competicion"
      origen_asistencia: "qr" | "manual"
      periodicidad_plan: "mensual" | "trimestral" | "anual"
      resultado_examen: "aprobado" | "reprobado"
      rol_usuario:
        | "superadmin"
        | "maestro"
        | "sensei"
        | "representante"
        | "alumno"
      tipo_evento: "torneo" | "seminario" | "examen_especial" | "otro"
      tipo_notificacion:
        | "pago_aprobado"
        | "pago_rechazado"
        | "examen_registrado"
        | "evento_nuevo"
        | "inscripcion_resuelta"
        | "licencia"
        | "soporte"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_licencia: ["activa", "prueba", "suspendida", "vencida"],
      estado_ticket: ["abierto", "en_proceso", "cerrado"],
      estado_verificacion: ["pendiente", "aprobado", "rechazado"],
      nivel_clase: ["infantil", "juvenil", "adultos", "mixto", "competicion"],
      origen_asistencia: ["qr", "manual"],
      periodicidad_plan: ["mensual", "trimestral", "anual"],
      resultado_examen: ["aprobado", "reprobado"],
      rol_usuario: [
        "superadmin",
        "maestro",
        "sensei",
        "representante",
        "alumno",
      ],
      tipo_evento: ["torneo", "seminario", "examen_especial", "otro"],
      tipo_notificacion: [
        "pago_aprobado",
        "pago_rechazado",
        "examen_registrado",
        "evento_nuevo",
        "inscripcion_resuelta",
        "licencia",
        "soporte",
      ],
    },
  },
} as const

