#include "main.h"
int main() {
    int opcion;
    do {
        printf("\n--- Menu ---\n");
        printf("1) Cargar archivo .txt\n");
        printf("2) Cargar manualmente sesion\n");
        printf("3) Aniadir recompensa\n");
        printf("4) Ver grafica total\n");
        printf("5) Ver saldo de ganancia\n");
        printf("6) Crear .dat\n");
        printf("7) Leer .dat\n");
        printf("8) eliminar ult\n");
        printf("9) vaciar .dat\n");
        printf("0) Salir\n");
        printf("Opcion: ");
        scanf("%d", &opcion);
        switch (opcion) {
        case 1:
            printf("\nOpcion no disponible.\n");
            char nombre[50];
            printf("Ingrese nombre del archivo .txt: ");
            scanf("%s", nombre);
            cargarDesdeTxt(nombre);
            break;
        case 2:
            cargarManual();
            break;        case 3:
            aniadirRecompensa();
            break;
        case 4:
            verGrafica();
            break;
        case 5:
            Sesion ult;
            leerUltimaSesion(&ult);
            printf("\nGanancia: %g\n", ult.ganancia);
            break;
        case 6:
            char res;
            printf("\n¿Estas seguro que desea recrear el archivo saldo.dat? 'S' para confirmar: \n");
            scanf(" %c", &res);
            if(res == 'S' || res == 's')
                crearBin();
            break;
        case 7:
            leerBin();
            break;
        case 8:
            borrarUltima();
//            printf("\nOpcion no disponible.\n");
            break;
        case 9:
            printf("\n¿Estas seguro que desea recrear el archivo saldo.dat? 'S' para confirmar: \n");
            scanf("%c", &res);
            if(res == 'S' || res == 's'){
                FILE *bin = fopen(ARCHIVO_DAT, "wb");
                fclose(bin);
            }
            break;
        default:
            break;
        }
    } while (opcion != 0);
    return 0;
}
void borrarUltima() {
    FILE *f = fopen(ARCHIVO_DAT, "rb+");
    if (!f) {
        perror("Error al abrir el archivo");
        return;
    }
    // Ir al final para calcular el tamaño total
    fseek(f, 0, SEEK_END);
    long tam = ftell(f);  // tamaño total del archivo
    size_t tamRegistro = sizeof(Sesion);
    // Nuevo tamaño: uno menos
    long nuevoTam = tam - tamRegistro;
    int fd = _fileno(f);
    _chsize(fd, nuevoTam);
    fclose(f);
    printf("Último registro eliminado correctamente.\n");
}
void leerBin() {
    Sesion s;
    FILE*f = fopen(ARCHIVO_DAT, "rb");
    if (!f) {
        perror("Error al abrir el archivo");
        return;
    }
    printf("\nArchivo bin:\n");
    while (fread(&s, sizeof(s), 1, f))
        printf("%g\t%g\t%s\t%d\t%d\t%d\n", s.banca, s.ganancia, s.fecha, s.cantManos, s.minutos, s.recompensa);
    fclose(f);
}
void crearBin() {
    char linea[128];
    FILE *txt = fopen("banca.txt", "r");
    Sesion s;
    float saldoCuenta, saldoJuego;
    int manos, minutos, dia, mes, anio = 2025;
    if (!txt) {
        printf("No se pudo abrir banca.txt\n");
        return;
    }
    FILE *bin = fopen(ARCHIVO_DAT, "wb"); // sobreescribir saldo.dat
    if (!bin) {
        printf("No se pudo crear %s\n", ARCHIVO_DAT);
        fclose(txt);
        return;
    }
    while (fgets(linea, sizeof(linea), txt)) {
        // Parseo de la línea, quitamos el símbolo '$'
        if (sscanf(linea, "$%g,$%g,%d/%d,%d,%d",
                   &saldoCuenta, &saldoJuego, &dia, &mes, &manos, &minutos) == 6) {
            saldoCuenta = ((int)(saldoCuenta * 100 + 0.5)) / 100.0;
            saldoJuego  = ((int)(saldoJuego  * 100 + 0.5)) / 100.0;
            snprintf(s.fecha, sizeof(s.fecha), "%02d/%02d/%04d", dia, mes, anio);
            s.cantManos = manos;
            s.minutos = minutos;
            s.banca = saldoCuenta;
            s.ganancia = saldoJuego;
            s.recompensa = 0; // por defecto no es recompensa
            fwrite(&s, sizeof(Sesion), 1, bin);
        } else
            printf("Linea con formato invalido: %s\n", linea);
    }
    fclose(txt);
    fclose(bin);
    printf("Archivo %s creado correctamente desde banca.txt\n", ARCHIVO_DAT);
}

void guardarSesion(Sesion sesion, int cargado) {
    FILE *f = fopen(ARCHIVO_DAT, "r+b");
    if (!f) {
        perror("Error al abrir saldo.dat");
        return;
    }
    if (cargado == EXISTENTE)
        fseek(f, -(long)sizeof(Sesion), SEEK_END);
    else
        fseek(f, 0, SEEK_END);
    fwrite(&sesion, sizeof(Sesion), 1, f);
    fclose(f);
}

int leerUltimaSesion(Sesion *s) {
    FILE *f = fopen(ARCHIVO_DAT, "rb");
    if (!f) return 0;
    fseek(f, -(long)sizeof(Sesion), SEEK_END);
    fread(s, sizeof(Sesion), 1, f);
    fclose(f);
    return 1;
}

