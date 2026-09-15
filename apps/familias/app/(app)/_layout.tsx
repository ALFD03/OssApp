import { APP_POR_ROL, ROLES, rutasDeApp } from '@ossapp/core';
import { useAuth } from '@ossapp/data';
import { Cargando, TabsPorRol } from '@ossapp/ui';
import React from 'react';

const ROLES_FAMILIAS = ROLES.filter((rol) => APP_POR_ROL[rol] === 'familias');
const RUTAS = rutasDeApp(ROLES_FAMILIAS);

export default function LayoutApp() {
  const { perfil } = useAuth();

  // El guard del layout raiz ya esta redirigiendo; esto solo cubre el frame intermedio.
  if (!perfil) return <Cargando />;

  return <TabsPorRol rol={perfil.rol} rutas={RUTAS} />;
}
