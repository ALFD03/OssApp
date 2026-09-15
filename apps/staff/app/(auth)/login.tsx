import { PantallaLogin } from '@ossapp/ui';
import React from 'react';

export default function Login() {
  return (
    <PantallaLogin
      app="staff"
      nombreApp="OssApp Staff"
      descripcion="Acceso para maestros, sensei y administracion de la plataforma."
    />
  );
}
