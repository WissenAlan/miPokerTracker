set title 'Evolución del saldo'
set xdata time
set xlabel 'Fecha'
set ylabel 'Saldo'
set grid
set xtics rotate by -45
plot 'datos_grafica.dat' using 1:2 with lines title 'Saldo juego'
pause -1 'Presione Enter para salir'
