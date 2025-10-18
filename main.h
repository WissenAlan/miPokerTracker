#ifndef MAIN_H_INCLUDED
#define MAIN_H_INCLUDED
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <io.h>
#define ARCHIVO_DAT "saldo.dat"
#define SESION 0
#define RECOM 1
#define RETIRO 2
#define NUEVA 1
#define EXISTENTE 2

typedef struct {
    char fecha[11];    // formato "DD/MM/AAAA"
    int cantManos, minutos;
    float banca, ganancia;       // saldo acumulado después de la sesión
    int recompensa;    // 0 = sesión normal, 1 = recompensa, 2=retiro
} Sesion;

void guardarSesion(Sesion s, int cargado);
int leerUltimaSesion(Sesion *s);
void cargarDesdeTxt(const char *nombre);
void cargarManual();
void aniadirRecompensa();
void verGrafica();
void crearBin();
void leerBin();
void borrarUltima();


#endif // MAIN_H_INCLUDED
