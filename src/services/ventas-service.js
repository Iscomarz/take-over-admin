import supabase from '$lib/supabase';

function parseMoney(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    // Quita todo lo que no sea dígito, signo negativo o punto decimal
    const cleaned = String(value).replace(/[^0-9.-]+/g, '');
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? 0 : n;
}

//Ventas del dia
export async function obtenerVentasDelDia() {
    // Obtener componentes de fecha en zona horaria de México
    const ahora = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(ahora);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    // Medianoche en México (00:00 CDMX) = 06:00 UTC del mismo día
    const inicioDiaMexico = new Date(`${year}-${month}-${day}T06:00:00.000Z`);
    const finDiaMexico = new Date(inicioDiaMexico.getTime() + 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
        .from('mVenta')
        .select('*, mPago(*)')
        .gte('fechaVenta', inicioDiaMexico.toISOString())
        .lt('fechaVenta', finDiaMexico.toISOString());
    if (error) {
        console.error('Error al obtener ventas del día:', error);
        return [];
    }

    //console.log('Ventas del día:', data);

    const totalVentas = data.length;
    const montoTotal = data.reduce((total, venta) => {
        const cantidad = parseMoney(venta.mPago?.cantidad);

        return total + cantidad;
    }, 0);

    //console.log('Total ventas:', totalVentas);
    //console.log('Monto total:', montoTotal);

    return { totalVentas, montoTotal };
}

// Ventas totales por evento activo
export async function obtenerVentasPorEventoActivo() {
    //Obtener evento activo
    const eventoActivo = await obtenerEventoActivo();
    if(!eventoActivo.idevento) {
        console.error('No hay evento activo');
        return [];
    }

    const { data, error } = await supabase
        .rpc('ventas_por_fase', { evento_id: eventoActivo.idevento })

    if (error) {
        console.error(error)
        return [];
    } 

    const fases = Array.isArray(data) ? data : [];
    const result = fases.reduce(
        (acc, f) => {
            const cantidad = Number(f.cantidad) || 0;
            const monto = Number(f.monto) || 0;
            acc.totalTickets += cantidad;
            acc.totalMonto += monto;
            acc.fases.push({ nombre_fase: f.nombre_fase, cantidad, monto });
            return acc;
        },
        { totalTickets: 0, totalMonto: 0, fases: [] }
    );

    return result;
}

// Evento Activo
export async function obtenerEventoActivo() {
    const { data, error } = await supabase
        .from('mEvento')
        .select('idevento')
        .eq('activo', true)
        .single();
    if (error) {
        console.error('Error al obtener evento activo:', error);
        return null;
    }
    return data;
}

// Ultimas 10 transacciones
export async function obtenerUltimasTransacciones() {
    const { data, error } = await supabase
        .from('mVenta')
        .select('idventa, fechaVenta, nombre, correo, cantidadTickets, mPago(cantidad, cFormaPago(nombre)), mEvento(nombreEvento)')
        .order('fechaVenta', { ascending: false })
        .limit(10);
    if (error) {
        console.error('Error al obtener últimas transacciones:', error);
        return [];
    }
    return data;
}