void cargarDesdeTxt(const char *nombre) {
//    Sesion ultima, nueva;
//    float saldoTxt;
//    FILE *txt = fopen(nombre, "r");
//    if (!txt) {
//        printf("No se pudo abrir %s\n", nombre);
//        return;
//    }
//    fscanf(txt, "%f\n", &saldoTxt);
//    fscanf(txt, "%10[^\n]\n", nueva.fecha);
//    fscanf(txt, "%d\n", &nueva.cantManos);
//    fscanf(txt, "%d\n", &nueva.minutos);
//    fclose(txt);
//    if (leerUltimaSesion(&ultima)) {
//        if (strcmp(ultima.fecha, nueva.fecha) == 0) {
//            printf("La fecha %s ya existe. No se agrega.\n", nueva.fecha);
//            return;
//        }
//        nueva.ganancia = ultima.ganancia + saldoTxt;
//        nueva.banca = ultima.banca + saldoTxt;
//    } else {
//        nueva.saldoJuego = saldoTxt;
//        nueva.saldoTotal = saldoTxt;
//    }
//    nueva.recompensa = 0;
//    guardarSesion(nueva);
//    printf("Sesion cargada desde %s correctamente.\n", nombre);
}

void cargarManual() {
    Sesion ultima, nueva;
    float saldoIngresado;
    int cargado = NUEVA, dia, mes, anio = 2026;
    char fecha[5];
    printf("Ingrese saldo de banca de la sesion: ");
    scanf("%f", &saldoIngresado);
    printf("Ingrese fecha (D/MM): ");
    scanf("%s", nueva.fecha);
    printf("Ingrese cantidad de manos: ");
    scanf("%d", &nueva.cantManos);
    printf("Ingrese cantidad de minutos jugados: ");
    scanf("%d", &nueva.minutos);
    leerUltimaSesion(&ultima);
    if (sscanf(nueva.fecha, "%d/%d", &dia, &mes) != 2) {
        printf("Fecha invalida, no se cargo la sesion.\n");
        return;
    }
    snprintf(nueva.fecha, sizeof(nueva.fecha), "%02d/%02d/%04d", dia, mes, anio);
    if (strcmp(ultima.fecha, nueva.fecha) == 0) {
        printf("La fecha %s ya existe. No se agrega.\n", nueva.fecha);
        nueva.cantManos += ultima.cantManos;
        nueva.minutos += ultima.minutos;
        cargado = EXISTENTE;
    }
    nueva.banca = saldoIngresado;
    nueva.ganancia = saldoIngresado - ultima.banca + ultima.ganancia;
    nueva.recompensa = 0;
    guardarSesion(nueva, cargado);
    printf("Sesion cargada manualmente.\n");
}
void aniadirRecompensa() {
    Sesion ultima, nueva;
    float monto;
    int tipo;
    printf("Ingrese tipo de movimiento:\n");
    printf("1) Recompensa (suma dinero)\n");
    printf("2) Retiro (resta dinero)\n");
    printf("Opcion: ");
    scanf("%d", &tipo);
    if (!(tipo == RECOM || tipo == RETIRO)) {
        printf("Opcion invalida.\n");
        return;
    }
    tipo = (tipo == RETIRO) ? -1 : RECOM;
    printf("Ingrese monto (%d): ",tipo);
    scanf("%f", &monto);
    if (leerUltimaSesion(&ultima)) {
        nueva = ultima; // copiamos la ultima sesion
        nueva.banca = ultima.banca + (monto * tipo);
    } else {
        // si no hay sesiones todavía
        strcpy(nueva.fecha, "00/00/0000");
        nueva.ganancia = 0;
        nueva.banca = monto * tipo;
    }
    nueva.minutos = 0;
    nueva.cantManos = 0;
    nueva.recompensa = ((tipo == RECOM) ? RECOM : RETIRO);
    guardarSesion(nueva, NUEVA);
    if (tipo == RECOM)
        printf("Recompensa agregada.\n");
    else
        printf("Retiro registrado.\n");
}

void verGrafica() {
    Sesion sesion;
    FILE *graf = fopen("datos_grafica.dat", "w");
    if (!graf) {
        perror("No se pudo crear archivo temporal");
        return;
    }
    FILE *arch = fopen(ARCHIVO_DAT, "rb");
    if (!arch) {
        perror("No se pudo abrir saldo.dat");
        return;
    }
    // Guardar fechas y saldos
    while (fread(&sesion, sizeof(Sesion), 1, arch))
        fprintf(graf, "%s %g\n", sesion.fecha, sesion.ganancia);
    fclose(arch);
    fclose(graf);
    FILE *gp = fopen("grafica.gnuplot", "w");
    if (!gp) {
        perror("No se pudo crear script de gnuplot");
        return;
    }
    fprintf(gp,
    "set title 'Evolución del saldo'\n"
    "set xdata time\n"
    "set timefmt '%%d/%%m/%%Y'\n"
    "set format x '%%m/%%y'\n"
    "set xlabel 'Fecha'\n"
    "set ylabel 'Saldo'\n"
    "set grid\n"
    "set xtics rotate by -45\n"
    "plot 'datos_grafica.dat' using 1:2 with lines title 'Saldo juego'\n"
    "pause -1\n");
    fclose(gp);
    // Ejecutar gnuplot
    system("\"D:\\gnuplot\\bin\\gnuplot.exe\" grafica.gnuplot");
}

